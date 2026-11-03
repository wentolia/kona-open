// 再生中・棚以外のモジュール。ここでは種類ごとの入口と、イコライザー・波形を持つ

import type { Player } from "./player";
import type { ModuleType } from "./shelves";
import { BANDS, MAX_DB, type Eq } from "./eq";
import { ctx, fmt, css, fit, everyFrame } from "./modctx";
import { mountClock } from "./mod-clock";
import { mountInfo } from "./mod-info";
import { mountLog } from "./mod-log";
import { mountOutput } from "./mod-output";
import { mountTurntable } from "./mod-turntable";
import { mountWindow } from "./mod-window";
import { mountDistance } from "./mod-distance";
import { mountSpectrum } from "./mod-spectrum";
import { mountCatTower, mountScratcher, mountCatFood, mountCatBox } from "./mod-cat";
import { fileSig, getPeaks, putPeaks } from "./tagcache";

export function mountModule(type: ModuleType, body: HTMLElement) {
  const p = ctx().player;
  switch (type) {
    case "eq": return mountEq(body, p.eq);
    case "waveform": return mountWave(body, p);
    case "clock": return mountClock(body);
    case "info": return mountInfo(body);
    case "log": return mountLog(body);
    case "output": return mountOutput(body);
    case "turntable": return mountTurntable(body);
    case "window": return mountWindow(body);
    case "distance": return mountDistance(body);
    case "spectrum": return mountSpectrum(body);
    case "cattower": return mountCatTower(body);
    case "scratcher": return mountScratcher(body);
    case "catfood": return mountCatFood(body);
    case "catbox": return mountCatBox(body);
  }
}

const fmtDb = (db: number) => (db > 0 ? "+" : db < 0 ? "−" : "±") + Math.abs(db).toFixed(Math.abs(db) % 1 ? 1 : 0);


// ---------- イコライザー ----------
// 縦のフェーダーを7本並べ、その奥に合成した応答カーブを灯す

