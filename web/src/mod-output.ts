// 出力: 出力先の機器、音量の正規化（ReplayGain）、いまの信号の流れ

import { ctx, esc } from "./modctx";
import type { Normalize } from "./player";
import { NOISES, noiseLevel, setNoiseLevel, onNoise } from "./noise";

const NORMS: { v: Normalize; label: string }[] = [
  { v: "off", label: "しない" }, { v: "track", label: "曲ごと" }, { v: "album", label: "アルバムごと" },
];

export function mountOutput(body: HTMLElement) {
  body.innerHTML = `
    <div class="out">
      <label class="out-field"><span>出力先</span><select class="out-sink"></select></label>
      <div class="out-field"><span>音量の正規化</span>
        <div class="out-seg" role="radiogroup" aria-label="音量の正規化">
          ${NORMS.map(n => `<button role="radio" data-v="${n.v}">${n.label}</button>`).join("")}
        </div>
      </div>
      <p class="out-path" aria-label="信号の流れ"></p>
      <div class="out-noise" role="group" aria-label="重ねる音">
        <span class="out-noise-head">重ねる音</span>
        ${NOISES.map(n => `<label class="out-noise-row"><span>${n.label}</span><input type="range" min="0" max="100" step="1" data-k="${n.key}" aria-label="${n.label}の音量"></label>`).join("")}
      </div>
    </div>`;
  const root = body.querySelector<HTMLElement>(".out")!;
  const sink = root.querySelector<HTMLSelectElement>(".out-sink")!;
  const path = root.querySelector<HTMLElement>(".out-path")!;
  const p = ctx().player;

  const fillSinks = async () => {
    let outs: MediaDeviceInfo[] = [];
    try { outs = (await navigator.mediaDevices?.enumerateDevices() ?? []).filter(d => d.kind === "audiooutput" && d.deviceId !== "default"); } catch { /* ignore */ }
    sink.innerHTML = `<option value="">既定の出力</option>` + outs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `出力 ${i + 1}`)}</option>`).join("");
    sink.value = p.sink;
    sink.disabled = !p.canChooseSink || !outs.length;
  };
  sink.onchange = () => p.setSink(sink.value);
  navigator.mediaDevices?.addEventListener?.("devicechange", fillSinks);

  root.querySelectorAll<HTMLButtonElement>(".out-seg button").forEach(b => b.onclick = () => p.setNormalize(b.dataset.v as Normalize));

  // 重ねる音: つまみを動かすとすぐに音量が変わる。ダブルクリックで 0
  const knobs = [...root.querySelectorAll<HTMLInputElement>(".out-noise input")];
  const paintNoise = () => knobs.forEach(k => {
    const v = noiseLevel(k.dataset.k as typeof NOISES[number]["key"]);
    if (document.activeElement !== k) k.value = String(Math.round(v * 100));
    k.style.setProperty("--fill", `${v * 100}%`);
    k.closest(".out-noise-row")!.classList.toggle("on", v > 0);
  });
  knobs.forEach(k => {
    k.oninput = () => setNoiseLevel(k.dataset.k as typeof NOISES[number]["key"], Number(k.value) / 100);
    k.ondblclick = () => setNoiseLevel(k.dataset.k as typeof NOISES[number]["key"], 0);
  });
  const offNoise = onNoise(() => { if (!root.isConnected) { offNoise(); return; } paintNoise(); });
  paintNoise();

  const sync = () => {
    root.querySelectorAll<HTMLButtonElement>(".out-seg button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.v === p.normalize)));
    const t = p.track, rate = p.sampleRate;
    const src = t?.format || (t ? "読み込み中" : "—");
    const norm = p.normalize === "off" ? "" : p.normGain === undefined ? "正規化のタグなし" : `正規化 ${p.normGain > 0 ? "+" : ""}${p.normGain.toFixed(1)} dB`;
    const eq = p.eq.on && !p.eq.flat ? `EQ ${p.eq.preamp.toFixed(1)} dB` : "";
    const mix = NOISES.filter(n => noiseLevel(n.key) > 0).map(n => n.label).join("・");
    const steps = [src, norm, eq, mix ? `＋ ${mix}` : "", "音量", rate ? `出力 ${+(rate / 1000).toFixed(1)}kHz` : "出力"].filter(Boolean);
    path.innerHTML = steps.map(s => `<span>${esc(s)}</span>`).join(`<i aria-hidden="true">→</i>`);
  };
  p.on(sync);
  p.eq.subscribe(sync);
  onNoise(sync);
  fillSinks(); sync();
}
