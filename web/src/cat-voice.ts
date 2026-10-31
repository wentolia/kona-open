// 猫の声: 録音は持たず、その場で作る（ノコギリ波を口の形のフィルタに通して「ニャ」と鳴らす、喉は低いうなり）。
// 設定ページの「鳴き声」と音量に従う。音楽の音量や EQ とは別の小さな出口から鳴らす。

import { prefs } from "./prefs";

let ac: AudioContext | undefined;
const audio = () => {
  if (!ac) ac = new AudioContext();
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
};

export type Voice = "mew" | "meow" | "chirp" | "purr" | "grumble";

/** size: 体の大きさ（大きい子ほど低い声） */
export function catVoice(kind: Voice, size = 1) {
  const p = prefs();
  if (!p.catVoice || p.catVolume <= 0) return;
  try {
    const c = audio(), t = c.currentTime, vol = p.catVolume * .35, base = 1 / Math.max(.7, size);
    const out = c.createGain(); out.gain.value = vol; out.connect(c.destination);
    if (kind === "purr") return purr(c, out, t);
    // 声帯: ノコギリ波。高さは「ニャ」の上がって下がる形
    const len = kind === "mew" ? .32 : kind === "chirp" ? .16 : kind === "grumble" ? .5 : .62;
    const f0 = (kind === "grumble" ? 260 : kind === "chirp" ? 760 : 560) * base * (.94 + Math.random() * .12);
    const osc = c.createOscillator(); osc.type = "sawtooth";
    const f = osc.frequency;
    f.setValueAtTime(f0 * .85, t);
    if (kind === "chirp") f.exponentialRampToValueAtTime(f0 * 1.45, t + len);
    else { f.exponentialRampToValueAtTime(f0 * 1.35, t + len * .35); f.exponentialRampToValueAtTime(f0 * .8, t + len); }
    // 口: 「イ」から「ア」へ開く 2 つの共鳴
    const env = c.createGain(); env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + .04); env.gain.setValueAtTime(1, t + len * .6); env.gain.exponentialRampToValueAtTime(.001, t + len);
    const mouth = [[900, 2200, 9], [2600, 3600, 12]].map(([a, b, q]) => {
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = q;
      bp.frequency.setValueAtTime(a * base, t); bp.frequency.linearRampToValueAtTime(b * base, t + len * .45); bp.frequency.linearRampToValueAtTime(a * base, t + len);
      return bp;
    });
    const mix = c.createGain(); mix.gain.value = kind === "grumble" ? 1.4 : 2.2;
    osc.connect(env);
    for (const m of mouth) env.connect(m).connect(mix);
    mix.connect(out);
    osc.start(t); osc.stop(t + len + .05);
    osc.onended = () => out.disconnect();
  } catch { /* 音が出せない環境では黙っている */ }
}

// 喉を鳴らす: 25 回/秒ほどで揺れる、こもったノイズ
function purr(c: AudioContext, out: GainNode, t: number) {
  const len = 2.2, buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const s = i / c.sampleRate, am = .5 + .5 * Math.sin(2 * Math.PI * 24 * s) ** 2;
    const fade = Math.min(1, s / .3, (len - s) / .5);
    d[i] = (Math.random() * 2 - 1) * am * fade;
  }
  const src = c.createBufferSource(); src.buffer = buf;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180;
  const g = c.createGain(); g.gain.value = 3;
  src.connect(lp).connect(g).connect(out);
  src.start(t);
  src.onended = () => out.disconnect();
}