export function mountEq(body: HTMLElement, eq: Eq) {
  body.innerHTML = `
    <div class="eq">
      <p class="dsp-off">Spotify の曲では使えません</p>
      <div class="eq-bar">
        <button class="eq-power" aria-pressed="${eq.on}"><i></i>EQ</button>
        <span class="eq-pre"></span>
        <button class="eq-flat">フラット</button>
      </div>
      <div class="eq-stage">
        <canvas class="eq-curve" aria-hidden="true"></canvas>
        <div class="eq-bands">
          ${BANDS.map((b, i) => `
            <div class="eq-band">
              <div class="eq-slot" role="slider" tabindex="0" data-i="${i}" aria-label="${b.label} Hz" aria-valuemin="${-MAX_DB}" aria-valuemax="${MAX_DB}"><span class="eq-cap"></span></div>
              <span class="eq-freq">${b.label}</span>
            </div>`).join("")}
        </div>
      </div>
    </div>`;
  const root = body.querySelector<HTMLElement>(".eq")!;
  const canvas = root.querySelector<HTMLCanvasElement>(".eq-curve")!;
  const slots = [...root.querySelectorAll<HTMLElement>(".eq-slot")];
  const power = root.querySelector<HTMLButtonElement>(".eq-power")!;

  power.onclick = () => eq.toggle();
  root.querySelector<HTMLButtonElement>(".eq-flat")!.onclick = () => eq.reset();

  // フェーダー: 溝のどこを押してもそこへ動く。ダブルクリックで 0 dB、矢印キーで 0.5 dB ずつ
  const dbAt = (slot: HTMLElement, y: number) => {
    const r = slot.getBoundingClientRect();
    return MAX_DB - ((y - r.top) / r.height) * MAX_DB * 2;
  };
  slots.forEach(slot => {
    const i = Number(slot.dataset.i);
    slot.addEventListener("pointerdown", e => {
      slot.setPointerCapture(e.pointerId); slot.focus();
      eq.set(i, dbAt(slot, e.clientY));
      const move = (ev: PointerEvent) => eq.set(i, dbAt(slot, ev.clientY));
      const up = () => { slot.removeEventListener("pointermove", move); slot.removeEventListener("pointerup", up); root.classList.remove("eq-dragging"); };
      slot.addEventListener("pointermove", move); slot.addEventListener("pointerup", up);
      root.classList.add("eq-dragging");
    });
    slot.addEventListener("dblclick", () => eq.set(i, 0));
    slot.addEventListener("keydown", e => {
      const step = { ArrowUp: 0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowLeft: -0.5, PageUp: 3, PageDown: -3 }[e.key];
      if (step !== undefined) { e.preventDefault(); eq.set(i, eq.gains[i] + step); }
      else if (e.key === "Home" || e.key === "0") { e.preventDefault(); eq.set(i, 0); }
    });
  });

  // 横軸: 各フェーダーの真上がそのバンドの周波数になるよう、バンドの間を対数で補う
  const freqAt = (x: number, w: number) => {
    const centers = BANDS.map((_, i) => ((i + 0.5) / BANDS.length) * w);
    const pts = [[0, 20], ...centers.map((c, i) => [c, BANDS[i].freq]), [w, 20000]];
    for (let k = 1; k < pts.length; k++) {
      if (x <= pts[k][0]) {
        const [x0, f0] = pts[k - 1], [x1, f1] = pts[k];
        const t = (x - x0) / Math.max(1e-6, x1 - x0);
        return Math.exp(Math.log(f0) + (Math.log(f1) - Math.log(f0)) * t);
      }
    }
    return 20000;
  };

  const draw = () => {
    fit(canvas);
    const g = canvas.getContext("2d")!, w = canvas.width, h = canvas.height, d = devicePixelRatio || 1;
    g.clearRect(0, 0, w, h);
    const pad = 10 * d, y = (db: number) => pad + (1 - (db + MAX_DB) / (MAX_DB * 2)) * (h - pad * 2);
    const accent = css("--accent", "#f0b35e"), line = css("--line", "#444");
    // 0 dB と ±6 dB の目安
    g.strokeStyle = line; g.lineWidth = d; g.setLineDash([2 * d, 4 * d]);
    for (const db of [-6, 6]) { g.beginPath(); g.moveTo(0, y(db)); g.lineTo(w, y(db)); g.stroke(); }
    g.setLineDash([]); g.globalAlpha = 0.9; g.beginPath(); g.moveTo(0, y(0)); g.lineTo(w, y(0)); g.stroke(); g.globalAlpha = 1;
    // 応答カーブ
    const n = Math.max(2, Math.round(w / (2 * d)));
    const freqs = new Float32Array(n);
    for (let k = 0; k < n; k++) freqs[k] = freqAt((k / (n - 1)) * w, w);
    const resp = eq.response(freqs);
    const path = new Path2D();
    for (let k = 0; k < n; k++) { const px = (k / (n - 1)) * w, py = y(Math.max(-MAX_DB, Math.min(MAX_DB, resp[k]))); if (k) path.lineTo(px, py); else path.moveTo(px, py); }
    const fill = new Path2D(path); fill.lineTo(w, y(0)); fill.lineTo(0, y(0)); fill.closePath();
    const grad = g.createLinearGradient(0, pad, 0, h - pad);
    grad.addColorStop(0, accent); grad.addColorStop(0.5, "transparent"); grad.addColorStop(1, accent);
    g.globalAlpha = eq.on ? 0.18 : 0.06; g.fillStyle = grad; g.fill(fill);
    g.globalAlpha = eq.on ? 1 : 0.35; g.strokeStyle = accent; g.lineWidth = 1.5 * d;
    g.shadowColor = accent; g.shadowBlur = eq.on ? 10 * d : 0; g.stroke(path);
    g.shadowBlur = 0; g.globalAlpha = 1;
  };

  const sync = () => {
    root.classList.toggle("eq-off", !eq.on);
    power.setAttribute("aria-pressed", String(eq.on));
    const pre = eq.preamp;
    root.querySelector(".eq-pre")!.textContent = pre ? `プリアンプ ${fmtDb(pre)} dB` : "";
    slots.forEach((slot, i) => {
      const db = eq.gains[i];
      slot.style.setProperty("--v", String((db + MAX_DB) / (MAX_DB * 2)));
      slot.setAttribute("aria-valuenow", String(db));
      slot.setAttribute("aria-valuetext", `${fmtDb(db)} dB`);
      slot.title = `${BANDS[i].label} Hz  ${fmtDb(db)} dB`;
      slot.classList.toggle("eq-moved", db !== 0);
    });
    root.querySelector<HTMLButtonElement>(".eq-flat")!.disabled = eq.flat;
    draw();
  };
  const off = eq.subscribe(sync);
  new ResizeObserver(() => { if (!root.isConnected) { off(); return; } draw(); }).observe(canvas);
  sync();
}

