// イコライザー: 7 バンド（両端はシェルフ、間はピーキング）。±12 dB。
// 持ち上げた分だけ自動でプリアンプを下げ、音割れを防ぐ。設定は localStorage に残す。

export interface Band { type: BiquadFilterType; freq: number; label: string }
export const BANDS: Band[] = [
  { type: "lowshelf", freq: 60, label: "60" },
  { type: "peaking", freq: 150, label: "150" },
  { type: "peaking", freq: 400, label: "400" },
  { type: "peaking", freq: 1000, label: "1k" },
  { type: "peaking", freq: 2400, label: "2.4k" },
  { type: "peaking", freq: 6000, label: "6k" },
  { type: "highshelf", freq: 12000, label: "12k" },
];
export const MAX_DB = 12;
const Q = 1.1;
const KEY = "kona.eq";

type Listener = () => void;

export class Eq {
  gains: number[] = BANDS.map(() => 0);
  on = true;
  private filters: BiquadFilterNode[] = [];
  private pre?: GainNode;
  private ctx?: BaseAudioContext;
  private listeners = new Set<Listener>();
  // 応答カーブを描くための計算用（再生前でも描けるように、音を出さないコンテキストで作る）
  private probe = new OfflineAudioContext(1, 1, 48000);
  private probeFilters = BANDS.map(b => this.makeFilter(this.probe, b));

  constructor() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (s && Array.isArray(s.gains) && s.gains.length === BANDS.length) this.gains = s.gains.map((g: number) => clamp(Number(g) || 0));
      if (s && typeof s.on === "boolean") this.on = s.on;
    } catch { /* ignore */ }
  }

  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** 再生グラフに挿す。input → フィルタ… → プリアンプ → output */
  attach(ctx: AudioContext): { input: AudioNode; output: AudioNode } {
    this.ctx = ctx;
    this.filters = BANDS.map(b => this.makeFilter(ctx, b));
    this.pre = ctx.createGain();
    for (let i = 1; i < this.filters.length; i++) this.filters[i - 1].connect(this.filters[i]);
    this.filters[this.filters.length - 1].connect(this.pre);
    this.apply();
    return { input: this.filters[0], output: this.pre };
  }

  set(i: number, db: number) { this.gains[i] = clamp(Math.round(db * 2) / 2); this.changed(); }
  toggle() { this.on = !this.on; this.changed(); }
  reset() { this.gains = BANDS.map(() => 0); this.changed(); }
  /** プリセットを当てる（オフなら入れる） */
  setAll(gains: number[]) { this.gains = BANDS.map((_, i) => clamp(gains[i] ?? 0)); this.on = true; this.changed(); }
  get flat() { return this.gains.every(g => g === 0); }
  /** 持ち上げた最大量だけ下げる（オフのときは 0） */
  get preamp() { return this.on ? -Math.max(0, ...this.gains) : 0; }

  /** 周波数ごとの合成ゲイン（dB）。プリアンプ込み */
  response(freqs: Float32Array<ArrayBuffer>): Float32Array {
    const out = new Float32Array(freqs.length);
    const mag = new Float32Array(freqs.length), ph = new Float32Array(freqs.length);
    this.probeFilters.forEach((f, i) => {
      f.gain.value = this.on ? this.gains[i] : 0;
      f.getFrequencyResponse(freqs, mag, ph);
      for (let k = 0; k < out.length; k++) out[k] += 20 * Math.log10(mag[k] || 1e-6);
    });
    for (let k = 0; k < out.length; k++) out[k] += this.preamp;
    return out;
  }

  private makeFilter(ctx: BaseAudioContext, b: Band) {
    const f = ctx.createBiquadFilter();
    f.type = b.type; f.frequency.value = b.freq; f.Q.value = b.type === "peaking" ? Q : 0.7;
    return f;
  }
  private changed() {
    this.apply();
    try { localStorage.setItem(KEY, JSON.stringify({ on: this.on, gains: this.gains })); } catch { /* ignore */ }
    this.listeners.forEach(fn => fn());
  }
  private apply() {
    if (!this.ctx || !this.pre) return;
    const t = this.ctx.currentTime;
    this.filters.forEach((f, i) => f.gain.setTargetAtTime(this.on ? this.gains[i] : 0, t, 0.02));
    this.pre.gain.setTargetAtTime(10 ** (this.preamp / 20), t, 0.02);
  }
}

const clamp = (db: number) => Math.max(-MAX_DB, Math.min(MAX_DB, db));

// ---------- プリセット: 用意したものと、自分で名前をつけて残したもの（kona.eqPresets） ----------
export interface EqPreset { name: string; gains: number[]; builtin?: boolean }
export const BUILTIN_PRESETS: EqPreset[] = [
  { name: "フラット", gains: [0, 0, 0, 0, 0, 0, 0] },
  { name: "低音を足す", gains: [5, 3.5, 1, 0, 0, 0, 0] },
  { name: "声を前に", gains: [-2, -1, 0, 2.5, 3, 1, 0] },
  { name: "明るく", gains: [0, 0, 0, 0, 1.5, 3, 4] },
  { name: "夜の小さな音", gains: [4.5, 2, 0, -.5, 0, 1.5, 3] },
  { name: "古いレコード", gains: [-4, 0, 2, 3, 1, -3, -6] },
].map(p => ({ ...p, builtin: true }));
const PRESET_KEY = "kona.eqPresets";
export function userPresets(): EqPreset[] {
  try {
    const v = JSON.parse(localStorage.getItem(PRESET_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter(p => typeof p?.name === "string" && Array.isArray(p.gains)).map(p => ({ name: p.name, gains: p.gains.map((g: unknown) => clamp(Number(g) || 0)) })) : [];
  } catch { return []; }
}
const saveUser = (list: EqPreset[]) => { try { localStorage.setItem(PRESET_KEY, JSON.stringify(list)); } catch { /* ignore */ } };
/** 同じ名前があれば上書きする */
export function savePreset(name: string, gains: number[]) {
  const list = userPresets().filter(p => p.name !== name);
  list.push({ name, gains: [...gains] });
  saveUser(list);
}
export const deletePreset = (name: string) => saveUser(userPresets().filter(p => p.name !== name));
/** いまの形と同じプリセットの名前 */
export const presetMatching = (gains: number[]) => [...BUILTIN_PRESETS, ...userPresets()].find(p => p.gains.every((g, i) => g === gains[i]))?.name;
