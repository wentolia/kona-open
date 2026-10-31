// 再生エンジン: <audio> を Web Audio のグラフに通す。EQ などの DSP はこのグラフに挿していく

import { enrichTracks, type Album, type Track } from "./library";
import { Eq } from "./eq";
import { prefs } from "./prefs";
import pitchSource from "../public/pitch-worklet.js?raw";

type Listener = () => void;

/** ファイルを持たず、外のサービス（Spotify）が鳴らす再生先。音は Kona の Web Audio のグラフを通らない */
export interface Remote {
  readonly paused: boolean;
  readonly position: number;   // 秒
  readonly duration: number;   // 秒
  readonly currentUri?: string;
  play(uris: string[], offset: number, at?: number): Promise<void>;
  pause(): void;
  resume(): void;
  seek(sec: number): void;
  setVolume(v: number): void;
  onChange?: () => void;
  onEnded?: () => void;
}
const uriOf = (t: Track) => (t.entry as { uri?: string }).uri ?? "";
interface Cue { album: Album; index: number }

/** 再生のしかた: 通常 → アルバムをくり返す → 1 曲をくり返す → アルバムの中でシャッフル（ボタンを押すたびに巡る） */
export type PlayMode = "normal" | "album" | "track" | "shuffle";
export const PLAY_MODES: PlayMode[] = ["normal", "album", "track", "shuffle"];
const MODE_KEY = "kona.mode";
const SPEED_KEY = "kona.speed";
/** 速さ（0.5〜2 倍、音程は変えない）とピッチ（±12 半音、速さは変えない）。別々に変えられる */
export interface Speed { rate: number; pitch: number }
export const RATE_MIN = 0.5, RATE_MAX = 2, PITCH_MAX = 12;
function loadSpeed(): Speed {
  try {
    const s = JSON.parse(localStorage.getItem(SPEED_KEY) ?? "null");
    if (s) return { rate: Math.min(RATE_MAX, Math.max(RATE_MIN, Number(s.rate) || 1)), pitch: Math.min(PITCH_MAX, Math.max(-PITCH_MAX, Math.round(Number(s.pitch) || 0))) };
  } catch { /* ignore */ }
  return { rate: 1, pitch: 0 };
}
function loadMode(): PlayMode {
  try { const m = localStorage.getItem(MODE_KEY) as PlayMode; if (PLAY_MODES.includes(m)) return m; } catch { /* ignore */ }
  return "normal";
}
function shuffled(n: number, first: number): number[] {
  const rest = Array.from({ length: n }, (_, i) => i).filter(i => i !== first);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  return first >= 0 && first < n ? [first, ...rest] : rest;
}

const VOLUME_KEY = "kona.volume";
const OUTPUT_KEY = "kona.output";
export type Normalize = "off" | "track" | "album";
interface OutputPrefs { sink: string; normalize: Normalize }
function loadOutput(): OutputPrefs {
  try { const s = JSON.parse(localStorage.getItem(OUTPUT_KEY) ?? "null"); if (s) return { sink: String(s.sink ?? ""), normalize: (["off", "track", "album"].includes(s.normalize) ? s.normalize : "off") as Normalize }; } catch { /* ignore */ }
  return { sink: "", normalize: "off" };
}
function loadVolume(): number {
  try { const v = Number(localStorage.getItem(VOLUME_KEY)); if (localStorage.getItem(VOLUME_KEY) !== null && v >= 0 && v <= 1) return v; } catch { /* ignore */ }
  return 0.8;
}

// 0.05 秒の無音（WAV）
const SILENCE = (() => {
  const n = 2205, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer), w = (o: number, s: string) => [...s].forEach((c, i) => b[o + i] = c.charCodeAt(0));
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  return "data:audio/wav;base64," + btoa(String.fromCharCode(...b));
})();

