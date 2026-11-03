// 窓の外の景色。空（色・太陽と月・雲）は window-sky.ts が描き、ここではその下の地上を描く
// 部屋の小物や棚と同じローポリ（平らな三角の面）で組み、写実に見せるために次の 4 つを効かせる:
//  - 光: 太陽（夜は月）の向きと色で、面ごとに明るさが決まる。日の当たらない面は空の色（青み）を受ける
//  - 空気遠近: 遠いものほど空の色に溶け、明暗の差が小さくなる。雨の日と朝は特に霞む
//  - 映り込み: 水面は面の向きに応じて空を映し、太陽や灯りの光の道ができる
//  - 色の階調: 同じ素材でも面ごとに少しずつ色がずれる（畑・屋根・木々）
// どの景色も、時刻（昼夜・朝夕の色）・季節（日付から）・雨に合わせて変わる
// 動かない部分は裏のキャンバスに描いて使い回し（光が変わる数分ごとに描き直す）、動く部分（波のきらめき・灯り・電車など）だけ毎フレーム描く

export type RGB = number[];
export const hex = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mixN = (a: string | RGB, b: string | RGB, t: number): RGB => {
  const x = typeof a === "string" ? hex(a) : a, y = typeof b === "string" ? hex(b) : b;
  return x.map((v, i) => v + (y[i] - v) * t);
};
export const rgba = (c: RGB, a = 1) => `rgba(${c.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(",")},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
export const mix = (a: string | RGB, b: string | RGB, t: number) => rgba(mixN(a, b, t));
/** 固定の乱数（同じ i, n なら毎回同じ値） */
export const rnd = (i: number, n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

export const SCENES = [
  { key: "city", label: "街" },
  { key: "sea", label: "海辺" },
  { key: "mountain", label: "山と森" },
  { key: "field", label: "田園" },
  { key: "snow", label: "雪国" },
  { key: "river", label: "川沿いの街" },
] as const;
export type SceneKey = typeof SCENES[number]["key"];
export const DAILY = "daily";

/** 日替わり: 日付から一つ選ぶ（前の日と同じにはならない） */
export function dailyScene(now = new Date()): SceneKey {
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 6e4) / 864e5);
  const pick = (k: number) => Math.floor(rnd(k, 77) * SCENES.length);
  let i = pick(day);
  if (i === pick(day - 1)) i = (i + 1) % SCENES.length;
  return SCENES[i].key;
}

/** 季節の重み（合計 1）。春・夏・秋・冬の真ん中を 4/15・7/25・11/5・1/20 として、間はなめらかに移る */
export interface Season { sp: number; su: number; au: number; wi: number; doy: number }
export function seasonAt(now: Date): Season {
  const doy = (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 864e5;
  const C = [105, 206, 309, 20], w = C.map((c, i) => {
    const gap = Math.min(...C.filter((_, j) => j !== i).map(o => Math.min(Math.abs(o - c), 365 - Math.abs(o - c))));
    const dd = Math.min(Math.abs(doy - c), 365 - Math.abs(doy - c));
    return Math.max(0, 1 - dd / (gap * 1.15)) ** 1.5;
  });
  const s = w.reduce((a, b) => a + b, 0) || 1;
  return { sp: w[0] / s, su: w[1] / s, au: w[2] / s, wi: w[3] / s, doy };
}

export interface Body { x: number; y: number; low: number }
export type V3 = [number, number, number];
/** 光: L は光の来る向き（x 右・y 上・z 手前）、key は直射の強さと色、amb は空からの回り込み（どちらも 0〜1 強の掛け算）、haze は霞の色 */
export interface Light { L: V3; key: RGB; amb: RGB; haze: RGB; dens: number }
export interface View {
  g: CanvasRenderingContext2D; d: number; t: number; h: number;
  X: (u: number) => number; Y: (v: number) => number; gw: number; gh: number;
  /** 塗る範囲（窓の開口の左右と下端） */
  x0: number; x1: number; y1: number;
  night: number; day: number; wet: number;
  top: RGB; bottom: RGB; accent: string; calm: boolean;
  season: Season; sun: Body | null; moon: Body | null;
  lt: Light;
}

// ---------- 光と面 ----------
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const unit = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** いまの光を決める。太陽が出ていれば太陽、夜は月。雨の日は直射が消え、空からの光だけになる */
export function lightOf(V: Omit<View, "lt">): Light {
  const b = V.sun ?? V.moon, wet = V.wet;
  let L: V3 = [0, 1, .15];
  if (b) { const u = (b.x - V.X(0)) / V.gw, el = 1 - b.low; L = unit([(u - .5) * 1.6, .1 + el * 1.25, .12]); }
  let key: RGB = [0, 0, 0];
  if (V.sun) {
    const low = V.sun.low, k = (1 - .88 * wet) * (1 - .45 * low ** 4);
    key = mixN([1.02, .97, .86], [1.1, .6, .32], low ** 1.8).map(v => v * k);
  } else if (V.moon) key = [.17, .2, .29].map(v => v * (1 - .75 * wet) * V.night);
  // 空からの光: 空の色をそのまま受ける（日陰は青く、夕方は赤く）。夜も真っ暗にはしない
  const sky = mixN(V.top, V.bottom, .5).map(v => v / 255);
  let amb = sky.map((v, i) => Math.max(v * .95 + .1 * V.day, [.075, .09, .14][i]));
  if (wet > 0) { const m = (amb[0] + amb[1] + amb[2]) / 3; amb = mixN(amb, [m * 1.15, m * 1.17, m * 1.22], wet * .8); }
  const haze = mixN(V.bottom, V.top, .18);
  const morning = bell(V.h, 6.8, 1.6);
  return { L, key, amb, haze, dens: .2 + .45 * wet + .12 * morning };
}
/** 遠さ dist の分だけ霞ませる */
export const fogged = (V: View, c: RGB, dist: number) => dist > 0 ? mixN(c, V.lt.haze, 1 - Math.exp(-dist * V.lt.dens)) : c;
/** 面の色: 素材の色 base を、向き n の面が受ける光で照らし、遠さ dist で霞ませる */
export function lit(V: View, base: string | RGB, n: V3, dist = 0, glow = 0): RGB {
  const c = typeof base === "string" ? hex(base) : base, { L, key, amb } = V.lt;
  const dif = Math.max(0, dot(n, L)), up = .6 + .32 * Math.max(0, n[1]);
  return fogged(V, c.map((v, i) => Math.min(255, v * (amb[i] * up * .9 + key[i] * dif * .72) + glow)), dist);
}
// よく使う面の向き
const N_FRONT: V3 = [0, .05, 1], N_UP: V3 = [0, 1, .1];
const nSide = (s: number): V3 => unit([s, .05, .45]);

/** 多角形を同じ色の細い縁で塗る（隣の面との継ぎ目を消す） */
export function face(g: CanvasRenderingContext2D, p: number[], c: RGB, a = 1) {
  g.fillStyle = rgba(c, a); g.beginPath(); g.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
  g.closePath(); g.fill();
  if (a >= 1) { g.strokeStyle = g.fillStyle; g.lineWidth = .7; g.lineJoin = "round"; g.stroke(); }
}
const fillPoly = (g: CanvasRenderingContext2D, p: number[]) => { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); };
function polyPath(g: CanvasRenderingContext2D, p: number[]) { g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }
/** やわらかい光の点（灯り） */
export function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number) {
  if (a <= .005 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(c, a)); gr.addColorStop(.3, rgba(c, a * .32)); gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------- 地形: 稜線から下へ三角の面を張る ----------
/** 稜線: いくつかの波を重ねた、なだらかで不規則な線（v を返す） */
export const ridge = (seed: number, base: number, amp: number, rough = 1, peaky = 0) => (u: number) => {
  let s = 0, a = 1, f = 1.3 + rnd(seed, 1) * .6, n = 0;
  for (let k = 0; k < 5; k++) {
    const w = Math.sin(u * f * 6.283 + rnd(seed, k + 2) * 6.283);
    s += (peaky && k < 2 ? w + ((1 - Math.abs(w)) * 2 - 1 - w) * peaky : w) * a; n += a; a *= .5 * rough; f *= 2.03;
  }
  return base - amp * clamp(s / n * (.5 + peaky * .3) + .5);
};
interface Tri { p: number[]; n: V3; v: number; u: number; row: number; k: number }
const ASP = 1.6; // 面の向きを計算するときの横の伸び（窓の縦横比のおおよそ）
const meshes = new Map<string, Tri[]>();
/** 山並みの面。top(u) の稜線から base まで rows 段に分け、手前へ depth だけ張り出す。段ごとに点を少しずらして面を不揃いに */
function rangeMesh(key: string, top: (u: number) => number, base: number, step: number, rows: number, depth: number, u0 = -.06, u1 = 1.06): Tri[] {
  const hit = meshes.get(key); if (hit) return hit;
  const seed = key.length * 13 + key.charCodeAt(0);
  const cols = Math.ceil((u1 - u0) / step) + 1, P: V3[][] = [];
  for (let r = 0; r <= rows; r++) {
    const row: V3[] = [], f = r / rows;
    for (let i = 0; i < cols; i++) {
      const j = (r * 131 + i) + seed;
      const u = u0 + i * step + (i > 0 && i < cols - 1 ? (rnd(j, 1) - .5) * step * (r ? .7 : .35) : 0);
      const t0 = top(u), span = Math.max(.01, base - t0);
      const v = r === rows ? base + .004 : t0 + span * f ** 1.1 + (r ? (rnd(j, 2) - .5) * span * .5 / rows : 0);
      const z = f * depth * (span / .25) + (rnd(j, 3) - .5) * depth * .5 / rows;
      row.push([u, v, z]);
    }
    P.push(row);
  }
  const tris: Tri[] = [];
  const add = (a: V3, b: V3, c: V3, row: number) => {
    const A: V3 = [a[0] * ASP, -a[1], a[2]], B: V3 = [b[0] * ASP, -b[1], b[2]], C: V3 = [c[0] * ASP, -c[1], c[2]];
    const e1: V3 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2: V3 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    let n = unit([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
    if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
    tris.push({ p: [a[0], a[1], b[0], b[1], c[0], c[1]], n, v: (a[1] + b[1] + c[1]) / 3, u: (a[0] + b[0] + c[0]) / 3, row: row / rows, k: rnd(tris.length + seed, 9) });
  };
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols - 1; i++) {
    const a = P[r][i], b = P[r][i + 1], c = P[r + 1][i], d = P[r + 1][i + 1];
    if (rnd(r * 97 + i + seed, 4) > .5) { add(a, b, c, r); add(b, d, c, r); } else { add(a, b, d, r); add(a, d, c, r); }
  }
  meshes.set(key, tris);
  return tris;
}
function drawMesh(V: View, tris: Tri[], color: (t: Tri) => RGB | string, dist: number, fillBelow?: number, soft = 0) {
  const { g, X, Y } = V;
  for (const t of tris) {
    const c = color(t), dd = dist * (1 - t.row * .15);
    let col = lit(V, c, t.n, dd);
    // soft: 雪のように光を散らす面は、明暗の差を少しやわらげる
    if (soft) col = mixN(col, lit(V, c, unit([t.n[0] * .3, 1, .4]), dd), soft);
    face(g, [X(t.p[0]), Y(t.p[1]), X(t.p[2]), Y(t.p[3]), X(t.p[4]), Y(t.p[5])], col);
  }
  if (fillBelow !== undefined) { const last = tris[tris.length - 1]; g.fillStyle = rgba(lit(V, color(last), N_FRONT, dist)); g.fillRect(V.x0, Y(fillBelow) - 1, V.x1 - V.x0, V.y1 - Y(fillBelow) + 2); }
}

// ---------- 木と建物 ----------
/** 針葉樹: 2〜3 段の円錐を、光の側と影の側の 2 面ずつで */
function conifer(V: View, x: number, y: number, h: number, base: RGB, dist: number, snow = 0, tiers = 3) {
  const { g } = V, w = h * .3;
  const L = lit(V, base, unit([-.75, .35, .6]), dist), R = lit(V, base, unit([.75, .35, .6]), dist);
  const trunkC = lit(V, [70, 52, 40], N_FRONT, dist);
  face(g, [x - w * .08, y, x + w * .08, y, x + w * .08, y - h * .2, x - w * .08, y - h * .2], trunkC);
  for (let k = 0; k < tiers; k++) {
    const f0 = k / tiers, top = y - h + h * f0 * .55, bot = y - h * .12 - h * (tiers - 1 - k) * .16, ww = w * (.55 + .45 * (k + 1) / tiers);
    face(g, [x, top, x - ww, bot, x, bot + h * .03], L);
    face(g, [x, top, x, bot + h * .03, x + ww, bot], R);
    if (snow > .05) {
      const s = lit(V, [242, 246, 252], unit([-.3, .9, .3]), dist), s2 = lit(V, [242, 246, 252], unit([.4, .8, .3]), dist);
      const sy = top + (bot - top) * .45;
      face(g, [x, top, x - ww * .45, sy, x, sy - h * .02], s, snow);
      face(g, [x, top, x, sy - h * .02, x + ww * .45, sy], s2, snow);
    }
  }
}
/** 広葉樹: 6 枚の三角で作った丸い樹冠。上と光の側が明るい */
function broadleaf(V: View, x: number, y: number, r: number, base: RGB, dist: number, trunk = true, alpha = 1) {
  const { g } = V;
  if (trunk) face(g, [x - r * .09, y, x + r * .09, y, x + r * .06, y - r * 1.1, x - r * .06, y - r * 1.1], lit(V, [64, 50, 40], N_FRONT, dist), alpha);
  const cy = y - r * 1.45, n = 6;
  const pts = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i + .5) / n * Math.PI * 2; return [x + Math.cos(a) * r * (.9 + .12 * Math.sin(i * 3 + x)), cy + Math.sin(a) * r * .88]; });
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i + 1) / n * Math.PI * 2, p = pts[i], q = pts[(i + 1) % n];
    face(g, [x + r * .08, cy - r * .1, p[0], p[1], q[0], q[1]], lit(V, base, unit([Math.cos(a) * .8, -Math.sin(a) * .8, .55]), dist), alpha);
  }
}
/** 箱（建物）: 正面と、横の面（side: -1 左 / 1 右 / 0 なし）、屋上（見下ろすときだけ） */
function box(V: View, x: number, yb: number, w: number, h: number, base: RGB, dist: number, side: number, sw: number, roofH: number) {
  const { g } = V, top = yb - h;
  face(g, [x, yb, x + w, yb, x + w, top, x, top], lit(V, base, N_FRONT, dist));
  if (side) {
    const sx = side > 0 ? x + w : x, ex = sx + side * sw, rise = roofH * .5;
    face(g, [sx, yb, ex, yb - rise, ex, top - rise, sx, top], lit(V, mixN(base, [0, 0, 0], .05), nSide(side), dist));
  }
  if (roofH > .3) {
    const ox = side * sw;
    face(g, [x, top, x + w, top, x + w + ox * .9, top - roofH, x + ox * .9, top - roofH], lit(V, mixN(base, [90, 90, 92], .5), N_UP, dist));
  }
}

/** 切妻の家: こちらに妻（三角の壁）を向け、右に横の壁と屋根の面が見える。roof は屋根の色（雪なら雪）。窓の位置を返す */
function house(V: View, x: number, base: number, w: number, hh: number, wall: RGB, roof: RGB, dist: number, snowy = false): Win {
  const { g } = V, sw = w * .55, rise = w * .12, ov = w * .1, pitch = w * .42;
  const A = [x, base - hh - pitch], EL = [x - w / 2 - ov, base - hh + ov * .5], ER = [x + w / 2 + ov, base - hh + ov * .5];
  const off = (p: number[]) => [p[0] + sw, p[1] - rise];
  const nR = unit([.55, .75, .25]), nL = unit([-.55, .75, .25]);
  // 奥へのびる左の屋根（妻の上に少しだけ見える）
  face(g, [...A, ...EL, ...off(EL), ...off(A)], lit(V, roof, nL, dist));
  // 横の壁と、右の屋根
  face(g, [x + w / 2, base, x + w / 2 + sw, base - rise, x + w / 2 + sw, base - hh - rise, x + w / 2, base - hh], lit(V, mixN(wall, [0, 0, 0], .05), nSide(1), dist));
  face(g, [...A, ...ER, ...off(ER), ...off(A)], lit(V, roof, nR, dist));
  // 妻の壁
  face(g, [x - w / 2, base, x + w / 2, base, x + w / 2, base - hh, ...A, x - w / 2, base - hh], lit(V, wall, N_FRONT, dist));
  // 屋根の厚み（雪なら丸く厚い）
  const th = snowy ? hh * .22 : hh * .07;
  const edge = lit(V, snowy ? roof : mixN(roof, [0, 0, 0], .25), N_FRONT, dist);
  face(g, [EL[0], EL[1], A[0], A[1], A[0], A[1] - th, EL[0] - th * .3, EL[1] - th * .6], edge);
  face(g, [A[0], A[1], ER[0], ER[1], ER[0] + th * .3, ER[1] - th * .6, A[0], A[1] - th], lit(V, snowy ? roof : mixN(roof, [0, 0, 0], .25), unit([.3, .4, .85]), dist));
  // 戸口
  face(g, [x + w * .14, base, x + w * .32, base, x + w * .32, base - hh * .6, x + w * .14, base - hh * .6], lit(V, mixN(wall, [0, 0, 0], .45), N_FRONT, dist));
  return { x: x - w * .32, y: base - hh * .7, w: w * .3, h: hh * .36, k: 0 };
}

/** 遠景の霧・もや: 朝と、雨の日に濃い */
function mist(V: View, v0: number, v1: number, k: number) {
  if (k < .02) return;
  const { g, Y } = V;
  const c = mixN(V.lt.haze, [235, 238, 242], .3 * V.day);
  const gr = g.createLinearGradient(0, Y(v0), 0, Y(v1));
  gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(.55, rgba(c, .6 * k)); gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr; g.fillRect(V.x0, Y(v0), V.x1 - V.x0, Y(v1) - Y(v0));
  for (let i = 0; i < 5; i++) {
    const u = rnd(i, 61) * 1.2 - .1, v = v0 + (v1 - v0) * (.3 + .4 * rnd(i, 63));
    const rx = V.gw * (.18 + .12 * rnd(i, 64)), ry = (Y(v1) - Y(v0)) * .22;
    g.save(); g.translate(V.X(u), Y(v)); g.scale(1, ry / rx);
    const e = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    e.addColorStop(0, rgba(c, .3 * k)); e.addColorStop(1, rgba(c, 0));
    g.fillStyle = e; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
  }
}
/** 水面に映る光の道（太陽・月・灯り）。x を中心に、手前ほど広がってきらめく */
function glitter(V: View, x: number, vTop: number, vBot: number, c: RGB, a: number, spread = .22, seed = 0, n = 60) {
  if (a < .01) return;
  const { g, d, t, gw, Y } = V;
  g.globalCompositeOperation = "screen";
  for (let i = 0; i < n; i++) {
    const k = rnd(i + seed, 41), v = vTop + (vBot - vTop) * k * k, near = (v - vTop) / (vBot - vTop);
    const w = gw * (.006 + spread * near) * (rnd(i + seed, 42) - .5) * 2 * (.4 + .6 * rnd(i + seed, 45));
    const fl = V.calm ? .6 : clamp(Math.sin(t * (1.5 + rnd(i + seed, 43) * 2) + i) * .8 + .3);
    const len = gw * .02 * (.4 + near) * (.5 + rnd(i + seed, 44)), y = Y(v), hh = Math.max(.6, d * (.5 + near * 1.2));
    g.fillStyle = rgba(c, a * fl * (1 - near * .4));
    g.beginPath(); g.moveTo(x + w - len / 2, y); g.lineTo(x + w, y - hh * .5); g.lineTo(x + w + len / 2, y); g.lineTo(x + w, y + hh * .5); g.closePath(); g.fill();
  }
  g.globalCompositeOperation = "source-over";
}
/** 夜の灯りの色（設定の差し色。読めなければ電球色） */
const lampColor = (V: View): RGB => /^#[0-9a-f]{6}$/i.test(V.accent) ? mixN(hex(V.accent), [255, 214, 160], .4) : [255, 205, 140];
/** 灯りの点きやすさ: 夜はもちろん、雨の昼や夕方も少し点く */
const lampsOn = (V: View) => clamp(V.night * 1.15 + (1 - V.day) * .3 + V.wet * .25);

// 地上の位置は、毎フレームの描き直しで共有する（動く部分が、止まった部分の座標を使う）
interface Win { x: number; y: number; w: number; h: number; k: number }
let litSpots: Win[] = [];

// ======================= 街 =======================
// 高い階の部屋から街を見下ろす。遠くに高層ビル群と電波塔、手前に低い屋根が続く
interface Bld { u: number; w: number; h: number; c: number; v: number; dist: number; side: number }
const CITY: Bld[] = (() => {
  const out: Bld[] = [];
  const layer = (v: number, hMax: number, wMin: number, wMax: number, dist: number, seed: number, gap: number) => {
    let u = -.04, i = 0;
    while (u < 1.04) {
      const w = wMin + rnd(i + seed, 1) * (wMax - wMin), tall = rnd(i + seed, 2);
      out.push({ u, w, h: .03 + tall * tall * hMax, c: rnd(i + seed, 3), v: v + rnd(i + seed, 4) * .015, dist, side: 0 });
      u += w + rnd(i + seed, 5) * gap; i++;
    }
  };
  layer(.7, .3, .02, .05, 5, 10, .006);
  layer(.78, .3, .04, .08, 3, 40, .02);
  layer(.88, .26, .06, .12, 1.6, 70, .04);
  for (const b of out) b.side = b.u + b.w / 2 < .5 ? 1 : -1; // 真ん中より左のビルは右の面が、右のビルは左の面が見える
  return out;
})();
const CITY_HV = .66; // 目の高さ
const FACADE = ["#b9b3a6", "#8e98a3", "#cfc8b8", "#6f7f8e", "#a59a8a", "#d8d4cc", "#7d8a84"];
function cityBase(V: View) {
  const { g, d, X, Y, gw, gh } = V;
  litSpots = [];
  // 地平線のかすんだ街並み
  g.fillStyle = rgba(fogged(V, lit(V, [120, 128, 140], N_FRONT), 7));
  for (let i = 0; i < 60; i++) { const u = i / 60, hh = .01 + rnd(i, 7) ** 2 * .05; g.fillRect(X(u), Y(.705 - hh), gw / 60 + 1, gh * (hh + .02)); }
  // 電波塔（遠景の左寄り）: 細い鉄骨の塔と展望台
  const tx = X(.24), tb = Y(.715), th = gh * .5, tw = gh * .035;
  const steel = (k: number) => mixN([200, 90, 70], [235, 235, 232], k);
  for (let k = 0; k < 6; k++) {
    const y0 = tb - th * k / 6, y1 = tb - th * (k + 1) / 6, w0 = tw * (1 - k / 6) ** 1.6 + d * .4, w1 = tw * (1 - (k + 1) / 6) ** 1.6 + d * .4;
    face(g, [tx - w0, y0, tx - w1, y1, tx, y1, tx, y0], lit(V, steel(k % 2), unit([-.6, 0, .8]), 4.5));
    face(g, [tx, y0, tx, y1, tx + w1, y1, tx + w0, y0], lit(V, steel(k % 2), unit([.6, 0, .8]), 4.5));
  }
  const dy = tb - th * .62;
  face(g, [tx - tw * .45, dy, tx + tw * .45, dy, tx + tw * .4, dy - gh * .02, tx - tw * .4, dy - gh * .02], lit(V, [210, 214, 220], N_FRONT, 4.5));
  litSpots.push({ x: tx, y: tb - th, w: 0, h: 0, k: -1 });
  // ビル（遠い順）
  for (const [i, b] of CITY.entries()) {
    const x = X(b.u), w = gw * b.w, yb = Y(b.v) + gh * .3, h = gh * b.h + gh * .3, top = yb - h;
    const below = clamp((Y(CITY_HV) - top) / gh * -1); // 目より低い屋上は上の面が見える
    const base = mixN(hex(FACADE[Math.floor(b.c * FACADE.length)]), [0, 0, 0], rnd(i, 8) * .12);
    box(V, x, yb, w, h, base, b.dist, b.side, w * (.18 + .12 * rnd(i, 9)), gh * below * .06 + (below > 0 ? d : 0));
    // 窓: 昼は空を映すガラスの帯、夜は灯り
    const floor = Math.max(2.4 * d, gh * .02 * (3 / (b.dist + 1))), rows = Math.floor(h / floor), cols = Math.max(2, Math.round(w / (floor * 1.1)));
    const glass = fogged(V, mixN(mixN(V.top, V.bottom, .4), [30, 38, 50], .35 + .4 * V.night), b.dist);
    g.fillStyle = rgba(glass, .55);
    for (let r = 1; r < rows; r++) g.fillRect(x + w * .08, top + r * floor, w * .84, floor * .42);
    if (b.side) { // 横の面にも窓の帯（細く）
      const sx = b.side > 0 ? x + w : x, sw = w * (.18 + .12 * rnd(i, 9)) * b.side;
      g.fillStyle = rgba(mixN(glass, [0, 0, 0], .2), .45);
      for (let r = 1; r < rows; r++) fillPoly(g, [sx + sw * .15, top + r * floor, sx + sw * .85, top + r * floor, sx + sw * .85, top + r * floor + floor * .42, sx + sw * .15, top + r * floor + floor * .42]);
    }
    for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) litSpots.push({ x: x + w * .08 + (c + .15) * w * .84 / cols, y: top + r * floor, w: w * .84 / cols * .7, h: floor * .42, k: i * 1000 + r * 37 + c });
    // 屋上の設備（給水塔・室外機）
    if (rnd(i, 10) > .55 && w > 6 * d) face(g, [x + w * .2, top, x + w * .2, top - gh * .012, x + w * .38, top - gh * .012, x + w * .38, top], lit(V, [120, 120, 118], N_FRONT, b.dist));
  }
  // 手前の低い屋根並み（瓦とスレート）と街路樹
  const roofs = 9;
  for (let i = 0; i < roofs; i++) {
    const u = -.05 + i / (roofs - 1) * 1.1 + (rnd(i, 21) - .5) * .05, w = gw * (.12 + rnd(i, 22) * .06), x = X(u) - w / 2, yb = Y(.985 + rnd(i, 23) * .02), rh = gh * (.045 + rnd(i, 24) * .02);
    const roof = mixN(["#5b6067", "#7a5548", "#4d5a66", "#8a8378"].map(hex)[i % 4], [0, 0, 0], rnd(i, 25) * .1);
    face(g, [x, yb, x + w, yb, x + w, yb + gh * .1, x, yb + gh * .1], lit(V, [190, 182, 168], N_FRONT, .5));
    face(g, [x - w * .04, yb, x + w * .5, yb - rh, x + w * .5, yb], lit(V, roof, unit([-.3, .8, .5]), .5));
    face(g, [x + w * .5, yb - rh, x + w * 1.04, yb, x + w * .5, yb], lit(V, roof, unit([.3, .8, .5]), .5));
    if (rnd(i, 26) > .4) broadleaf(V, x + w * (rnd(i, 27) > .5 ? 1.02 : -.02), Y(1.02), gh * .045, mixN(treeColor(V.season, rnd(i, 28)), [0, 0, 0], .1), .5);
  }
  for (let i = 0; i < roofs; i++) {
    const u = -.05 + i / (roofs - 1) * 1.1 + (rnd(i, 21) - .5) * .05, w = gw * (.12 + rnd(i, 22) * .06), yb = Y(.985 + rnd(i, 23) * .02);
    litSpots.push({ x: X(u) - w * .2, y: yb + gh * .012, w: w * .14, h: gh * .012, k: 9000 + i });
  }
}
function cityLights(V: View) {
  const { g, d, t } = V;
  const on = lampsOn(V);
  if (on > .02) {
    const warm = lampColor(V);
    for (const s of litSpots) {
      if (s.k < 0) continue;
      if (rnd(s.k, Math.floor(t / (45 + (s.k % 7) * 9)) + 1) <= .68) continue;
      const c = rnd(s.k, 3) > .8 ? [205, 225, 255] : warm;
      g.fillStyle = rgba(c, on * (.55 + .35 * rnd(s.k, 4))); g.fillRect(s.x, s.y, Math.max(d * .8, s.w), Math.max(d * .6, s.h));
    }
  }
}
function cityLive(V: View) {
  const { g, d, t, night } = V;
  const tw = litSpots.find(s => s.k < 0);
  if (tw && night > .2 && Math.sin(t * 2.4) > .3) glow(g, tw.x, tw.y, 6 * d, [255, 80, 64], .9);
}
const treeColor = (S: Season, k: number): RGB => {
  let c = mixN("#4f7040", "#6f8f48", k);
  c = mixN(c, k > .85 ? "#f0c8d2" : "#9cc46a", S.sp * .7);
  c = mixN(c, ["#b8452e", "#d07a2c", "#c9a23a", "#8f3a2a"][Math.floor(k * 4)], S.au * .85);
  return mixN(c, "#7a7268", S.wi * .85);
};

// ======================= 海辺 =======================
const SEA_HV = .62;
const CAPE = ridge(7, .5, .06, .7);
const capeTop = (u: number) => { const s = clamp((u - .58) / .3); return SEA_HV - (SEA_HV - CAPE(u)) * Math.pow(Math.sin(s * Math.PI * .5), .8) - .002; };
const shore = (u: number) => .88 + .02 * Math.sin(u * 3.2 + 1) + .008 * Math.sin(u * 11);
// 海の面: 奥行き z（手前 1）と横 L の網目。波の高さで面が傾き、傾きに応じて空を映す
const sz = (z: number) => SEA_HV + (.9 - SEA_HV) / z;
interface WaterTri { p: number[]; n: V3; near: number }
let seaMesh: WaterTri[] | null = null;
function waterMesh(): WaterTri[] {
  if (seaMesh) return seaMesh;
  const Z = [1, 1.25, 1.6, 2.05, 2.7, 3.6, 5, 7, 10, 15, 24, 40, 80], out: WaterTri[] = [];
  const pt = (L: number, zi: number): V3 => { const z = Z[zi]; return [.5 + L * .5 / z, sz(z), (rnd(Math.round(L * 10) + zi * 50, 11) - .5) * .35]; };
  for (let zi = 0; zi < Z.length - 1; zi++) {
    const n = 28 + zi * 3;
    for (let i = 0; i < n; i++) {
      const L0 = -1.15 * Z[zi + 1] + i * 2.3 * Z[zi + 1] / n, L1 = L0 + 2.3 * Z[zi + 1] / n;
      const a = pt(L0, zi), b = pt(L1, zi), c = pt(L0, zi + 1), dd = pt(L1, zi + 1);
      for (const [p, q, r] of [[a, b, c], [b, dd, c]] as V3[][]) {
        const h = .045 / Z[zi]; // 手前ほど波が大きく見える
        const n3 = unit([(p[2] - q[2]) * 1.2 + (rnd(i, zi) - .5) * .4, 1, (p[2] - r[2]) * 1.2 + (rnd(i + 3, zi) - .5) * .5 + h * 3]);
        out.push({ p: [p[0], p[1], q[0], q[1], r[0], r[1]], n: n3, near: 1 - zi / (Z.length - 1) });
      }
    }
  }
  return seaMesh = out;
}
/** 水の面の色: 深い水の色と、面の向きで映る空の色（傾いた面ほど空の高いところ＝濃い色を映す）。遠いほど空を強く映す */
function waterColor(V: View, deep: RGB, n: V3, near: number): RGB {
  const tilt = clamp(.4 + n[2] * .9 - (1 - n[1]) * .25);
  const refl = mixN(V.bottom, V.top, tilt);
  const fres = .38 + .55 * (1 - near) ** 1.5;
  const c = mixN(deep.map((v, i) => v * (V.lt.amb[i] * .9 + V.lt.key[i] * .25)), refl, fres);
  return fogged(V, c, (1 - near) * 2.5);
}
function seaBase(V: View) {
  const { g, d, X, Y, gw, gh, season: S } = V;
  const deep = mixN(mixN("#1f5576", "#1a6a8f", S.su), "#2f4659", S.wi);
  const hor = Y(SEA_HV);
  g.fillStyle = rgba(waterColor(V, deep, [0, 1, 0], 0)); g.fillRect(V.x0, hor, V.x1 - V.x0, V.y1 - hor);
  for (const w of waterMesh()) face(g, [X(w.p[0]), Y(w.p[1]), X(w.p[2]), Y(w.p[3]), X(w.p[4]), Y(w.p[5])], waterColor(V, deep, w.n, w.near));
  // 遠くの島
  const isl = rangeMesh("sea-isl", u => SEA_HV - .03 * Math.sin(clamp((u - .06) / .2) * Math.PI) ** .7 - .001, SEA_HV + .001, .02, 2, .06, .04, .28);
  drawMesh(V, isl, () => "#5e7a66", 6);
  // 右手の岬: 草と林の斜面、波打ち際は岩肌
  const cape = rangeMesh("sea-cape", capeTop, SEA_HV + .012, .028, 4, .5, .56, 1.08);
  drawMesh(V, cape, t => t.row > .62 ? mixN("#7a6c5c", "#5c554c", t.k) : mixN(mixN(mixN("#5b7a44", "#7d8f4c", t.k), "#8a7a4a", S.au * .6), "#6d6a5a", S.wi * .6), 2.2);
  for (let i = 0; i < 22; i++) {
    const u = .64 + i * .021 + rnd(i, 3) * .01, v = capeTop(u) + .01;
    if (v < SEA_HV - .01 && Math.abs(u - .9) > .025) (i % 3 ? conifer : (V2: View, x: number, y: number, h: number, c: RGB, dd: number) => broadleaf(V2, x, y, h * .35, c, dd))(V, X(u), Y(v), gh * (.03 + .02 * rnd(i, 4)), mixN("#2f4a33", "#3d5a3a", rnd(i, 5)), 2.2);
  }
  // 灯台: 白い塔（光の側と影の側）、赤い帯、灯室
  const lu = .9, lx = X(lu), lb = Y(capeTop(lu)) + d, lh = gh * .1, lw = Math.max(1.6 * d, gw * .012);
  const tower = (c: RGB, y0: number, y1: number) => {
    const k0 = (lb - y0) / lh, k1 = (lb - y1) / lh, w0 = lw * (1 - .3 * k0), w1 = lw * (1 - .3 * k1);
    face(g, [lx - w0, y0, lx, y0, lx, y1, lx - w1, y1], lit(V, c, unit([-.8, .1, .6]), 2));
    face(g, [lx, y0, lx + w0, y0, lx + w1, y1, lx, y1], lit(V, c, unit([.8, .1, .6]), 2));
  };
  tower([238, 234, 226], lb, lb - lh * .5); tower([190, 64, 54], lb - lh * .5, lb - lh * .64); tower([238, 234, 226], lb - lh * .64, lb - lh);
  face(g, [lx - lw * .9, lb - lh, lx + lw * .9, lb - lh, lx + lw * .9, lb - lh - lw * .25, lx - lw * .9, lb - lh - lw * .25], lit(V, [60, 64, 70], N_UP, 2));
  face(g, [lx - lw * .5, lb - lh - lw * .25, lx + lw * .5, lb - lh - lw * .25, lx + lw * .5, lb - lh - lw * 1.1, lx - lw * .5, lb - lh - lw * 1.1], lit(V, [150, 165, 170], N_FRONT, 2, 40 * V.night));
  face(g, [lx - lw * .6, lb - lh - lw * 1.1, lx + lw * .6, lb - lh - lw * 1.1, lx, lb - lh - lw * 1.7], lit(V, [70, 74, 80], N_UP, 2));
  litSpots = [{ x: lx, y: lb - lh - lw * .7, w: lw, h: 0, k: 0 }];
  // 砂浜: 乾いた砂の面と、波に濡れて空を映す砂の帯
  const sand = mixN("#bfa985", "#9a958a", S.wi * .7);
  const beach = rangeMesh("sea-beach", u => shore(u) + .006, 1.08, .05, 3, 2.5);
  drawMesh(V, beach, t => mixN(sand, mixN(sand, [150, 130, 100], .3), t.k * .5), .2);
  const ws = g.createLinearGradient(0, Y(shore(.5) - .02), 0, Y(shore(.5) + .01));
  ws.addColorStop(0, rgba(mixN(lit(V, sand, N_UP, .3), V.bottom, .35), 0)); ws.addColorStop(1, rgba(mixN(lit(V, mixN(sand, [80, 80, 86], .35), N_UP, .3), V.bottom, .3), .9));
  g.fillStyle = ws; g.beginPath(); g.moveTo(V.x0, V.y1);
  for (let u = -.04; u <= 1.04; u += .02) g.lineTo(X(u), Y(shore(u) - .008)); g.lineTo(V.x1, V.y1); g.closePath();
  g.save(); g.clip(); g.fillRect(V.x0, Y(shore(.5) - .04), V.x1 - V.x0, gh * .08); g.restore();
  void hor;
}
function seaLive(V: View) {
  const { g, d, t, X, Y, gw, gh, night, day, wet, season: S } = V;
  const hv = SEA_HV, hor = Y(hv), sh = shore(.5);
  // 白波: 手前ほど長く、ゆっくり現れては消える
  for (let i = 0; i < 46; i++) {
    const k = rnd(i, 11), v = hv + (sh - hv) * k * k, near = (v - hv) / (sh - hv);
    const u = (rnd(i, 12) + (V.calm ? 0 : t * .0015 * (1 + near))) % 1.1 - .05, len = gw * (.012 + .06 * near) * (.5 + rnd(i, 13));
    const a = (V.calm ? .5 : clamp(Math.sin(t * .45 + i * 1.7) * .7 + .35)) * (.1 + .18 * near) * (1 - night * .6);
    if (X(u) > X(capeTop(u) < hv - .002 ? 2 : u) - 1) continue;
    g.fillStyle = rgba(mixN([255, 255, 255], V.bottom, .2), a);
    const y = Y(v), hh = Math.max(.6, d * (.4 + near * .8));
    g.beginPath(); g.moveTo(X(u), y); g.lineTo(X(u) + len * .3, y - hh); g.lineTo(X(u) + len, y); g.closePath(); g.fill();
  }
  // 太陽・月の光の道
  const sunLow = V.sun?.low ?? 0;
  if (V.sun && V.sun.y < hor) glitter(V, V.sun.x, hv + .004, sh, mixN([255, 248, 225], [255, 170, 100], sunLow), (.65 + .3 * sunLow) * (1 - wet * .85), .1 + .12 * sunLow, 0, 90);
  if (V.moon && V.moon.y < hor) glitter(V, V.moon.x, hv + .004, sh, [240, 232, 210], .5 * night * (1 - wet * .8), .08, 7, 60);
  // 夏の夜の漁火
  const fish = night * (.25 + .75 * S.su) * (1 - wet * .7);
  if (fish > .05) for (let i = 0; i < 9; i++) {
    if (rnd(i, 51) > .25 + .75 * S.su) continue;
    const x = X(.04 + .5 * rnd(i, 52) + (V.calm ? 0 : Math.sin(t * .01 + i) * .006)), y = hor - d * .4;
    glow(g, x, y, gh * .04, [255, 250, 225], .5 * fish);
    g.fillStyle = rgba([255, 252, 236], .9 * fish); g.fillRect(x - d * .6, y - d * .6, d * 1.2, d * 1.2);
    g.fillStyle = rgba([255, 245, 210], .16 * fish); g.fillRect(x - d * .4, hor + d, d * .8, gh * .05 * (.6 + rnd(i, 53)));
  }
  // 昼は小さな漁船が横切る（船体の明暗と、引き波）
  if (day > .4) {
    const k = ((t / 240) + .3) % 1, bx = X(-.05 + k * 1.1), by = Y(.665), s = gh * .011;
    if (bx < X(.56)) {
      face(g, [bx - s * 2.4, by - s * .5, bx + s * 2.4, by - s * .5, bx + s * 1.7, by + s * .45, bx - s * 1.9, by + s * .45], lit(V, [232, 228, 218], N_FRONT, 3));
      face(g, [bx - s * .2, by - s * .5, bx + s * 1.1, by - s * .5, bx + s * 1.1, by - s * 1.8, bx - s * .2, by - s * 1.8], lit(V, [210, 214, 218], N_FRONT, 3));
      face(g, [bx + s * 1.1, by - s * .5, bx + s * 1.5, by - s * .7, bx + s * 1.5, by - s * 1.9, bx + s * 1.1, by - s * 1.8], lit(V, [210, 214, 218], nSide(1), 3));
      g.fillStyle = rgba([255, 255, 255], .25 * day); fillPoly(g, [bx - s * 2, by + s * .5, bx - s * 7, by + s * .9, bx - s * 7, by + s * .6]);
    }
  }
  // 灯台の光: 回る光の束。こちらを向いた瞬間にまぶしく光る
  const L = litSpots[0];
  if (L && night > .15) {
    const a = V.calm ? 2.2 : t * .7, k = clamp((night - .15) * 1.5);
    const facing = Math.pow(Math.max(0, Math.sin(a)), 6), len = gw * .9 * Math.cos(a);
    g.globalCompositeOperation = "screen";
    const beam = g.createLinearGradient(L.x, L.y, L.x + len, L.y);
    beam.addColorStop(0, rgba([255, 244, 200], .3 * k * (1 - facing * .5))); beam.addColorStop(1, rgba([255, 244, 200], 0));
    g.fillStyle = beam; fillPoly(g, [L.x, L.y - d, L.x + len, L.y - gh * .06, L.x + len, L.y + gh * .045, L.x, L.y + d]);
    g.globalCompositeOperation = "source-over";
    glow(g, L.x, L.y, gh * (.05 + .25 * facing), [255, 240, 196], k * (.6 + .4 * facing));
    if (facing > .2) glitter(V, L.x, hv + .01, sh, [255, 240, 200], .5 * facing * k, .04, 9);
  }
  // 寄せては返す波の泡
  const surf = V.calm ? 0 : Math.sin(t * .33) * .012 + Math.sin(t * .71) * .004;
  const line = (off: number, w: number, a: number, ph: number) => {
    g.strokeStyle = rgba(mixN([255, 255, 255], V.bottom, .15), a); g.lineWidth = w; g.beginPath();
    for (let u = -.04; u <= 1.04; u += .02) { const y = Y(shore(u) + off + .003 * Math.sin(u * 23 + t * ph)); if (u <= -.04) g.moveTo(X(u), y); else g.lineTo(X(u), y); }
    g.stroke();
  };
  line(-.012 - surf, Math.max(.8, d * 1.1), (.6 - .35 * night) * (.6 + .4 * day), 1);
  line(-.032 - surf * 1.5, d * .6, .22 - .12 * night, -.5);
}

// ======================= 山と森 =======================
const M_FAR = ridge(21, .5, .3, .95, .6), M_MID = ridge(33, .64, .14), M_NEAR = ridge(45, .82, .08, .8);
const MID_TREES = Array.from({ length: 90 }, (_, i) => ({ u: i / 86 - .02 + rnd(i, 1) * .012, s: .6 + rnd(i, 2) * .7, c: rnd(i, 3), dv: rnd(i, 4) }));
const NEAR_TREES = Array.from({ length: 34 }, (_, i) => ({ u: i / 32 - .02 + rnd(i, 5) * .02, s: .7 + rnd(i, 6) * .7 }));
function mountainBase(V: View) {
  const { X, Y, gh, night, h, season: S } = V;
  // 遠い峰: 岩肌は青く霞み、高いところと上を向いた面に雪。冬は裾まで、春と晩秋は頂だけ
  const snow = clamp(S.wi * 1.1 + S.sp * .35 + S.au * .25);
  const far = rangeMesh("m-far", M_FAR, .66, .03, 5, .55);
  let peak = 1; for (let u = 0; u <= 1; u += .01) peak = Math.min(peak, M_FAR(u));
  const line = peak + (.62 - peak) * (.15 + snow * .75);
  drawMesh(V, far, t => (t.v < line && t.n[1] > .55 + t.k * .25) || t.v < peak + .015 + snow * .04 ? "#eef2f6" : mixN("#5f6b7c", "#77706a", t.k), 2.6);
  // 中ほどの山: 落葉樹の森。季節で色づく（面ごとに少し色をずらす）
  const mid = rangeMesh("m-mid", M_MID, .8, .035, 3, .6);
  drawMesh(V, mid, t => mixN(treeColor(S, t.k), [40, 50, 40], .25), 2.4);
  for (const tr of MID_TREES) broadleaf(V, X(tr.u), Y(M_MID(tr.u) + .02 + tr.dv * .07), gh * .016 * tr.s, treeColor(S, tr.c), 2.2 - tr.dv * .3, false, 1 - S.wi * .35);
  litSpots = [.18, .57, .62].map((u, k) => ({ x: X(u), y: Y(M_MID(u) + .045), w: 0, h: 0, k }));
  // 朝霧（と雨の日のもや）が谷にたまる
  mist(V, .58, .8, bell(h, 6.6, 1.7) * (.45 + .55 * (S.sp + S.au)) + V.wet * .5);
  // 手前の尾根と針葉樹
  const nearC = mixN("#2d4632", "#34413a", S.wi * .5);
  const near = rangeMesh("m-near", M_NEAR, 1.06, .045, 3, .5);
  drawMesh(V, near, t => mixN(nearC, [70, 66, 50], t.k * .35), .5, 1.04);
  const sn = clamp((S.wi - .35) * 1.6) * .9;
  for (const tr of NEAR_TREES) conifer(V, X(tr.u), Y(M_NEAR(tr.u) + .03), gh * .15 * tr.s, mixN(nearC, [30, 50, 36], rnd(tr.u * 99, 1) * .5), .4, sn);
  void night;
}
function mountainLive(V: View) {
  const on = V.night;
  if (on > .1) for (const s of litSpots) { glow(V.g, s.x, s.y, V.gh * .03, [255, 196, 120], .6 * on); V.g.fillStyle = rgba([255, 214, 150], .9 * on); V.g.fillRect(s.x - V.d * .7, s.y - V.d * .7, V.d * 1.4, V.d * 1.4); }
}

// ======================= 田園 =======================
// 地面の座標: 横 L・奥行き z（手前の窓の下端が z=1）を、画面の u・v に写す
const FV = .6; // 地平線
const fu = (L: number, z: number) => .5 + L * .5 / z, fv = (z: number) => FV + (1 - FV) / z;
const F_HILL = ridge(71, .58, .08, .7);
const F_ROWS = [1, 1.3, 1.9, 2.9, 4.6, 7.5, 12, 30];
const F_COLS = [-9, -5.5, -2.4, -.9, .6, 2.1, 3.6, 6.5, 10];
function fieldBase(V: View) {
  const { g, d, X, Y, gw, gh, season: S } = V;
  const hor = Y(FV);
  // 遠くの山並みと、手前の丘
  drawMesh(V, rangeMesh("f-hill", F_HILL, FV + .01, .03, 3, .5), t => mixN(mixN("#5d7d58", "#7f8f9e", .3 + t.k * .2), "#8a8a90", S.wi * .6), 4.5);
  drawMesh(V, rangeMesh("f-low", u => FV - .014 - .012 * Math.sin(u * 5 + 1), FV + .004, .04, 1, .1), t => mixN(mixN(mixN("#4f6b48", "#5f7c4e", t.k), "#7a6a46", S.au * .6), "#6a6658", S.wi * .7), 3);
  // 田んぼ: 一枚ずつ少し色が違う。春は水を張って空を映し、夏は青田、秋は黄金色、冬は刈り跡
  const water = clamp(S.sp * 1.4 - .15) * (1 - S.su * .5);
  for (let zi = F_ROWS.length - 2; zi >= 0; zi--) for (let ci = 0; ci < F_COLS.length - 1; ci++) {
    const z0 = F_ROWS[zi], z1 = F_ROWS[zi + 1], L0 = F_COLS[ci], L1 = F_COLS[ci + 1], k = rnd(zi * 11 + ci, 3);
    const p = [X(fu(L0, z0)), Y(fv(z0)), X(fu(L1, z0)), Y(fv(z0)), X(fu(L1, z1)), Y(fv(z1)), X(fu(L0, z1)), Y(fv(z1))];
    let crop = mixN(mixN(mixN("#4f7a32", "#6a8a3a", k), mixN("#b08a3c", "#c29a46", k), S.au * (.8 + .2 * k)), mixN("#6e5f48", "#7d6c52", k), S.wi);
    crop = mixN(crop, "#6f6650", S.sp * .5);
    const dist = (z0 + z1) / 2 * .35;
    face(g, p, lit(V, crop, unit([(k - .5) * .2, 1, .25 + k * .1]), dist));
    if (water > .02) {
      // 水鏡: 奥ほど空の低いところ（明るい色）を映す
      const ref = mixN(V.bottom, V.top, clamp(.15 + .5 / z0));
      g.fillStyle = rgba(fogged(V, mixN(ref, [40, 52, 60], .15 + k * .1), dist), water * .92); fillPoly(g, p);
    }
  }
  if (water > .02) {
    for (const b of [V.sun, V.moon]) if (b && b.y < hor) glitter(V, b.x, FV + .005, 1.05, b === V.sun ? [255, 236, 200] : [236, 230, 210], .45 * water * (1 - V.wet), .05, 3);
    // 苗の列
    g.fillStyle = rgba(lit(V, "#6d9a4a", N_UP), .6 * water);
    for (let z = 1.1; z < 14; z *= 1.09) for (let L = -3; L <= 3; L += .14) { const u = fu(L, z); if (u > -.02 && u < 1.02) g.fillRect(X(u), Y(fv(z)), Math.max(.6, d * 1.4 / z), Math.max(.6, d * 1.6 / z)); }
  } else if (S.su + S.au > .3) {
    // 稲の列: 地平線へ向かって集まる筋（光の側だけ明るい）
    g.strokeStyle = rgba(lit(V, mixN("#2f4a20", "#7a5a20", S.au), N_FRONT), .12); g.lineWidth = Math.max(.5, d * .4); g.beginPath();
    for (let L = -6; L <= 6; L += .2) { g.moveTo(X(fu(L, 1)), Y(1)); g.lineTo(X(fu(L, 14)), Y(fv(14))); }
    g.stroke();
  }
  if (S.wi > .5) { g.fillStyle = rgba(lit(V, "#eef2f6", N_UP), (S.wi - .5) * .9); for (let i = 0; i < 120; i++) { const z = 1 + rnd(i, 81) * 10, u = fu((rnd(i, 82) - .5) * 8, z); g.fillRect(X(u), Y(fv(z)), gw * .06 / z, Math.max(.6, d * 1.4 / z)); } }
  // あぜ: 上を向いた面と、手前を向いた側面
  const levee = mixN(mixN("#6f8048", "#8c7a52", S.au), "#7a6e5c", S.wi);
  for (const z of F_ROWS.slice(0, -1)) {
    const y = Y(fv(z)), hh = Math.max(.8, d * 3 / z);
    g.fillStyle = rgba(lit(V, levee, N_UP, z * .35)); g.fillRect(V.x0, y - hh, V.x1 - V.x0, hh * .55);
    g.fillStyle = rgba(lit(V, mixN(levee, [0, 0, 0], .15), unit([0, .5, .85]), z * .35)); g.fillRect(V.x0, y - hh * .45, V.x1 - V.x0, hh * .45);
  }
  for (const L of F_COLS) {
    const w = .05;
    face(g, [X(fu(L - w, 1)), Y(1), X(fu(L + w, 1)), Y(1), X(fu(L + w, 30)), Y(fv(30)), X(fu(L - w, 30)), Y(fv(30))], lit(V, levee, unit([-L * .05, 1, .3]), 1));
  }
  // 秋分のころ、あぜに彼岸花
  const higan = bell(S.doy, 266, 9);
  if (higan > .05) { g.fillStyle = rgba(lit(V, "#d2302a", N_FRONT, .3, 20), higan); for (let i = 0; i < 70; i++) { const z = F_ROWS[i % 3], u = rnd(i, 91) * 1.1 - .05; g.fillRect(X(u), Y(fv(z)) - d * 2.4 / z, Math.max(1, d * 2 / z), Math.max(1, d * 1.6 / z)); } }
  // 鎮守の森（こんもりした広葉樹のかたまり）と、農家
  for (let i = 0; i < 11; i++) { const u = .68 + i * .016, r = gh * (.018 + .022 * Math.sin(i / 10 * Math.PI)); broadleaf(V, X(u), hor + d, r, mixN("#2f4a32", "#3e5a3a", rnd(i, 9)), 3.2, false); }
  const hx = X(.22), hw = gw * .06, hb = hor + d * 1.5, hh = gh * .03;
  const fw = house(V, hx, hb, hw, hh, [214, 206, 190], S.wi > .5 ? SNOW : [70, 76, 86], 2.8, S.wi > .5);
  litSpots = [{ ...fw, k: 0 }];
  // 電柱と電線: 奥へと小さくなって並ぶ
  const poles = [1.15, 1.7, 2.5, 3.7, 5.5, 8.2, 12].map(z => ({ x: X(fu(-1.15, z)), y: Y(fv(z)), hgt: gh * .5 / z, w: Math.max(.8, d * 2.6 / z), z }));
  for (const p of poles) {
    face(g, [p.x - p.w / 2, p.y, p.x, p.y, p.x, p.y - p.hgt, p.x - p.w / 2, p.y - p.hgt], lit(V, [120, 116, 108], nSide(-1), p.z * .35));
    face(g, [p.x, p.y, p.x + p.w / 2, p.y, p.x + p.w / 2, p.y - p.hgt, p.x, p.y - p.hgt], lit(V, [120, 116, 108], nSide(1), p.z * .35));
    g.fillStyle = rgba(lit(V, [80, 80, 80], N_FRONT, p.z * .35)); g.fillRect(p.x - p.hgt * .12, p.y - p.hgt * .92, p.hgt * .24, Math.max(.7, p.w * .5));
  }
  g.strokeStyle = rgba(lit(V, [40, 40, 40], N_FRONT, 1), .7); g.lineWidth = Math.max(.5, d * .55); g.beginPath();
  for (const off of [-.11, .11, 0]) for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i], b = poles[i + 1], ya = a.y - a.hgt * (off ? .92 : .8), yb = b.y - b.hgt * (off ? .92 : .8), xa = a.x + a.hgt * off, xb = b.x + b.hgt * off;
    g.moveTo(xa, ya); g.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 + (a.hgt + b.hgt) * .06, xb, yb);
  }
  g.stroke();
  // 電線にとまるスズメ（昼）
  if (V.day > .5 && V.wet < .3) { const p = poles[0], q = poles[1]; for (let i = 0; i < 3; i++) { const k = .3 + i * .09 + rnd(i, 7) * .04, x = p.x + (q.x - p.x) * k + p.hgt * .11, y = p.y - p.hgt * .92 + (q.y - q.hgt * .92 - p.y + p.hgt * .92) * k + Math.sin(k * Math.PI) * (p.hgt + q.hgt) * .06; face(g, [x - d * 1.5, y - d * 1.2, x, y - d * 2.6, x + d * 1.5, y - d * 1.2, x, y], lit(V, "#5a4632", N_FRONT)); } }
}
function fieldLive(V: View) {
  const { g, d, t, X, Y, gh, night, day, season: S } = V;
  const lit2 = lampsOn(V);
  if (lit2 > .05) for (const s of litSpots) { glow(g, s.x + s.w / 2, s.y + s.h / 2, gh * .03, [255, 200, 130], .5 * lit2); g.fillStyle = rgba([255, 214, 150], .9 * lit2); g.fillRect(s.x, s.y, s.w, s.h); }
  // 風が稲の上を渡る（明るい帯がゆっくり進む）
  if (!V.calm && S.su + S.au > .3 && S.sp < .5) { const w = (t * .05) % 1.4 - .2; const wg = g.createLinearGradient(X(w - .2), 0, X(w + .2), 0); wg.addColorStop(0, "rgba(255,255,230,0)"); wg.addColorStop(.5, `rgba(255,255,230,${(.08 * day).toFixed(3)})`); wg.addColorStop(1, "rgba(255,255,230,0)"); g.fillStyle = wg; g.fillRect(V.x0, Y(fv(5)), V.x1 - V.x0, V.y1 - Y(fv(5))); }
  // 夏の夜の蛍
  const fire = night * bell(S.doy, 170, 18) * (1 - V.wet);
  if (fire > .03) for (let i = 0; i < 24; i++) {
    const ph = t * .15 + i, x = X(rnd(i, 95) + Math.sin(ph * .7) * .03), y = Y(.72 + rnd(i, 96) * .25 + Math.sin(ph) * .02);
    const on = V.calm ? .6 : Math.pow(clamp(Math.sin(t * (.8 + rnd(i, 97)) + i * 2)), 3);
    glow(g, x, y, gh * .02, [190, 255, 120], .7 * on * fire); g.fillStyle = rgba([220, 255, 170], on * fire); g.fillRect(x - d * .5, y - d * .5, d, d);
  }
}

// ======================= 雪国 =======================
const S_FAR = ridge(111, .5, .22, .9, .5), S_MID = ridge(123, .66, .09, .6);
const HOUSES = [{ u: .1, w: .12, h: .06 }, { u: .27, w: .09, h: .05 }, { u: .45, w: .15, h: .075 }, { u: .64, w: .1, h: .055 }, { u: .81, w: .13, h: .065 }, { u: .97, w: .1, h: .055 }];
const SNOW: RGB = [244, 247, 251];
function snowBase(V: View) {
  const { g, d, X, Y, gw, gh } = V;
  // 遠い山: 雪の面と、ところどころ黒い岩と杉林
  drawMesh(V, rangeMesh("s-far", S_FAR, .7, .03, 5, .9), t => t.n[1] < .3 + t.k * .2 && t.k > .55 ? "#6e7682" : SNOW, 3.5, undefined, .3);
  for (let i = 0; i < 90; i++) { const u = rnd(i, 2) * 1.04 - .02, v = S_FAR(u) + .03 + rnd(i, 4) ** .7 * .16; if (v < .66 && rnd(Math.floor(u * 7), 5) > .3) conifer(V, X(u), Y(v), gh * (.018 + .016 * rnd(i, 6)), [56, 70, 66], 3, .7, 2); }
  // 中ほどの雪原の丘
  drawMesh(V, rangeMesh("s-mid", S_MID, .9, .045, 3, 1.1), () => SNOW, 1.8, undefined, .45);
  // 家々: 雪を厚くのせた切妻の屋根、板の壁、窓の灯り
  litSpots = [];
  for (const [i, hs] of HOUSES.entries()) {
    const x = X(hs.u), w = gw * hs.w * .72, base = Y(S_MID(hs.u) + .08 + rnd(i, 5) * .04), hh = gh * hs.h * .75, dist = 1.5;
    const win = house(V, x, base, w, hh, [96, 72, 54], SNOW, dist, true);
    // つらら
    g.strokeStyle = rgba(lit(V, [200, 220, 240], N_FRONT, dist), .7); g.lineWidth = Math.max(.5, d * .5); g.beginPath();
    for (let k = 0; k < 4; k++) { const ix = x + w * .55 + k * w * .12 + rnd(i * 5 + k, 6) * w * .04; g.moveTo(ix, base - hh + w * .03 - k * w * .02); g.lineTo(ix, base - hh + w * .03 - k * w * .02 + hh * (.1 + .14 * rnd(i * 5 + k, 7))); }
    g.stroke();
    litSpots.push({ ...win, k: i });
    // 家の前の雪の吹きだまり
    face(g, [x - w * .75, base + d, x - w * .55, base - hh * .18, x - w * .1, base - hh * .1, x + w * .2, base + d], lit(V, SNOW, unit([0, .8, .6]), dist));
  }
  // 手前の雪原: なだらかな起伏（光の面は白く、陰の面は空の青を受ける）
  drawMesh(V, rangeMesh("s-near", u => .9 + .025 * Math.sin(u * 4.1 + .5) + .01 * Math.sin(u * 13), 1.08, .06, 3, 1.2), () => SNOW, .3, undefined, .45);
  // 手前の杉
  for (const [i, u] of [-.02, .06, .93, 1.01].entries()) conifer(V, X(u), Y(1.04), gh * (.3 + .06 * rnd(i, 4)), [40, 56, 48], .3, .85);
  // 街灯
  const sx = X(.7), sy = Y(.92), sh = gh * .2;
  face(g, [sx - d * .8, sy, sx + d * .8, sy, sx + d * .8, sy - sh, sx - d * .8, sy - sh], lit(V, [44, 47, 53], N_FRONT, .4));
  face(g, [sx - d * .8, sy - sh, sx + gh * .03, sy - sh, sx + gh * .03, sy - sh + d * 1.2, sx - d * .8, sy - sh + d * 1.2], lit(V, [44, 47, 53], N_FRONT, .4));
  face(g, [sx - d * 1.4, sy - sh - d * .2, sx + gh * .034, sy - sh - d * .2, sx + gh * .03, sy - sh - d * 1.6, sx - d, sy - sh - d * 1.6], lit(V, SNOW, N_UP, .4));
  litSpots.push({ x: sx + gh * .026, y: sy - sh + d * 2.4, w: 0, h: sy, k: -1 });
}
function snowLive(V: View) {
  const { g, d, t, X, Y, gh, day } = V;
  const lit2 = clamp(lampsOn(V) + .08);
  for (const s of litSpots) {
    if (s.k < 0) {
      if (lit2 > .1) {
        glow(g, s.x, s.y, gh * .12, [255, 214, 150], .5 * lit2);
        const cone = g.createLinearGradient(0, s.y, 0, s.h); cone.addColorStop(0, rgba([255, 220, 160], .2 * lit2)); cone.addColorStop(1, rgba([255, 220, 160], 0));
        g.fillStyle = cone; fillPoly(g, [s.x - d, s.y, s.x + d, s.y, s.x + gh * .07, s.h, s.x - gh * .07, s.h]);
        g.fillStyle = rgba([255, 226, 180], .25 * lit2); g.beginPath(); g.ellipse(s.x, s.h, gh * .08, gh * .012, 0, 0, Math.PI * 2); g.fill();
      }
      continue;
    }
    if (lit2 > .05) {
      glow(g, s.x + s.w / 2, s.y + s.h / 2, gh * .05, [255, 190, 110], .45 * lit2);
      g.fillStyle = rgba([255, 206, 140], .92 * lit2); g.fillRect(s.x, s.y, s.w, s.h);
      g.fillStyle = rgba([60, 44, 34], .9); g.fillRect(s.x + s.w / 2 - d * .3, s.y, d * .6, s.h);
      // 窓の明かりが雪に落ちる
      g.fillStyle = rgba([255, 200, 130], .12 * lit2); fillPoly(g, [s.x, s.y + s.h, s.x + s.w, s.y + s.h, s.x + s.w * 1.6, s.y + s.h * 3, s.x - s.w * .6, s.y + s.h * 3]);
    }
  }
  // 雪面のきらめき（晴れた昼）
  if (day > .5 && V.wet < .5 && !V.calm) { g.fillStyle = "rgba(255,255,255,.95)"; for (let i = 0; i < 50; i++) { if (Math.sin(t * (2 + rnd(i, 98) * 3) + i * 7) < .93) continue; g.fillRect(X(rnd(i, 99)), Y(.9 + rnd(i, 100) * .1), d, d); } }
}

// ======================= 川沿いの街 =======================
// 川を下流へ見通す。川の両岸に建物が奥へ並び、遠くを鉄橋が横切る
const RV = .56;
const ru = (L: number, z: number) => .5 + L * .5 / z, rv = (z: number) => RV + (1 - RV) / z;
const RIVER = 1.05, WALL = 1.75, DEPTH = 1.2;
const BLOCKS = (() => {
  const out: { side: number; z0: number; z1: number; h: number; c: number }[] = [];
  for (const side of [-1, 1]) { let z = 1.5; let i = side > 0 ? 100 : 0; while (z < 40) { const len = z * (.22 + rnd(i, 1) * .35); out.push({ side, z0: z, z1: z + len, h: .35 + rnd(i, 2) * rnd(i, 5) * 2, c: rnd(i, 3) }); z += len * (1 + rnd(i, 4) * .1); i++; } }
  return out.sort((a, b) => b.z0 - a.z0);
})();
const BRIDGE_Z = 6.5;
interface Refl { x: number; y: number; c: RGB; s: number; k: number }
let reflections: Refl[] = [];
let bridgeBox: number[] = [];
function riverBase(V: View) {
  const { g, d, X, Y, gw, gh, season: S } = V;
  const P = (L: number, z: number, hgt = 0): [number, number] => [X(ru(L, z)), Y(rv(z)) - hgt * gw * .5 / z];
  const hor = Y(RV);
  // 遠くの街並み（地平線の上）
  g.fillStyle = rgba(fogged(V, lit(V, [130, 136, 148], N_FRONT), 6));
  for (let i = 0; i < 50; i++) { const u = i / 50, hh = .01 + rnd(i, 17) ** 2 * .07; g.fillRect(X(u), hor - gh * hh, gw / 50 + 1, gh * hh + d); }
  // 岸（遊歩道）: 石畳の上を向いた面
  for (const s of [-1, 1]) face(g, [...P(s * RIVER, 1), ...P(s * WALL * 1.8, 1), ...P(s * WALL * 1.8, 40), ...P(s * RIVER, 40)], lit(V, [128, 122, 112], N_UP, 1.5));
  // 川面: 空を映す。奥は明るく（空の低いところ）、手前は暗い（空の高いところ）
  const water = [...P(-RIVER, 1), ...P(RIVER, 1), ...P(RIVER, 60), ...P(-RIVER, 60)];
  const deep = mixN("#2c4a52", "#3c4a50", S.wi);
  const wg = g.createLinearGradient(0, hor, 0, V.y1);
  wg.addColorStop(0, rgba(fogged(V, mixN(V.bottom, deep, .2), 3))); wg.addColorStop(.4, rgba(mixN(mixN(V.bottom, V.top, .5), lit(V, deep, N_UP), .45))); wg.addColorStop(1, rgba(mixN(V.top, lit(V, deep, N_UP), .6)));
  g.fillStyle = wg; g.beginPath(); polyPath(g, water); g.fill();
  // 護岸: 川へ落ちる石垣の面
  for (const s of [-1, 1]) face(g, [...P(s * RIVER, 1), ...P(s * RIVER, 60), ...P(s * RIVER * .97, 60), ...P(s * RIVER * .97, 1, -.06)], lit(V, [110, 108, 100], nSide(-s), 1));
  // 両岸の建物（奥から）: 川に向いた壁・手前の妻面・屋上。川面に逆さに映る
  reflections = [];
  const walls: { pts: number[]; c: RGB }[] = [];
  for (const [i, b] of BLOCKS.entries()) {
    const L = b.side * WALL, L2 = b.side * (WALL + DEPTH);
    const [x0, y0] = P(L, b.z0), [x1, y1] = P(L, b.z1), [, t0] = P(L, b.z0, b.h), [, t1] = P(L, b.z1, b.h);
    const dist = .3 + b.z0 * .22, base = mixN(hex(FACADE[Math.floor(b.c * FACADE.length)]), [0, 0, 0], rnd(i, 7) * .1);
    const wallC = lit(V, base, nSide(-b.side), dist);
    // 手前の妻面（こちらを向く）
    const [ex] = P(L2, b.z0), [, et] = P(L2, b.z0, b.h);
    face(g, [x0, y0, ex, P(L2, b.z0)[1], ex, et, x0, t0], lit(V, mixN(base, [0, 0, 0], .04), N_FRONT, dist));
    {
      const floors = Math.max(1, Math.round(b.h / .16)), cols = 4, ey = P(L2, b.z0)[1];
      for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
        const k = (c + .5) / cols, xx = x0 + (ex - x0) * k, yb2 = y0 + (ey - y0) * k, yt = t0 + (et - t0) * k, y = yb2 + (yt - yb2) * (f + .5) / floors;
        const ww = Math.abs(ex - x0) / cols * .45, hh2 = Math.abs(yt - yb2) / floors * .4;
        g.fillStyle = rgba(fogged(V, mixN(mixN(V.top, V.bottom, .5), [30, 40, 52], .4 + .4 * V.night), dist), .75); g.fillRect(xx - ww / 2, y - hh2 / 2, ww, hh2);
        litSpots.push({ x: xx - ww / 2, y: y - hh2 / 2, w: ww, h: hh2, k: i * 13 + 500 + f * 7 + c });
      }
    }
    // 川に向いた壁（奥へすぼまる台形）
    face(g, [x0, y0, x1, y1, x1, t1, x0, t0], wallC);
    walls.push({ pts: [x0, y0, x1, y1, x1, y1 + (y1 - t1), x0, y0 + (y0 - t0)], c: wallC });
    // 屋上（目より低いときだけ見える）
    if (t0 > hor) face(g, [x0, t0, x1, t1, P(L2, b.z1, b.h)[0], P(L2, b.z1, b.h)[1], ex, et], lit(V, mixN(base, [100, 100, 100], .5), N_UP, dist));
    // 窓: 各階の横筋（昼は空を映すガラス）
    const floors = Math.max(1, Math.round(b.h / .16)), wn = Math.max(3, Math.round((b.z1 - b.z0) / b.z0 * 14));
    for (let f = 0; f < floors; f++) for (let k = 0; k < wn; k++) {
      const fz = b.z0 + (b.z1 - b.z0) * (k + .5) / wn, [wx, wy] = P(L, fz, b.h * (f + .5) / floors), s = Math.max(.8, gw * .022 / fz);
      g.fillStyle = rgba(fogged(V, mixN(mixN(V.top, V.bottom, .5), [30, 40, 52], .4 + .4 * V.night), dist), .7); g.fillRect(wx - s / 2, wy - s / 2, s, s * .8);
      reflections.push({ x: wx, y: Y(rv(fz)), c: [0, 0, 0], s, k: i * 13 + f * 7 + k + (f === 0 || rnd(i + f, k + 9) > .7 ? 0 : .5) });
      litSpots.push({ x: wx - s / 2, y: wy - s / 2, w: s, h: s * .8, k: i * 13 + f * 7 + k });
    }
  }
  // 建物の映り込み（逆さ。川面の色に溶ける）
  g.save(); g.beginPath(); polyPath(g, water); g.clip();
  for (const w of walls) { face(g, w.pts, mixN(w.c, mixN(V.top, V.bottom, .5), .45), .5); }
  g.restore();
  // 並木: 春は桜、夏は青葉、秋は黄葉、冬は枯れ枝
  const sakura = bell(S.doy, 95, 11);
  for (const s of [-1, 1]) for (let z = 1.25; z < 30; z *= 1.32) {
    const [x, y] = P(s * 1.38, z), r = gw * .07 / z, dist = .2 + z * .2;
    let c = treeColor(S, rnd(z * 10, s + 2) * .8);
    c = mixN(c, "#f2c9d4", sakura);
    if (S.wi > .5) {
      g.strokeStyle = rgba(lit(V, "#3a302a", N_FRONT, dist)); g.lineWidth = Math.max(.6, gw * .01 / z); g.beginPath();
      g.moveTo(x, y); g.lineTo(x, y - r * 1.4);
      for (const a of [-.6, -.2, .3, .7]) { g.moveTo(x, y - r); g.lineTo(x + Math.sin(a) * r, y - r * 1.4 - Math.cos(a) * r * .9); }
      g.stroke();
    } else broadleaf(V, x, y, r, c, dist);
  }
  // 街灯の柱
  for (const s of [-1, 1]) for (let z = 1.5; z < 30; z *= 1.45) {
    const [x, y] = P(s * 1.15, z), hh = gw * .22 / z, w = Math.max(1, d * 1.2 / Math.sqrt(z));
    face(g, [x - w / 2, y, x + w / 2, y, x + w / 2, y - hh, x - w / 2, y - hh], lit(V, [46, 49, 54], N_FRONT, .2 + z * .2));
    reflections.push({ x, y: Y(rv(z)), c: [255, 210, 150], s: gw * .02 / z, k: -1 });
    litSpots.push({ x, y: y - hh, w: gw * .05 / Math.sqrt(z), h: 0, k: -1 });
  }
  // 鉄橋: 橋脚と桁
  const [bl, by] = P(-WALL * 1.5, BRIDGE_Z), [br] = P(WALL * 1.5, BRIDGE_Z), s1 = gw * .5 / BRIDGE_Z;
  const deck = by - s1 * .45, th = s1 * .07, tr = s1 * .22;
  for (let i = 0; i <= 4; i++) { const px = bl + (br - bl) * i / 4; box(V, px - s1 * .04, by, s1 * .08, by - deck, [120, 122, 126], 2, px < X(.5) ? 1 : -1, s1 * .02, 0); }
  face(g, [bl, deck, br, deck, br, deck + th, bl, deck + th], lit(V, [90, 94, 100], N_FRONT, 2));
  g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(X(ru(-RIVER, BRIDGE_Z)), by, X(ru(RIVER, BRIDGE_Z)) - X(ru(-RIVER, BRIDGE_Z)), s1 * .06);
  bridgeBox = [bl, br, deck, tr, s1];
  truss(V);
}
function truss(V: View) {
  const { g } = V, [bl, br, deck, tr, s1] = bridgeBox;
  g.strokeStyle = rgba(lit(V, [96, 102, 110], N_FRONT, 2)); g.lineWidth = Math.max(.6, s1 * .016); g.beginPath();
  const n = 16; g.moveTo(bl, deck - tr); g.lineTo(br, deck - tr);
  for (let i = 0; i < n; i++) { const xa = bl + (br - bl) * i / n, xb = bl + (br - bl) * (i + 1) / n; g.moveTo(xa, deck); g.lineTo(xb, deck - tr); g.moveTo(xb, deck); g.lineTo(xb, deck - tr); }
  g.stroke();
}
function riverLights(V: View) {
  const { g, t } = V, on = lampsOn(V), warm = lampColor(V);
  if (on > .02) for (const s of litSpots) {
    if (s.k < 0) { glow(g, s.x, s.y, s.w, [255, 210, 150], .6 * on); continue; }
    if (rnd(s.k, Math.floor(t / (50 + (s.k % 6) * 9)) + 1) < .55) continue;
    const c = rnd(s.k, 2) > .8 ? [207, 226, 255] : warm;
    g.fillStyle = rgba(c, on * (.5 + .35 * rnd(s.k, 3))); g.fillRect(s.x, s.y, s.w, s.h);
  }
}
function riverLive(V: View) {
  const { g, d, t, X, Y, gw, gh, night } = V;
  const P = (L: number, z: number): [number, number] => [X(ru(L, z)), Y(rv(z))];
  const water = [...P(-RIVER, 1), ...P(RIVER, 1), ...P(RIVER, 60), ...P(-RIVER, 60)], hor = Y(RV);
  const on = lampsOn(V), warm = lampColor(V);
  g.save(); g.beginPath(); polyPath(g, water); g.clip();
  // さざ波: 空の明るいところを映す細い筋
  for (let i = 0; i < 70; i++) {
    const z = 1 + Math.pow(rnd(i, 21), 2) * 20, L = (rnd(i, 22) * 2 - 1) * RIVER + (V.calm ? 0 : Math.sin(t * .2 + i) * .05);
    const [x, y] = P(L, z), len = gw * .08 / z * (.5 + rnd(i, 23)), a = (V.calm ? .5 : clamp(Math.sin(t * .6 + i * 1.3) * .7 + .35)) * (.16 - .07 * night);
    g.fillStyle = rgba(mixN(V.bottom, [255, 255, 255], .4), a); g.fillRect(x - len / 2, y, len, Math.max(.6, d * .8 / Math.sqrt(z)));
  }
  for (const b of [V.sun, V.moon]) if (b && b.y < hor) glitter(V, b.x, RV + .01, 1.02, b === V.sun ? mixN([255, 240, 210], [255, 170, 100], b.low) : [235, 228, 205], (b === V.sun ? .55 : .4 * night) * (1 - V.wet * .8), .1, 5);
  // 灯りの映り込み: 縦にのびて揺れる
  if (on > .05) for (const r of reflections) {
    if (r.k >= 0) { if (r.k % 1 || rnd(Math.floor(r.k), Math.floor(t / (50 + (Math.floor(r.k) % 6) * 9)) + 1) < .55) continue; }
    const c = r.k < 0 ? r.c : warm, len = Math.min(gh * .2, (V.y1 - r.y) * .6) * .8;
    for (let j = 0; j < 5; j++) { const yy = r.y + len * (j + .5) / 5, wob = V.calm ? 0 : Math.sin(t * 2 + yy * .2 + r.x) * r.s * .8; g.fillStyle = rgba(c, .24 * on * (1 - j / 5) * (1 - V.wet * .4)); g.fillRect(r.x - r.s * .8 + wob, yy, r.s * 1.6, len / 5 * .6); }
  }
  g.restore();
  // 電車: ときどき橋を渡る（夜は窓が光る）。手前の鉄骨をもう一度重ねる
  const [bl, br, deck, tr] = bridgeBox, cyc = 70, k = ((t + 20) % cyc) / 9;
  if (bl !== undefined && k < 1 && !V.calm) {
    const len = (br - bl) * .55, x0 = bl - len + k * (br - bl + len), ch = tr * .62;
    g.save(); g.beginPath(); g.rect(bl, deck - tr * 1.2, br - bl, tr * 1.2); g.clip();
    face(g, [x0, deck - d, x0 + len, deck - d, x0 + len, deck - ch - d, x0, deck - ch - d], lit(V, [200, 204, 208], N_FRONT, 2));
    g.fillStyle = rgba(lit(V, [58, 138, 90], N_FRONT, 2)); g.fillRect(x0, deck - ch * .35 - d, len, ch * .12);
    for (let w = 0; w < 18; w++) { const wx = x0 + len * (w + .3) / 18; g.fillStyle = on > .2 ? rgba([255, 236, 190], .9 * on) : rgba(mixN(V.top, [30, 40, 50], .5), .8); g.fillRect(wx, deck - ch * .85 - d, len / 18 * .5, ch * .35); }
    g.restore();
    truss(V);
  }
}

// ======================= まとめ =======================
const BASE: Record<SceneKey, (V: View) => void> = { city: cityBase, sea: seaBase, mountain: mountainBase, field: fieldBase, snow: snowBase, river: riverBase };
const LIVE: Record<SceneKey, (V: View) => void> = { city: cityLive, sea: seaLive, mountain: mountainLive, field: fieldLive, snow: snowLive, river: riverLive };
// 窓の灯り（点いたり消えたりはゆっくり）は、3 秒ごとに描き直す別の層に
const LIGHTS: Partial<Record<SceneKey, (V: View) => void>> = { city: cityLights, river: riverLights };
let cache: { key: string; c: HTMLCanvasElement; spots: Win[]; refl: Refl[]; bridge: number[] } | null = null;
let lightCache: { key: string; c: HTMLCanvasElement } | null = null;
/** 景色を描く。動かない部分は、光や大きさが変わるまで裏のキャンバスを使い回す */
export function drawScene(key: SceneKey, V: View) {
  const { g } = V, W = g.canvas.width, H = g.canvas.height;
  const ck = [key, W, H, Math.round(V.X(0)), Math.round(V.gw), Math.round(V.gh), Math.round(V.y1), Math.round(V.h * 20), Math.round(V.wet * 24), Math.round(V.season.doy), V.accent].join("|");
  if (!cache || cache.key !== ck) {
    const c = cache?.c ?? document.createElement("canvas");
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } else c.getContext("2d")!.clearRect(0, 0, W, H);
    const o = c.getContext("2d")!;
    litSpots = [];
    BASE[key]({ ...V, g: o });
    cache = { key: ck, c, spots: litSpots, refl: reflections, bridge: bridgeBox };
  }
  litSpots = cache.spots; reflections = cache.refl; bridgeBox = cache.bridge;
  g.drawImage(cache.c, 0, 0);
  const L = LIGHTS[key];
  if (L && lampsOn(V) > .02) {
    const lk = ck + "|" + Math.floor(V.t / 3);
    if (!lightCache || lightCache.key !== lk) {
      const c = lightCache?.c ?? document.createElement("canvas");
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } else c.getContext("2d")!.clearRect(0, 0, W, H);
      L({ ...V, g: c.getContext("2d")! });
      lightCache = { key: lk, c };
    }
    g.drawImage(lightCache.c, 0, 0);
  }
  LIVE[key](V);
}

/** 外に降るもの: 雪国はいつも雪（雨の日は本降り）。山と田園は真冬なら雨が雪になる */
export function precipitation(key: SceneKey, V: View): { kind: "rain" | "snow"; amt: number } {
  if (key === "snow") return { kind: "snow", amt: Math.max(V.wet, .3 + .25 * Math.sin(V.t / 400)) };
  if ((key === "mountain" || key === "field") && V.season.wi > .6) return { kind: "snow", amt: V.wet };
  return { kind: "rain", amt: V.wet };
}
/** 降る雪: 手前の粒ほど大きく速く、左右にゆれる。手前の大きな粒は少しぼける */
export function snowfall(V: View, amt: number) {
  const { g, d, t, X, Y } = V;
  const n = Math.round(170 * amt);
  for (let i = 0; i < n; i++) {
    const k = rnd(i, 31), sp = .025 + .05 * k, s = (.5 + 2 * k * k) * d;
    const y = (((rnd(i, 32) + (V.calm ? 0 : t * sp)) % 1.15) - .08);
    const x = ((rnd(i, 33) + (V.calm ? 0 : Math.sin(t * (.4 + k * .5) + i) * .015 * (.3 + k) + t * .003)) % 1.1) - .05;
    const c = mixN([246, 249, 253], V.lt.haze, (1 - k) * .4);
    g.fillStyle = rgba(c, (.4 + .5 * k) * (1 - V.night * .3) * (k > .85 ? .6 : 1));
    g.beginPath(); g.arc(X(x), Y(y), s, 0, Math.PI * 2); g.fill();
  }
}
