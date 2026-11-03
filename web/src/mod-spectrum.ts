// スペクトラム: いま鳴っている音の周波数ごとの強さを描く。
import { t as tx } from "./i18n";
// 並べ方は「円」（真上から時計回りに一周で低音 → 高音）と「直線」（左から右へ低音 → 高音）。
// 円を左右の鏡写しにすると、左右がほぼ同じ音のステレオでは形がいつも対称になって単調なので、一周に帯域を並べる。
// 一周の継ぎ目（真上）は、高音の端を低音の端へなだらかにつないで段差を見せない。
// 形は「バー」（波形と同じ細い柱）と「波」（イコライザーと同じ灯る線）。向きは外側・内側・両側（直線では上・下・上下）。
// 音を見せるだけのモジュールなので、再生位置の表示やシークは持たない（それは再生中・波形の役目）

import { ctx, css, fit, everyFrame, stored, inCopy } from "./modctx";

export interface SpectrumPrefs {
  style: "bars" | "wave";
  shape: "circle" | "line";
  dir: "out" | "in" | "both";
  size: number;               // 円の大きさ（モジュールに収まる最大に対する比率 0.3〜1）
}
const KEY = "kona.spectrum";
const parsePrefs = (raw: string | null): SpectrumPrefs => {
  const p: SpectrumPrefs = { style: "bars", shape: "circle", dir: "out", size: .7 };
  try {
    const s = JSON.parse(raw ?? "{}");
    if (s.style === "wave") p.style = "wave";
    if (s.shape === "line") p.shape = "line";
    if (s.dir === "in" || s.dir === "both") p.dir = s.dir;
    if (typeof s.size === "number") p.size = Math.max(.3, Math.min(1, s.size));
  } catch { /* 既定のまま */ }
  return p;
};
const prefs: SpectrumPrefs = parsePrefs((() => { try { return localStorage.getItem(KEY); } catch { return null; } })());
let version = 0;   // 設定が変わったら描き直す
export const spectrumPrefs = (): Readonly<SpectrumPrefs> => prefs;
export function setSpectrumPrefs(p: Partial<SpectrumPrefs>) {
  Object.assign(prefs, p); version++;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* 保存できなくても動く */ }
}

const LO = 40, HI = 16000;   // 描く周波数の範囲（Hz）
const FLOOR = -88, RANGE = 58; // この dB より小さい音は描かない / これだけの幅を 0〜1 に
const TILT = 3;              // 1 オクターブごとに足す dB（高音ほど小さい音楽のスペクトルを平らに見せる）
const GATE = .1;             // 細かいノイズを落とす下限
const SEAM = .06;            // 円の継ぎ目で、高音の端を低音の端へつなぐ幅（一周に対する比率）