export class Player {
  album?: Album;
  index = 0;
  readonly eq = new Eq();
  // 再生器は 2 つ。鳴っているのが audio、もう片方（spare）に次の曲を先に読み込んでおき、曲の境目で入れ替える
  private audio = new Audio();
  private spare = new Audio();
  private ctx?: AudioContext;
  private gain?: GainNode;
  private norms = new Map<HTMLAudioElement, GainNode>();  // 音量の正規化（ReplayGain）。再生器ごと
  private xfs = new Map<HTMLAudioElement, GainNode>();    // クロスフェードの出し入れ。再生器ごと
  private xfadeArm = false;                               // 次の入れ替えはクロスフェードで
  private fadingOut?: HTMLAudioElement;                   // クロスフェードで消えていく途中の再生器
  private urls = new Map<HTMLAudioElement, string>();
  private cueTarget?: Cue;                                 // 先読みしようとしている曲
  private cued?: Cue;                                      // spare に読み込み済みの曲（cueTarget と同じもの）
  private cueing = 0;                                     // 先読みの世代（古い先読みを捨てる）
  private switchTimer = 0;                                // 曲の終わりぴったりに切り替えるタイマー
  private fader?: GainNode;    // スリープタイマーのフェードアウト
  private noise?: GainNode;    // 重ねる環境音の入口（再生中だけ開く）
  private lingerTimer = 0;     // 余韻の終わり
  private lingerStop?: () => void; // 余韻のために足した部屋の音を止める
  /** 余韻のあいだだけ鳴らす部屋の音（時計など）を足す。止める関数を返す */
  onLinger?: (ctx: AudioContext, input: AudioNode, seconds: number) => (() => void) | void;
  private meters: AnalyserNode[] = [];
  private meterBuf = new Float32Array(2048);
  private spec?: AnalyserNode;  // スペクトラム用（左右をまとめた 1 本）
  private specBuf = new Float32Array(0);
  private out = loadOutput();
  private vol = loadVolume();
  private muted = false;
  private unlocked = false;
  private listeners = new Set<Listener>();
  onAlbumEnd?: () => void;
  /** アルバムをくり返す前に聞く。false ならくり返さずに止める（スリープタイマー「アルバムの終わり」） */
  onAlbumLoop?: () => boolean;
  private playMode = loadMode();
  private spd = loadSpeed();
  private pre?: GainNode;                       // 2 つの再生器が合流するところ（ピッチを変えるときはここに挿す）
  private eqIn?: AudioNode;
  private shifter?: AudioWorkletNode;
  private shifterLoad?: Promise<AudioWorkletNode | undefined>;
  private order: number[] = [];                // シャッフルの曲順（曲の番号の並び）
  private nextStart?: Cue;                     // シャッフル中に次のアルバムへ移るときの最初の曲（先読みと合わせる）
  /** アルバムを聴き終えたあとに切り替わる先（アルバムの境目も先読みするため） */
  nextAlbum?: () => Album | undefined;
  /** アルバムを外のサービスで鳴らすなら、その再生先（spotify-ui.ts が入れる） */
  remoteFor?: (album: Album) => Remote | undefined;
  private remote?: Remote;
  private remoteList: number[] = [];   // 外の再生先に並べた曲（曲の番号）
  private remoteStarted = false;       // 並べて鳴らし始めたか（開き直した直後は位置だけ覚えている）
  private remoteAt = 0;                // 鳴らし始める前の位置（秒）
  /** 曲が再生できなかったとき（ブラウザが対応していない形式・壊れたファイル）。その曲は飛ばす */
  onTrackError?: (album: Album, track: Track) => void;

  constructor() {
    this.applyRate();
    for (const el of [this.audio, this.spare]) {
      el.preload = "auto";
      // 出来事は鳴っている方の再生器のものだけを拾う
      const on = (ev: string, fn: () => void) => el.addEventListener(ev, () => { if (el === this.audio) fn(); });
      on("ended", () => this.advance());
      // 再生できない曲で止まらない: 鳴らそうとした曲なら飛ばして次へ、先読みしていた曲なら先読みを捨てる
      el.addEventListener("error", () => {
        if (!el.src || el.src === SILENCE) return;
        if (el !== this.audio) { if (this.cued) this.cued = undefined; return; }
        const album = this.album, track = this.track;
        if (!album || !track) return;
        this.onTrackError?.(album, track);
        this.next();
      });
      on("timeupdate", () => { this.cueNext(); this.armSwitch(); });
      for (const ev of ["play", "pause", "loadedmetadata"]) on(ev, () => this.emit());
      for (const ev of ["play", "pause", "loadedmetadata", "seeked", "ratechange"]) on(ev, () => this.syncMediaSession());
      for (const ev of ["pause", "seeking"]) on(ev, () => this.disarmSwitch());
      // 環境音は音楽と一緒に、ゆっくり現れてゆっくり消える
      // アルバムを聴き終えたあとの余韻のあいだは、止まっても消さない（linger）。再生し直したら余韻は打ち切る
      for (const ev of ["play", "pause"]) on(ev, () => {
        if (!this.noise || !this.ctx) return;
        if (this.audio.paused && this.lingerTimer) return;
        if (!this.audio.paused) this.endLinger();
        this.noise.gain.setTargetAtTime(this.audio.paused ? 0 : 1, this.ctx.currentTime, this.audio.paused ? .25 : .6);
      });
    }
    this.initMediaSession();
  }