// ---------- 波形 ----------
// 曲全体の波形を棚板に立つ細い柱で描く。聴いた分は灯り、カーソルの位置に時刻、クリックでそこへ

const peaksCache = new Map<string, Float32Array>();
const POINTS = 1600;

async function peaksOf(file: File, key: string, path: string): Promise<Float32Array> {
  const hit = peaksCache.get(key);
  if (hit) return hit;
  // 前に描いた曲なら、端末に残した形を使う（デコードしない）
  const sig = fileSig(path, file);
  const saved = await getPeaks(sig);
  if (saved?.length === POINTS) {
    const out = Float32Array.from(saved, v => v / 255);
    remember(key, out);
    return out;
  }
  // 波形を見るだけなので、低いサンプルレートでデコードしてメモリを抑える
  const ctx = new OfflineAudioContext(1, 1, 8000);
  const buf = await ctx.decodeAudioData(await file.arrayBuffer());
  const chs = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const out = new Float32Array(POINTS), per = Math.max(1, Math.floor(buf.length / POINTS));
  let top = 0;
  for (let p = 0; p < POINTS; p++) {
    let sum = 0, peak = 0;
    const from = p * per, to = Math.min(buf.length, from + per);
    for (let s = from; s < to; s++) {
      let v = 0;
      for (const ch of chs) v += Math.abs(ch[s]);
      v /= chs.length; sum += v * v; if (v > peak) peak = v;
    }
    // 尖りすぎないよう、ピークと RMS の中間をとる
    out[p] = (peak + Math.sqrt(sum / Math.max(1, to - from))) / 2;
    if (out[p] > top) top = out[p];
  }
  if (top > 0) for (let p = 0; p < POINTS; p++) out[p] /= top;
  remember(key, out);
  putPeaks(sig, Uint8Array.from(out, v => Math.round(v * 255)));
  return out;
}
/** いま流れている曲の波形（リスニングパーティーで参加者に送る）。読めなければ undefined */
export async function currentPeaks(player: Player): Promise<Float32Array | undefined> {
  const a = player.album, t = player.track;
  if (!a || !t || a.remote) return undefined;
  const key = `${a.key}#${player.index}`;
  try { const file = await player.trackFile(); return file ? await peaksOf(file, key, t.entry.path) : undefined; } catch { return undefined; }
}
function remember(key: string, peaks: Float32Array) {
  if (peaksCache.size > 24) peaksCache.delete(peaksCache.keys().next().value!);
  peaksCache.set(key, peaks);
}