export function mountSpectrum(body: HTMLElement) {
  const player = ctx().player;
  // 部屋の写しでは、ホストの描き方で描く
  const look = inCopy() ? parsePrefs(stored(KEY)) : prefs;
  body.innerHTML = `
    <div class="spec">
      <canvas class="spec-canvas" aria-label="${tx("スペクトラム")}"></canvas>
    </div>`;
  const root = body.querySelector<HTMLElement>(".spec")!;
  const canvas = root.querySelector<HTMLCanvasElement>("canvas")!;
  // 表示中の強さ。急に跳ねず、ゆっくり沈む
  let vals = new Float32Array(0), raw = new Float32Array(0);
  let last = performance.now(), quiet = false, shown = -1;

  // n 本に分け、それぞれの周波数帯の強さ（0〜1）を求める
  const measure = (n: number) => {
    const db = player.spectrum(), sr = player.sampleRate ?? 48000;
    if (raw.length !== n) raw = new Float32Array(n);
    if (!db) { raw.fill(0); return; }
    const hz = sr / 2 / db.length;
    for (let k = 0; k < n; k++) {
      const f0 = LO * (HI / LO) ** (k / n), f1 = LO * (HI / LO) ** ((k + 1) / n);
      const b0 = f0 / hz, b1 = f1 / hz;
      let v: number;
      if (b1 - b0 < 1) {
        // 低音は 1 本の帯が bin より細いので、bin の間を補う
        const c = (b0 + b1) / 2, i = Math.floor(c), t = c - i;
        v = db[i] * (1 - t) + db[Math.min(db.length - 1, i + 1)] * t;
      } else {
        let sum = 0, cnt = 0;
        for (let i = Math.floor(b0); i < Math.min(db.length, Math.ceil(b1)); i++) { sum += 10 ** (db[i] / 10); cnt++; }
        v = 10 * Math.log10(sum / Math.max(1, cnt) + 1e-12);
      }
      v += TILT * Math.log2(Math.sqrt(f0 * f1) / 1000);
      const x = Math.max(0, Math.min(1, (v - FLOOR) / RANGE));
      raw[k] = Number.isFinite(x) ? Math.max(0, (x - GATE) / (1 - GATE)) ** 1.4 : 0;
    }
    // 隣どうしをならして、ちらつきを抑える
    for (let k = 0; k < n; k++) {
      const a = raw[Math.max(0, k - 1)], c = raw[Math.min(n - 1, k + 1)];
      raw[k] = raw[k] * .5 + (a + c) * .25;
    }
  };

  const draw = () => {
    const resized = fit(canvas);
    const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
    const w = canvas.width, h = canvas.height, d = devicePixelRatio || 1;
    const { style, shape, dir, size } = look;

    // 隠れている間（ホームとライブラリの切り替えの途中など）は大きさが 0 になるので、描かずに待つ
    if (w < 24 * d || h < 24 * d) { quiet = false; return; }
    // 形の決まり: 土台（円の半径 / 直線の高さ）、伸びる長さ、点の置き方
    const cx = w / 2, cy = h / 2, m = Math.min(w, h) / 2 - 4 * d;
    const reachMax = shape === "circle" ? m * size : 0;
    const r = shape === "circle" ? (dir === "out" ? reachMax * .55 : dir === "in" ? reachMax : reachMax * .7) : 0;
    const len = shape === "circle"
      ? (dir === "out" ? reachMax - r : dir === "in" ? r * .6 : reachMax - r)
      : (dir === "both" ? h / 2 - 3 * d : h - 6 * d);
    const baseY = dir === "out" ? h : dir === "in" ? 0 : h / 2;   // 直線の土台
    // a: 曲の中の位置と同じ向きの 0〜1（円は角度、直線は左から）、o: 土台からの距離（外側・上が正）
    const at = (a: number, o: number): [number, number] => {
      if (shape === "line") return [a * w, baseY - o];
      const t = a * Math.PI * 2 - Math.PI / 2, rr = r + o;
      return [cx + Math.cos(t) * rr, cy + Math.sin(t) * rr];
    };

    // 柱の数は土台の長さに合わせる（波形と同じ 2px の柱と 1px の隙間）
    const along = shape === "circle" ? Math.PI * 2 * r : w;
    const total = Math.max(16, Math.min(shape === "circle" ? 320 : 480, Math.floor(along / (3 * d))));
    const n = total;
    if (vals.length !== n) { const old = vals; vals = new Float32Array(n); for (let k = 0; k < n; k++) vals[k] = old.length ? old[Math.floor((k / n) * old.length)] : 0; }
    measure(n);
    // 上がるときは素早く、沈むときはゆっくり（止めたら静かに沈む）
    const up = 1 - Math.exp(-dt / .05), down = 1 - Math.exp(-dt / .4);
    let moving = false;
    for (let k = 0; k < n; k++) {
      const diff = raw[k] - vals[k];
      if (Math.abs(diff) > .002) { vals[k] += diff * (diff > 0 ? up : down); moving = true; } else vals[k] = raw[k];
    }
    const changed = shown !== version; shown = version;
    if (!moving && !resized && !changed && quiet) return;
    quiet = !moving;

    // 並べる点（位置 a と強さ v）。円は一周の終わり（高音の端）を始まり（低音の端）へ寄せて、真上の継ぎ目をなめらかにする
    const pts: [number, number][] = [];
    const seam = shape === "circle" ? Math.max(3, Math.round(n * SEAM)) : 0;
    for (let k = 0; k < n; k++) {
      let v = vals[k];
      if (k >= n - seam) { const t = (k - (n - seam) + 1) / (seam + 1), e = t * t * (3 - 2 * t); v = v * (1 - e) + vals[0] * e; }
      pts.push([(k + .5) / n, v]);
    }

    const g = canvas.getContext("2d")!;
    g.clearRect(0, 0, w, h);
    const accent = css("--accent", "#f0b35e"), dim = css("--muted", "#777");
    const gap = dir === "both" ? 0 : 2 * d;   // 土台と柱の隙間
    const sign = dir === "in" ? -1 : 1;
    const base = (from: number, to: number) => {
      g.beginPath();
      if (shape === "circle") { const t = (a: number) => a * Math.PI * 2 - Math.PI / 2; g.arc(cx, cy, r, t(from), t(to)); }
      else { g.moveTo(from * w, baseY); g.lineTo(to * w, baseY); }
      g.stroke();
    };
    // 土台は薄く（直線で上下に出すときは、真ん中の線は引かない）
    if (shape === "circle" || dir !== "both") { g.lineWidth = d; g.strokeStyle = dim; g.globalAlpha = .45; base(0, 1); }

    if (style === "bars") {
      g.lineWidth = 2 * d; g.lineCap = "butt";
      for (const [a, v] of pts) {
        if (v <= .001) continue;
        const l = Math.max(d, v * len);
        const [o0, o1] = dir === "both" ? [-l, l] : [sign * gap, sign * (gap + l)];
        const p = at(a, o0), q = at(a, o1);
        g.strokeStyle = accent; g.globalAlpha = 1;
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
      }
    } else {
      // 波: 強さをふくらみにした線。角を丸めるため、点の中間を通る二次曲線でつなぐ
      const closed = shape === "circle";
      const curve = (s: number) => {
        const xy = pts.map(([a, v]) => at(a, s * v * len));
        const path = new Path2D(), mid = (i: number) => { const p = xy[i % xy.length], q = xy[(i + 1) % xy.length]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
        if (closed) {
          const m0 = mid(xy.length - 1); path.moveTo(m0[0], m0[1]);
          for (let i = 0; i < xy.length; i++) { const p = mid(i); path.quadraticCurveTo(xy[i][0], xy[i][1], p[0], p[1]); }
          path.closePath();
        } else {
          const s0 = at(0, 0); path.moveTo(s0[0], s0[1]); path.lineTo(xy[0][0], xy[0][1]);
          for (let i = 0; i < xy.length - 1; i++) { const p = mid(i); path.quadraticCurveTo(xy[i][0], xy[i][1], p[0], p[1]); }
          const e = at(1, 0); path.lineTo(xy[xy.length - 1][0], xy[xy.length - 1][1]); path.lineTo(e[0], e[1]);
        }
        // 土台との間を塗る形
        const fill = new Path2D(path);
        if (closed) fill.arc(cx, cy, r, 0, Math.PI * 2, true); else fill.closePath();
        return { path, fill };
      };
      const sides = dir === "both" ? [1, -1] : [sign];
      const curves = sides.map(curve);
      let grad: CanvasGradient;
      if (shape === "circle") {
        const r0 = dir === "in" ? r - len : dir === "both" ? r - len : r, r1 = dir === "in" ? r : r + len;
        grad = g.createRadialGradient(cx, cy, Math.max(0, r0), cx, cy, r1);
        if (dir === "in") { grad.addColorStop(0, "transparent"); grad.addColorStop(1, accent); }
        else if (dir === "both") { grad.addColorStop(0, "transparent"); grad.addColorStop(.5, accent); grad.addColorStop(1, "transparent"); }
        else { grad.addColorStop(0, accent); grad.addColorStop(1, "transparent"); }
      } else {
        grad = g.createLinearGradient(0, baseY - len, 0, baseY + len);
        grad.addColorStop(0, "transparent"); grad.addColorStop(.5, accent); grad.addColorStop(1, "transparent");
      }
      g.save();
      g.globalAlpha = .14; g.fillStyle = grad;
      for (const c of curves) g.fill(c.fill, "evenodd");
      g.globalAlpha = 1; g.strokeStyle = accent; g.lineWidth = 1.5 * d; g.shadowColor = accent; g.shadowBlur = 10 * d;
      for (const c of curves) g.stroke(c.path);
      g.restore();
    }
    g.globalAlpha = 1;
  };

  player.on(() => { quiet = false; });
  // 表示されている間だけ描き続ける（止まっていて動きがなければ何もしない）
  everyFrame(root, draw);
}
