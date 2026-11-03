// リスニングパーティーの「再生の写し」: 参加者の部屋で、ホストの再生中・波形・EQ・出力・スペクトラム・ターンテーブル・
// アルバムの情報（と、ホストが見せると決めたときは聴いた記録・聴いた距離）を動かすための、見るだけのプレイヤー。
//  - 曲・位置・EQ・出力の様子はホストから届く（party.ts）。位置は届いた時刻から進めて見せる
//  - 音の大きさ・スペクトラムは、届いた音そのものから測る（ホストの音の写しなので、ホストの画面とほぼ同じ形になる）
//  - 操作（シーク・再生・EQ のつまみ）は受け付けない。参加者の端末には何も残さない

import { Eq } from "./eq";
import type { Album, Track } from "./library";
import type { Player } from "./player";
import type { HistorySource } from "./modctx";
import type { PlayEvent, PlayStat } from "./store";

/** ホストから届く「いまの再生」（形を確かめたあと） */
export interface NowState {
  id?: string;                    // アルバムの番号（a12）。セットの外のアルバム・何も流していないときはない
  album?: { t: string; a: string; y?: number; g?: string; c?: string; r?: number; tr: { t: string; no: number; d: number; f?: string }[] };
  i: number; pos: number; dur: number; on: boolean;
  eq: { on: boolean; g: number[] };
  sr?: number; nz?: "off" | "track" | "album"; ng?: number;
}

type Listener = () => void;
const locked = () => Promise.reject(new DOMException("ホストの曲です", "NotAllowedError"));

export class MirrorPlayer {
  album?: Album;
  index = 0;
  playing = false;
  readonly external = false;
  readonly canChooseSink = false;
  readonly sink = "";
  readonly volume = 1;
  readonly isMuted = false;
  readonly mode = "album";
  sampleRate?: number;
  normalize: "off" | "track" | "album" = "off";
  normGain?: number;
  eq = new Eq();
  private pos = 0;
  private dur = 0;
  private at = performance.now();
  private listeners = new Set<Listener>();
  private meters: AnalyserNode[] = [];
  private spec?: AnalyserNode;
  private meterBuf = new Float32Array(2048);
  private specBuf = new Float32Array(4096);
  private peaksBy = new Map<string, Float32Array>();
  private waiting = new Map<string, ((p?: Float32Array) => void)[]>();
  private cover?: string;

  constructor() { this.eq.readonly = true; }

  get track(): Track | undefined { return this.album?.tracks[this.index]; }
  get duration() { return this.dur; }
  get position() { return Math.min(this.dur || Infinity, this.pos + (this.playing ? (performance.now() - this.at) / 1000 : 0)); }

  on(fn: Listener): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

  /** ホストから届いた「いまの再生」を映す */
  set(s: NowState) {
    const key = s.id ?? "";
    if (!s.id) this.album = undefined;
    else if (!s.album) { if (this.album?.key !== key) this.album = undefined; }   // 曲目は替わったときだけ届く
    else if (this.album?.key !== key || this.album.tracks.length !== s.album.tr.length) {
      if (this.album?.key !== key) this.cover = undefined;
      this.album = {
        key, shelf: "", dir: "", title: s.album.t, artist: s.album.a, year: s.album.y, genre: s.album.g,
        color: s.album.c, ratio: s.album.r, cover: this.cover, tagged: true,
        tracks: s.album.tr.map(t => ({ title: t.t, no: t.no, disc: 1, duration: t.d || undefined, format: t.f, entry: { path: `${key}#${t.no}`, getFile: locked } })),
      };
    }
    this.index = Math.max(0, Math.min(s.i, (this.album?.tracks.length ?? 1) - 1));
    this.pos = s.pos; this.dur = s.dur; this.at = performance.now(); this.playing = s.on;
    this.sampleRate = s.sr; this.normalize = s.nz ?? "off"; this.normGain = s.ng;
    if (this.eq.on !== s.eq.on || this.eq.gains.some((g, i) => g !== s.eq.g[i])) this.eq.show(s.eq.on, s.eq.g);
    this.emit();
  }
  /** いまのアルバムのジャケット（写しの小さな JPEG） */
  setCover(id: string, url: string) {
    if (this.album?.key !== id) return;
    if (this.cover === url && this.album.cover === url) return;
    this.cover = url; this.album = { ...this.album, cover: url };
    this.emit();
  }
  /** 曲の波形（ホストから届く） */
  setPeaks(key: string, p: Float32Array) {
    if (this.peaksBy.size > 8) this.peaksBy.delete(this.peaksBy.keys().next().value!);
    this.peaksBy.set(key, p);
    this.waiting.get(key)?.forEach(r => r(p)); this.waiting.delete(key);
  }
  /** 波形のモジュールが呼ぶ。届いていなければ、届くまで（長くても 20 秒）待つ */
  peaks(key: string): Promise<Float32Array | undefined> {
    const hit = this.peaksBy.get(key);
    if (hit) return Promise.resolve(hit);
    return new Promise(resolve => {
      const list = this.waiting.get(key) ?? [];
      list.push(resolve); this.waiting.set(key, list);
      setTimeout(() => resolve(undefined), 20_000);
    });
  }
  /** 届いた音を測る口（party.ts が音を受け取ったときに渡す） */
  listen(meters: AnalyserNode[], spec: AnalyserNode) {
    this.meters = meters; this.spec = spec;
    this.meterBuf = new Float32Array(meters[0]?.fftSize ?? 2048);
    this.specBuf = new Float32Array(spec.frequencyBinCount);
    this.sampleRate ??= spec.context.sampleRate;
  }
  levels(): [number, number] {
    if (!this.meters.length || !this.playing) return [0, 0];
    const out = this.meters.map(a => {
      a.getFloatTimeDomainData(this.meterBuf);
      let sum = 0;
      for (let i = 0; i < this.meterBuf.length; i++) sum += this.meterBuf[i] * this.meterBuf[i];
      return Math.sqrt(sum / this.meterBuf.length);
    });
    return [out[0] ?? 0, out[1] ?? out[0] ?? 0];
  }
  spectrum(): Float32Array | undefined {
    if (!this.spec || !this.playing) return undefined;
    this.spec.getFloatFrequencyData(this.specBuf);
    return this.specBuf;
  }

  // 見るだけ: 操作は受け付けない
  seek() { /* ホストの曲は動かせない */ }
  toggle() { /* 同上 */ }
  async setSink() { /* 同上 */ }
  setNormalize() { /* 同上 */ }
  async trackFile(): Promise<File | undefined> { return undefined; }
  chimeInput() { return undefined; }
  async fadeOutAndPause() { /* 同上 */ }
  playAlbum() { /* 同上 */ }

  /** モジュールに渡すときの形（Player として振る舞う） */
  asPlayer(): Player { return this as unknown as Player; }
}

/** ホストから届いた聴いた記録（ホストが見せると決めたときだけ届く） */
export class MirrorHistory implements HistorySource {
  private events: PlayEvent[] = [];
  private plays = new Map<string, number>();
  private secs = 0;
  shown = false;
  set(events: PlayEvent[], plays: Map<string, number>, listened: number) {
    this.events = events; this.plays = plays; this.secs = listened; this.shown = true;
  }
  clear() { this.events = []; this.plays = new Map(); this.secs = 0; this.shown = false; }
  // モジュールが分割代入で取り出すので、this を束ねておく
  log = (): readonly PlayEvent[] => this.events;
  stat = (k: string): PlayStat => ({ plays: this.plays.get(k) ?? 0, last: 0 });
  listened = () => this.secs;
}