  get track(): Track | undefined { return this.album?.tracks[this.index]; }
  get playing(): boolean { return this.remote ? !this.remote.paused : !this.audio.paused; }
  get position(): number { return this.remote ? (this.remoteStarted ? this.remote.position : this.remoteAt) : this.audio.currentTime; }
  get duration(): number {
    if (this.remote) return (this.remoteStarted && this.remote.duration) || this.track?.duration || 0;
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }
  /** いまの曲が外のサービスで鳴っている（DRM のため EQ・波形・速さとピッチ・クロスフェードなどは効かない） */
  get external(): boolean { return !!this.remote; }

  on(fn: Listener): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { this.listeners.forEach(fn => fn()); }

  // 最初の再生操作のタイミングで AudioContext を作る（ブラウザの自動再生制限のため）
  private ensureGraph() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.gain = this.ctx.createGain();
    this.applyVolume();
    const eq = this.eq.attach(this.ctx);
    this.fader = this.ctx.createGain();
    // 元の音 → 正規化 → EQ → 音量 → フェード → 出力。メーターは音量の手前（EQ のあと）から取る
    // 2 つの再生器はそれぞれの正規化を通ってから EQ の手前で合流する
    // 合流したところ（pre）から EQ へ。ピッチを変えるときは、その間に挿す
    this.pre = this.ctx.createGain();
    this.eqIn = eq.input;
    this.pre.connect(eq.input);
    for (const el of [this.audio, this.spare]) {
      const norm = this.ctx.createGain(), xf = this.ctx.createGain();
      this.ctx.createMediaElementSource(el).connect(norm).connect(xf).connect(this.pre);
      this.norms.set(el, norm); this.xfs.set(el, xf);
    }
    this.applyPitch();
    eq.output.connect(this.gain).connect(this.fader).connect(this.ctx.destination);
    // 環境音は音量とフェードの手前に足す（メーターや波形には入れない）
    this.noise = this.ctx.createGain(); this.noise.gain.value = 0;
    this.noise.connect(this.gain);
    const split = this.ctx.createChannelSplitter(2);
    eq.output.connect(split);
    this.meters = [0, 1].map(ch => { const a = this.ctx!.createAnalyser(); a.fftSize = 2048; split.connect(a, ch); return a; });
    // スペクトラムはメーターと同じ所（EQ のあと・音量の手前）から。低音を細かく見るため窓は長め
    this.spec = this.ctx.createAnalyser(); this.spec.fftSize = 8192; this.spec.smoothingTimeConstant = .8;
    this.specBuf = new Float32Array(this.spec.frequencyBinCount);
    eq.output.connect(this.spec);
    if (this.out.sink) this.applySink();
    this.applyNorm();
  }

  // 音量 0〜1。耳の感じ方に合わせて 2 乗のカーブでゲインにする
  get volume(): number { return this.vol; }
  get isMuted(): boolean { return this.muted || this.vol === 0; }
  setVolume(v: number) {
    this.vol = Math.max(0, Math.min(1, v));
    this.muted = false;
    this.applyVolume();
    try { localStorage.setItem(VOLUME_KEY, String(this.vol)); } catch { /* ignore */ }
  }
  toggleMute() { this.muted = !this.muted; this.applyVolume(); }
  private applyVolume() {
    this.remote?.setVolume(this.muted ? 0 : this.vol * this.vol);
    if (!this.gain || !this.ctx) return;
    this.gain.gain.setTargetAtTime(this.muted ? 0 : this.vol * this.vol, this.ctx.currentTime, 0.015);
  }

  /** 左右のレベル（RMS、0〜1） */
  levels(): [number, number] {
    if (!this.meters.length || this.audio.paused || this.remote) return [0, 0];
    return this.meters.map(a => {
      a.getFloatTimeDomainData(this.meterBuf);
      let sum = 0;
      for (let i = 0; i < this.meterBuf.length; i++) sum += this.meterBuf[i] * this.meterBuf[i];
      return Math.sqrt(sum / this.meterBuf.length);
    }) as [number, number];
  }

  /** 周波数ごとの強さ（dB、0 Hz からサンプルレート/2 まで等間隔）。音の経路ができる前・止まっているときは undefined */
  spectrum(): Float32Array | undefined {
    if (!this.spec || this.audio.paused || this.remote) return undefined;
    this.spec.getFloatFrequencyData(this.specBuf);
    return this.specBuf;
  }

  /** 何秒かかけて音を絞り、止める（スリープタイマー） */
  async fadeOutAndPause(seconds = 8) {
    // 外の再生先は音の経路に入れないので、再生先の音量を少しずつ下げて止める
    const r = this.remote;
    if (r) {
      if (r.paused) return;
      const v0 = this.muted ? 0 : this.vol * this.vol, steps = Math.max(1, Math.round(seconds * 4));
      for (let i = 1; i <= steps && this.remote === r && !r.paused; i++) { await new Promise(res => setTimeout(res, seconds * 1000 / steps)); r.setVolume(v0 * (1 - i / steps)); }
      r.pause(); r.setVolume(v0); this.emit();
      return;
    }
    if (!this.ctx || !this.fader || this.audio.paused) { this.audio.pause(); return; }
    const t = this.ctx.currentTime, g = this.fader.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + seconds);
    await new Promise(r => setTimeout(r, seconds * 1000));
    this.audio.pause();
    g.cancelScheduledValues(this.ctx.currentTime); g.setValueAtTime(1, this.ctx.currentTime);
    this.emit();
  }

  /** 曲の終わりの余韻: 音楽が止まったあとも、部屋の音（環境音・時計）だけをしばらく残し、ゆっくり消す */
  linger(hold = 5, fade = 9) {
    if (!this.ctx || !this.noise || this.remote) return; // Spotify の音にほかの音を重ねない
    this.endLinger();
    const t = this.ctx.currentTime, g = this.noise.gain;
    g.cancelScheduledValues(t); g.setValueAtTime(Math.max(g.value, .001), t);
    g.linearRampToValueAtTime(1, t + .6);
    g.setValueAtTime(1, t + hold);
    g.linearRampToValueAtTime(0, t + hold + fade);
    this.lingerStop = this.onLinger?.(this.ctx, this.noise, hold + fade) || undefined;
    this.lingerTimer = window.setTimeout(() => { this.lingerTimer = 0; this.lingerStop?.(); this.lingerStop = undefined; }, (hold + fade + .3) * 1000);
  }
  private endLinger() {
    if (!this.lingerTimer) return;
    clearTimeout(this.lingerTimer); this.lingerTimer = 0;
    this.lingerStop?.(); this.lingerStop = undefined;
    if (this.ctx && this.noise) { const t = this.ctx.currentTime, g = this.noise.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
  }
  get lingering(): boolean { return !!this.lingerTimer; }

  /** 環境音を重ねる入口。音の経路ができるまで（最初の再生まで）は undefined */
  /** 時計の鐘の入口。止まっているときも鳴るよう、フェードを通さず音量だけ合わせて出力へ */
  private bellBus?: GainNode;
  chimeInput(): { ctx: AudioContext; input: AudioNode } | undefined {
    if (!this.ctx) return undefined;
    if (!this.bellBus) { this.bellBus = this.ctx.createGain(); this.bellBus.connect(this.ctx.destination); }
    this.bellBus.gain.value = this.muted ? 0 : this.vol * this.vol;
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return { ctx: this.ctx, input: this.bellBus };
  }

  noiseInput(): { ctx: AudioContext; input: AudioNode } | undefined {
    return this.ctx && this.noise ? { ctx: this.ctx, input: this.noise } : undefined;
  }

  // ---------- 出力 ----------
  get sampleRate(): number | undefined { return this.ctx?.sampleRate; }
  get sink(): string { return this.out.sink; }
  get normalize(): Normalize { return this.out.normalize; }
  get canChooseSink(): boolean { return "setSinkId" in AudioContext.prototype; }
  async setSink(id: string) { this.out.sink = id; this.saveOutput(); await this.applySink(); this.emit(); }
  setNormalize(n: Normalize) { this.out.normalize = n; this.saveOutput(); this.applyNorm(); this.emit(); }
  /** いま正規化でかけているゲイン（dB）。タグがなければ undefined */
  get normGain(): number | undefined { return this.gainFor(this.track); }
  private gainFor(t?: Track): number | undefined {
    if (!t || this.out.normalize === "off") return undefined;
    return this.out.normalize === "album" ? t.rgAlbum ?? t.rgTrack : t.rgTrack ?? t.rgAlbum;
  }
  private saveOutput() { try { localStorage.setItem(OUTPUT_KEY, JSON.stringify(this.out)); } catch { /* ignore */ } }
  private async applySink() {
    const ctx = this.ctx as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | undefined;
    try { await ctx?.setSinkId?.(this.out.sink); } catch { /* 選べない出力先は既定のまま */ }
  }
  private applyNorm() {
    this.setNorm(this.audio, this.track);
    if (this.cued) this.setNorm(this.spare, this.cued.album.tracks[this.cued.index]);
  }
  private setNorm(el: HTMLAudioElement, t?: Track, at = 0) {
    const norm = this.norms.get(el);
    if (!norm || !this.ctx) return;
    const db = Math.max(-15, Math.min(6, this.gainFor(t) ?? 0));
    norm.gain.setTargetAtTime(10 ** (db / 20), Math.max(at, this.ctx.currentTime), 0.02);
  }

  /** index を省くとアルバムの頭から（シャッフル中は、ばらばらの順の 1 曲目から） */
  async playAlbum(album: Album, index?: number) {
    if (index === undefined) {
      const ns = this.nextStart;
      index = this.playMode !== "shuffle" ? 0 : ns?.album === album ? ns.index : Math.floor(Math.random() * album.tracks.length);
    }
    this.nextStart = undefined;
    this.album = album;
    this.order = shuffled(album.tracks.length, index);
    await this.load(index);
  }

  // ---------- 速さとピッチ ----------
  get speed(): Speed { return { ...this.spd }; }
  setSpeed(next: Partial<Speed>) {
    const s = { ...this.spd, ...next };
    this.spd = { rate: Math.min(RATE_MAX, Math.max(RATE_MIN, s.rate)), pitch: Math.min(PITCH_MAX, Math.max(-PITCH_MAX, Math.round(s.pitch))) };
    try { localStorage.setItem(SPEED_KEY, JSON.stringify(this.spd)); } catch { /* ignore */ }
    this.applyRate(); this.applyPitch(); this.emit();
  }
  // 速さは再生器そのもので変える（音程を保つ）。曲を替えても戻らないよう、既定の速さにも入れる
  private applyRate() {
    for (const el of [this.audio, this.spare]) {
      el.defaultPlaybackRate = this.spd.rate;
      el.playbackRate = this.spd.rate;
      el.preservesPitch = true;
    }
  }
  // ピッチは、合流したあとに音程だけを変える処理（pitch-worklet.js）を挿す。0 のときは外して素通しにする
  private async applyPitch() {
    if (!this.ctx || !this.pre || !this.eqIn) return;
    const pitch = this.spd.pitch;
    const node = pitch ? await this.loadShifter() : undefined;
    if (pitch !== this.spd.pitch) return; // 読み込みの間に変わった
    this.pre.disconnect();
    if (node) {
      node.parameters.get("ratio")!.value = 2 ** (pitch / 12);
      this.pre.connect(node);
    } else this.pre.connect(this.eqIn);
  }
  private loadShifter(): Promise<AudioWorkletNode | undefined> {
    const ctx = this.ctx!;
    // 公開版は同じ場所のファイル（public/pitch-worklet.js。CSP の script-src 'self' に収まる）を読み、
    // それが無い 1 ファイル版では、同じ中身を blob にして読む
    const add = (url: string) => ctx.audioWorklet.addModule(url);
    return this.shifterLoad ??= add(new URL("pitch-worklet.js", document.baseURI).href)
      .catch(() => {
        const url = URL.createObjectURL(new Blob([pitchSource], { type: "text/javascript" }));
        return add(url).finally(() => URL.revokeObjectURL(url));
      })
      .then(() => {
        this.shifter = new AudioWorkletNode(ctx, "kona-pitch", { outputChannelCount: [2] });
        this.shifter.connect(this.eqIn!);
        return this.shifter;
      })
      .catch(() => undefined);   // 使えないブラウザでは、ピッチは変えずに鳴らす
  }

  // ---------- 再生のしかた ----------
  get mode(): PlayMode { return this.playMode; }
  /** 次の再生のしかたへ（通常 → アルバム → 1 曲 → シャッフル → 通常） */
  cycleMode() { this.setMode(PLAY_MODES[(PLAY_MODES.indexOf(this.playMode) + 1) % PLAY_MODES.length]); }
  setMode(m: PlayMode) {
    this.playMode = m;
    try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
    // シャッフルに入ったら、今の曲を先頭に残りを混ぜ直す
    if (m === "shuffle" && this.album) this.order = shuffled(this.album.tracks.length, this.index);
    // 次に鳴る曲が変わるので、先読みをやり直す
    this.nextStart = undefined;
    this.cueNext();
    this.emit();
  }
  /** アルバムの中の次の曲（シャッフル中はばらばらの順で）。最後なら undefined */
  private nextIndex(): number | undefined {
    if (!this.album) return undefined;
    if (this.playMode === "shuffle") {
      const pos = this.order.indexOf(this.index);
      return pos >= 0 ? this.order[pos + 1] : undefined;
    }
    return this.index + 1 < this.album.tracks.length ? this.index + 1 : undefined;
  }
  private prevIndex(): number | undefined {
    if (!this.album) return undefined;
    if (this.playMode === "shuffle") {
      const pos = this.order.indexOf(this.index);
      return pos > 0 ? this.order[pos - 1] : undefined;
    }
    return this.index > 0 ? this.index - 1 : undefined;
  }
  private firstIndex(): number { return this.playMode === "shuffle" ? (this.order[0] ?? 0) : 0; }

  /** 再生はせずに、アルバムの曲と位置だけを合わせる（開き直したときの復元） */
  async cue(album: Album, index: number, at: number) {
    this.album = album;
    this.order = shuffled(album.tracks.length, index);
    await this.load(index, false);
    if (this.remote) { this.remoteAt = Math.max(0, at); this.emit(); return; }
    if (at > 0) {
      const seek = () => { this.audio.currentTime = Math.min(at, Math.max(0, (this.audio.duration || at) - 1)); this.emit(); };
      if (this.audio.readyState >= 1) seek(); else this.audio.addEventListener("loadedmetadata", seek, { once: true });
    }
  }

  private async load(index: number, autoplay = true) {
    if (!this.album) return;
    const r = this.remoteFor?.(this.album);
    if (r !== this.remote) this.setRemote(r);
    if (r) { this.index = index; this.disarmSwitch(); return this.loadRemote(index, autoplay); }
    this.ensureGraph();
    this.index = index;
    this.disarmSwitch();
    // スマホのブラウザは、操作の直後でないと再生を始めさせない。Drive の曲は取ってくるのに時間がかかるので、
    // 最初の 1 回だけ、操作のその場で無音を鳴らして再生の許可を得ておく（曲の境目で切り替えるので、再生器は 2 つとも）
    if (autoplay && !this.unlocked) {
      this.unlocked = true;
      this.cued = this.cueTarget = undefined; this.cueing++;
      for (const el of [this.audio, this.spare]) { el.src = SILENCE; el.play().catch(() => {}); }
    }
    // 先読みしてあればそれを使い、なければ読み込む（次の曲の先読みは cueNext。Drive の曲もここで先に取っておく）
    if (this.cued?.album === this.album && this.cued.index === index) this.swap();
    else {
      this.cued = this.cueTarget = undefined; this.cueing++;
      let file: File;
      // Drive のサインイン切れや電波切れでは止まるだけにする（サインインし直しは画面のお知らせから）
      try { file = await this.album.tracks[index].entry.getFile(); } catch { return; }
      this.setSource(this.audio, file);
      this.setNorm(this.audio, this.track);
    }
    if (autoplay) {
      await this.ctx!.resume();
      await this.audio.play().catch(() => {});
    }
    this.updateMediaSession();
    this.emit();
    this.cueNext();
  }

  // ---------- 外の再生先（Spotify） ----------
  private setRemote(r?: Remote) {
    const old = this.remote;
    if (old) { old.onChange = old.onEnded = undefined; old.pause(); }
    this.remote = r; this.remoteStarted = false; this.remoteAt = 0;
    if (r) {
      // 手元の曲は止める（2 つが同時に鳴らないように）
      this.audio.pause(); this.fadingOut?.pause();
      this.cued = this.cueTarget = undefined; this.cueing++;
      r.onChange = () => this.remoteChanged();
      r.onEnded = () => this.advance();
      r.setVolume(this.muted ? 0 : this.vol * this.vol);
    }
    document.documentElement.toggleAttribute("data-drm", !!r);
  }
  private async loadRemote(index: number, autoplay: boolean) {
    const a = this.album!;
    // 鳴らす順に並べて渡す（同じアルバムの曲の境目は Spotify が切れ目なくつなぐ）。終わったら advance で次を決める
    this.remoteList = this.playMode === "track" ? [index]
      : this.playMode === "shuffle" ? this.order.slice(Math.max(0, this.order.indexOf(index)))
      : a.tracks.map((_, i) => i).slice(index);
    this.remoteStarted = false; this.remoteAt = 0;
    this.updateMediaSession();
    this.emit();
    if (autoplay) await this.startRemote(0);
  }
  private async startRemote(at: number) {
    const a = this.album, r = this.remote;
    if (!a || !r) return;
    this.remoteStarted = true; this.remoteAt = 0;
    await r.play(this.remoteList.map(i => uriOf(a.tracks[i])), 0, at);
  }
  private remoteChanged() {
    const r = this.remote, a = this.album;
    if (!r || !a) return;
    const uri = r.currentUri;
    if (uri) {
      const i = a.tracks.findIndex(t => uriOf(t) === uri);
      if (i >= 0 && i !== this.index) { this.index = i; this.updateMediaSession(); }
    }
    this.syncMediaSession();
    this.emit();
  }

  private setSource(el: HTMLAudioElement, file: Blob) {
    const old = this.urls.get(el);
    if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(file);
    this.urls.set(el, url);
    el.src = url;
  }

  /** 鳴っている再生器と先読みの再生器を入れ替える（前の曲は止めて頭に戻す） */
  private swap() {
    const prev = this.audio, next = this.spare;
    this.audio = next; this.spare = prev;
    this.cued = this.cueTarget = undefined;
    const pg = this.xfs.get(prev)?.gain, ng = this.xfs.get(next)?.gain, ctx = this.ctx;
    if (this.xfadeArm && pg && ng && ctx) {
      // クロスフェード: 前の曲を残りの長さで絞り、次の曲を同じ長さで上げる。終わったら前の再生器を止めて頭に戻す
      this.xfadeArm = false;
      const d = Math.max(.3, Math.min(prefs().crossfade, ((prev.duration || 0) - prev.currentTime) / (prev.playbackRate || 1)));
      const t = ctx.currentTime;
      pg.cancelScheduledValues(t); pg.setValueAtTime(pg.value, t); pg.linearRampToValueAtTime(0, t + d);
      ng.cancelScheduledValues(t); ng.setValueAtTime(0, t); ng.linearRampToValueAtTime(1, t + d);
      this.fadingOut = prev;
      setTimeout(() => {
        if (this.fadingOut !== prev) return;
        this.fadingOut = undefined;
        prev.pause(); prev.currentTime = 0;
        pg.cancelScheduledValues(ctx.currentTime); pg.setValueAtTime(1, ctx.currentTime);
        this.cueNext();
      }, d * 1000 + 80);
      return;
    }
    if (this.fadingOut === next) this.fadingOut = undefined;
    for (const g of [pg, ng]) if (g && ctx) { g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(1, ctx.currentTime); }
    prev.pause();
    prev.currentTime = 0;
  }

  /** 曲が終わったときに次に鳴る曲: 1 曲リピートなら同じ曲、アルバムの次の曲、アルバムリピートなら頭の曲、
   *  そうでなければ次に切り替わるアルバムの 1 曲目（シャッフル中はばらばらの 1 曲目） */
  private successor(): Cue | undefined {
    if (!this.album) return undefined;
    if (this.playMode === "track") return { album: this.album, index: this.index };
    const ni = this.nextIndex();
    if (ni !== undefined) return { album: this.album, index: ni };
    if (this.playMode === "album") return { album: this.album, index: this.firstIndex() };
    const a = this.nextAlbum?.();
    if (!a?.tracks.length) return undefined;
    if (this.playMode !== "shuffle") return { album: a, index: 0 };
    if (this.nextStart?.album !== a) this.nextStart = { album: a, index: Math.floor(Math.random() * a.tracks.length) };
    return this.nextStart;
  }

  /** 次の曲を spare に読み込んでおく。曲の境目では読み込みを待たずに切り替えられる。
   *  再生中は何度も呼ばれ、「次に再生」が変わって次の曲が替わったときだけ読み直す */
  private async cueNext() {
    if (this.remote) return;
    const want = this.successor(), cur = this.cueTarget;
    if (want?.album === cur?.album && want?.index === cur?.index) return;
    // クロスフェードで前の曲がまだ鳴っている間は、その再生器に次を読み込まない（終わってから）
    if (this.fadingOut && this.fadingOut === this.spare) return;
    const gen = ++this.cueing;
    this.cueTarget = want; this.cued = undefined;
    if (!want) return;
    // 別のアルバムは、曲順を確定してから（タグを読むと曲が並べ替わる）
    if (want.album !== this.album) {
      await enrichTracks(want.album).catch(() => {});
      if (gen !== this.cueing) return;
      if (want.index >= want.album.tracks.length) return;
    }
    const file = await want.album.tracks[want.index].entry.getFile().catch(() => undefined);
    if (!file || gen !== this.cueing) return;
    this.setSource(this.spare, file);
    this.cued = want;
    this.setNorm(this.spare, want.album.tracks[want.index]);
  }

  // 曲の残りがわずかになったら、終わる瞬間に次の曲を鳴らし始める（ended を待つと読み込みと発火の分だけ間が空く）
  private armSwitch() {
    if (this.switchTimer || this.audio.paused || !this.album || !this.duration) return;
    const cued = this.cued;
    if (!cued || cued !== this.cueTarget || this.spare.readyState < 3) return;
    const left = (this.duration - this.audio.currentTime) / (this.audio.playbackRate || 1);
    // クロスフェードは同じアルバムの中だけ（アルバムの境目は「次に再生」の切り替えがあるので、ぴったりつなぐ）
    const xf = prefs().crossfade;
    if (xf > 0 && cued.album === this.album && this.duration > xf * 3) {
      if (left > xf) return;
      this.xfadeArm = true;
      this.advance();
      return;
    }
    if (left > 0.5) return;
    this.switchTimer = window.setTimeout(() => {
      this.switchTimer = 0;
      if (!this.audio.paused && this.cued === cued) this.advance();
    }, Math.max(0, left * 1000 - 10));
  }
  private disarmSwitch() { clearTimeout(this.switchTimer); this.switchTimer = 0; this.xfadeArm = false; }

  toggle() {
    if (!this.album) return;
    const r = this.remote;
    if (r) {
      if (!this.remoteStarted) this.startRemote(this.remoteAt);
      else if (r.paused) r.resume();
      else r.pause();
      this.emit();
      return;
    }
    if (this.audio.paused) { this.ctx?.resume(); this.audio.play().catch(() => {}); }
    else { this.audio.pause(); this.fadingOut?.pause(); }
  }

  /** 曲が終わったとき（再生のしかたに従う） */
  private advance() {
    if (!this.album) return;
    if (this.playMode === "track") { this.load(this.index); return; }
    const ni = this.nextIndex();
    if (ni !== undefined) { this.load(ni); return; }
    if (this.playMode === "album" && this.onAlbumLoop?.() !== false) { this.load(this.firstIndex()); return; }
    this.endAlbum();
  }
  private endAlbum() {
    if (this.remote) { this.remote.pause(); this.remoteStarted = false; this.remoteAt = 0; }
    else { this.audio.pause(); this.audio.currentTime = 0; }
    this.emit(); this.onAlbumEnd?.();
  }

  /** 次の曲へ（ボタン・メディアキー）。1 曲リピート中でも次の曲へ進む */
  next() {
    if (!this.album) return;
    const ni = this.nextIndex();
    if (ni !== undefined) this.load(ni);
    else if (this.playMode === "album") this.load(this.firstIndex());
    else this.endAlbum();
  }

  prev() {
    if (!this.album) return;
    // 3秒以上進んでいたら曲の頭に戻る
    const pi = this.prevIndex();
    if (this.position > 3 || pi === undefined) this.seekTo(0);
    else this.load(pi);
  }

  /** 再生中の曲のファイル（波形を描くため） */
  async trackFile(): Promise<File | undefined> { return this.remote ? undefined : this.track?.entry.getFile(); }

  seek(ratio: number) {
    if (this.duration) this.seekTo(ratio * this.duration);
  }

  // ---------- メディアセッション ----------
  // OS のメディアキー、タスクバーやロック画面のメディア操作に曲情報を出し、そこから操作できるようにする
  private initMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (a: MediaSessionAction, fn: MediaSessionActionHandler) => { try { ms.setActionHandler(a, fn); } catch { /* 対応していない操作 */ } };
    set("play", () => { if (!this.playing) this.toggle(); });
    set("pause", () => { if (this.playing) this.toggle(); });
    set("stop", () => { if (this.playing) this.toggle(); });
    set("nexttrack", () => this.next());
    set("previoustrack", () => this.prev());
    set("seekto", d => { if (d.seekTime !== undefined) this.seekTo(d.seekTime); });
    set("seekbackward", d => this.seekTo(this.position - (d.seekOffset ?? 10)));
    set("seekforward", d => this.seekTo(this.position + (d.seekOffset ?? 10)));
  }

  /** 秒で位置を合わせる */
  seekTo(sec: number) {
    if (!this.duration) return;
    const t = Math.max(0, Math.min(this.duration - .05, sec));
    if (this.remote) { if (this.remoteStarted) this.remote.seek(t); else this.remoteAt = t; this.emit(); return; }
    this.audio.currentTime = t;
  }

  private updateMediaSession() {
    if (!this.album || !this.track) return;
    // ウィンドウ名（タスクバーやタブに出る）も曲名にする
    document.title = `${this.track.title} — ${this.album.artist || this.album.title} · Kona`;
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: this.track.title,
      artist: this.album.artist,
      album: this.album.title,
      artwork: this.album.cover ? [{ src: this.album.cover }] : [],
    });
    this.syncMediaSession();
  }

  private syncMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.playbackState = !this.album ? "none" : this.playing ? "playing" : "paused";
    const d = this.duration;
    try {
      if (d) ms.setPositionState({ duration: d, position: Math.min(this.position, d), playbackRate: this.remote ? 1 : this.audio.playbackRate || 1 });
    } catch { /* 古いブラウザ */ }
  }
}
