// 重ねる環境音: ホワイト・ピンク・ブラウンのノイズと、雨・焚き火・波・レコードのチリチリ。
// それぞれ好きな音量で、音楽に重ねる（再生中だけ鳴る）。音はその場で作り、数秒〜十数秒をつなぎ目なく繰り返す

import type { Player } from "./player";

export const NOISES = [
  { key: "white", label: "ホワイト" }, { key: "pink", label: "ピンク" }, { key: "brown", label: "ブラウン" },
  { key: "rain", label: "雨" }, { key: "fire", label: "焚き火" }, { key: "waves", label: "波" }, { key: "vinyl", label: "レコード" },
] as const;
export type NoiseKind = typeof NOISES[number]["key"];

const KEY = "kona.noise";
const levels: Record<string, number> = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } })();
export const noiseLevel = (k: NoiseKind) => levels[k] ?? 0;

let player: Player | undefined;
const voices = new Map<NoiseKind, { src: AudioBufferSourceNode; gain: GainNode }>();
const listeners = new Set<() => void>();
export const onNoise = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };

export function setNoiseLevel(k: NoiseKind, v: number) {
  levels[k] = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(KEY, JSON.stringify(levels)); } catch { /* 保存できなくても動く */ }
  apply(); listeners.forEach(f => f());
}

export function initNoise(p: Player) { player = p; p.on(apply); }

// 耳の感じ方に合わせて 2 乗し、種類ごとの聞こえやすさをそろえる
const TRIM: Record<NoiseKind, number> = { white: .08, pink: .16, brown: .35, rain: .35, fire: .5, waves: .45, vinyl: .5 };

function apply() {
  const io = player?.noiseInput();
  if (!io) return;
  const { ctx, input } = io;
  for (const { key } of NOISES) {
    const v = noiseLevel(key), g = v * v * TRIM[key];
    let voice = voices.get(key);
    if (!voice && v > 0) {
      const src = ctx.createBufferSource(); src.buffer = make(ctx, key); src.loop = true; src.loopEnd = src.buffer.duration - .05; // 末尾の .05 秒は先頭に重ねてある
      const gain = ctx.createGain(); gain.gain.value = 0;
      src.connect(gain).connect(input); src.start();
      voice = { src, gain }; voices.set(key, voice);
    }
    voice?.gain.gain.setTargetAtTime(g, ctx.currentTime, .15);
  }
}

// ---------- 音を作る ----------
function make(ctx: AudioContext, kind: NoiseKind): AudioBuffer {
  const sr = ctx.sampleRate, secs = kind === "waves" ? 24 : kind === "white" || kind === "pink" || kind === "brown" ? 6 : 12;
  const n = Math.floor(sr * secs), buf = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const out = buf.getChannelData(ch), rnd = () => Math.random() * 2 - 1;
    // 下地のノイズ
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, br = 0;
    const pink = () => { const w = rnd(); b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; const o = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362; b6 = w * .115926; return o * .11; };
    const brown = () => { br = (br + .02 * rnd()) / 1.02; return br * 3.5; };
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      switch (kind) {
        case "white": out[i] = rnd() * .5; break;
        case "pink": out[i] = pink(); break;
        case "brown": out[i] = brown(); break;
        case "rain": out[i] = pink() * .55 + rnd() * .05; break;               // 細かい雨の面
        case "fire": out[i] = brown() * .5; break;                               // 低いゴーッという燃える音
        case "waves": {                                                          // 寄せては返す（8 秒ごと、ゆるやかに）
          const sw = .5 - .5 * Math.cos(2 * Math.PI * t / 8 + ch * .6);
          out[i] = brown() * (.25 + .75 * Math.pow(sw, 1.6)) + pink() * .25 * Math.pow(sw, 3);
          break;
        }
        case "vinyl": out[i] = pink() * .05; break;                              // ごく小さなサー
      }
    }
    // 粒: 雨粒・はぜる薪・レコードのプチッ。短く減衰する音を散らす
    const grains = kind === "rain" ? 70 : kind === "fire" ? 9 : kind === "vinyl" ? 3.5 : 0;
    const count = Math.floor(grains * secs);
    for (let k = 0; k < count; k++) {
      const at = Math.floor(Math.random() * n), amp = (kind === "rain" ? .08 : kind === "fire" ? .5 : .35) * Math.pow(Math.random(), 2.2);
      const len = Math.floor(sr * (kind === "rain" ? .004 + Math.random() * .01 : kind === "fire" ? .002 + Math.random() * .02 : .0015));
      const tone = kind === "rain" ? 2500 + Math.random() * 4000 : 0;
      for (let j = 0; j < len; j++) {
        const e = Math.exp(-j / (len / 4)), v = tone ? Math.sin(2 * Math.PI * tone * j / sr) : rnd();
        out[(at + j) % n] += v * amp * e;
      }
      // 焚き火は、はぜたあとに小さな粒が続く
      if (kind === "fire" && Math.random() < .5) for (let q = 0; q < 6; q++) { const a2 = (at + Math.floor(Math.random() * sr * .25)) % n; out[a2] += rnd() * amp * .4; }
    }
    // つなぎ目: 端を少し重ねてなめらかに（ループの継ぎ目でプツッといわない）
    const fade = Math.floor(sr * .05);
    for (let i = 0; i < fade; i++) { const w = i / fade; out[i] = out[i] * w + out[n - fade + i] * (1 - w); }
  }
  return buf;
}

// ---------- 曲の終わりの余韻: 音楽が止まったあとに残る部屋の音 ----------
// 時計の秒針はいつも。窓の外が雨なら（環境音の雨を鳴らしていなくても）小さな雨音も。止める関数を返す
let tickBuf: AudioBuffer | undefined, rainBuf: AudioBuffer | undefined;
export function roomTail(ctx: AudioContext, input: AudioNode, opts: { rain: boolean }): () => void {
  const out = ctx.createGain(); out.gain.value = 1; out.connect(input);
  const srcs: AudioBufferSourceNode[] = [];
  const loop = (buf: AudioBuffer, level: number) => {
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf; src.loop = true; g.gain.value = 0; g.gain.setTargetAtTime(level, ctx.currentTime, .4);
    src.connect(g).connect(out); src.start(ctx.currentTime + .05); srcs.push(src);
  };
  loop(tickBuf ??= makeTick(ctx), .5);
  if (opts.rain && noiseLevel("rain") === 0) loop(rainBuf ??= make(ctx, "rain"), .35 * .35 * .5);
  return () => {
    out.gain.setTargetAtTime(0, ctx.currentTime, .12);
    setTimeout(() => { srcs.forEach(s => { try { s.stop(); } catch { /* 止まっている */ } }); out.disconnect(); }, 800);
  };
}

// 1 秒に 1 回の、小さな置き時計の音（チッ・チッ。2 秒で一巡し、1 拍目と 2 拍目で少し音色を変える）
function makeTick(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate, n = sr * 2, buf = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const out = buf.getChannelData(ch);
    for (let beat = 0; beat < 2; beat++) {
      const at = beat * sr, tone = beat ? 2300 : 2700, len = Math.floor(sr * .03);
      for (let j = 0; j < len; j++) {
        const t = j / sr, e = Math.exp(-t / .004), body = Math.exp(-t / .012);
        out[at + j] += (Math.sin(2 * Math.PI * tone * t) * .5 + (Math.random() * 2 - 1) * .35) * e * .09
          + Math.sin(2 * Math.PI * 820 * t) * body * .025;
      }
    }
  }
  return buf;
}