export function mountWave(body: HTMLElement, player: Player) {
  body.innerHTML = `
    <div class="wave">
      <canvas class="wave-canvas" aria-label="波形（クリックでその位置へ）"></canvas>
      <span class="wave-time"></span>
      <p class="dsp-off">Spotify の曲では波形を出せません</p>
    </div>`;
  const root = body.querySelector<HTMLElement>(".wave")!;
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  const time = root.querySelector<HTMLElement>(".wave-time")!;
  let peaks: Float32Array | undefined, loadedKey: string | undefined, hoverX: number | undefined, lastPos = -1, dirty = true;
  // 表示中の柱の高さ。曲が替わると、今の形から次の曲の形へゆっくり移る（パッと変わらない）
  let bars = new Float32Array(0), lit = 0, last = performance.now();

  const keyOf = () => player.album && player.track ? `${player.album.key}#${player.index}` : "";
  const load = async () => {
    const key = keyOf();
    if (key === loadedKey) return;
    loadedKey = key; peaks = undefined; dirty = true;
    
    if (!key) return;
    try {
      // リスニングパーティーの部屋の写しは、曲のファイルを持たないので、ホストから届いた形を使う
      const given = (player as Player & { peaks?(key: string): Promise<Float32Array | undefined> }).peaks;
      const path = player.track?.entry.path ?? key;
      const file = given ? undefined : await player.trackFile();
      const p = given ? await given.call(player, key) : file ? await peaksOf(file, key, path) : undefined;
      if (keyOf() !== key) return;
      peaks = p; dirty = true;
    } catch { /* 読めない曲は波形なし */ }
  };

  const draw = () => {
    const resized = fit(canvas);
    const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    const ratio = player.duration ? player.position / player.duration : 0;
    const g = canvas.getContext("2d")!, w = canvas.width, h = canvas.height, d = devicePixelRatio || 1;
    const bw = 2 * d, gap = 1 * d, n = Math.max(1, Math.floor(w / (bw + gap)));
    if (bars.length !== n) { const old = bars; bars = new Float32Array(n); for (let k = 0; k < n; k++) bars[k] = old.length ? old[Math.floor((k / n) * old.length)] : 0; dirty = true; }
    // 柱を目標の高さへ寄せる。読み込み中は低く沈んで待つ
    const ease = 1 - Math.exp(-dt / .14);
    let moving = false;
    for (let k = 0; k < n; k++) {
      const target = peaks ? peaks[Math.min(peaks.length - 1, Math.floor((k / n) * peaks.length))] : 0;
      const diff = target - bars[k];
      if (Math.abs(diff) > .002) { bars[k] += diff * ease; moving = true; } else bars[k] = target;
    }
    // 聴いた分の灯りも、曲が替わったときは端から端へ跳ばずに薄れて戻る
    const litTarget = ratio * n, jump = Math.abs(litTarget - lit) > n * .05;
    lit = jump ? lit + (litTarget - lit) * (1 - Math.exp(-dt / .18)) : litTarget;
    if (jump) moving = true;
    if (!dirty && !resized && !moving && Math.abs(ratio - lastPos) < 1e-4) return;
    dirty = false; lastPos = ratio;
    g.clearRect(0, 0, w, h);
    const accent = css("--accent", "#f0b35e"), dim = css("--muted", "#777");
    const base = h;   // 柱は下端（棚板の上）に立てる
    for (let k = 0; k < n; k++) {
      const v = bars[k];
      if (v <= .001) continue;
      const up = Math.max(d, v * (base - 6 * d)), x = k * (bw + gap);
      const on = k < lit;
      g.fillStyle = on ? accent : dim;
      g.globalAlpha = on ? 1 : 0.45;
      g.fillRect(x, base - up, bw, up);
    }
    g.globalAlpha = 1;
    // 再生位置とカーソル位置
    if (player.duration && peaks) { g.fillStyle = accent; g.shadowColor = accent; g.shadowBlur = 8 * d; g.fillRect(Math.round((lit / n) * w), 0, d, base); g.shadowBlur = 0; }
    if (hoverX !== undefined) { g.fillStyle = dim; g.globalAlpha = 0.8; g.fillRect(Math.round(hoverX * d), 0, d, base); g.globalAlpha = 1; }
  };

  const showTime = () => {
    if (hoverX === undefined || !player.duration) { time.textContent = player.duration ? `${fmt(player.position)} / ${fmt(player.duration)}` : ""; root.classList.remove("wave-hover"); return; }
    const r = canvas.getBoundingClientRect();
    time.textContent = fmt((hoverX / r.width) * player.duration);
    time.style.left = `${Math.max(0, Math.min(r.width - 40, hoverX + 6))}px`;
    root.classList.add("wave-hover");
  };

  canvas.addEventListener("pointermove", e => { hoverX = e.clientX - canvas.getBoundingClientRect().left; dirty = true; showTime(); });
  canvas.addEventListener("pointerleave", () => { hoverX = undefined; dirty = true; showTime(); });
  canvas.addEventListener("click", e => {
    const r = canvas.getBoundingClientRect();
    player.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    dirty = true;
  });

  player.on(() => { load(); dirty = true; });
  load();
  // 表示されている間だけ描き続ける（変化がなければ何もしない）
  everyFrame(root, () => { draw(); if (hoverX === undefined) showTime(); });
}
