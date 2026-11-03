// 窓の外の景色。空（色・太陽と月・雲・鳥）は窓辺が描き、ここではその下の地上を描く
// どの景色も、時刻（昼夜・朝夕の色）・季節（日付から）・雨（曇って霞む）に合わせて色や様子が変わる

export type RGB = number[];
export const hex = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const mixN = (a: string | RGB, b: string | RGB, t: number): RGB => {
  const x = typeof a === "string" ? hex(a) : a, y = typeof b === "string" ? hex(b) : b;
  return x.map((v, i) => v + (y[i] - v) * t);
};
export const rgba = (c: RGB, a = 1) => `rgba(${c.map(Math.round).join(",")},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
export const mix = (a: string | RGB, b: string | RGB, t: number) => rgba(mixN(a, b, t));
/** 固定の乱数（同じ i, n なら毎回同じ値） */
export const rnd = (i: number, n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));


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
export interface View {
  g: CanvasRenderingContext2D; d: number; t: number; h: number;
  X: (u: number) => number; Y: (v: number) => number; gw: number; gh: number;
  /** 塗る範囲（窓の開口の左右と下端） */
  x0: number; x1: number; y1: number;
  night: number; day: number; wet: number;
  top: RGB; bottom: RGB; accent: string; calm: boolean;
  season: Season; sun: Body | null; moon: Body | null;
}

const NIGHT: RGB = [14, 18, 30];
/** 地上の色: 夜は沈み、遠いほど空の色に溶け、雨の日は灰色に霞む */
function tone(V: View, c: string | RGB, haze = 0, nightK = .86): RGB {
  let x = mixN(c, NIGHT, nightK * V.night);
  x = mixN(x, V.bottom, clamp(haze * (1 + V.wet * .7), 0, .95));
  if (V.wet > 0) { const m = (x[0] + x[1] + x[2]) / 3; x = mixN(x, [m * .86, m * .88, m * .93], .45 * V.wet); }
  return x;
}
const fillPoly = (g: CanvasRenderingContext2D, p: number[]) => { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); };
/** やわらかい光の点（灯り） */
function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number) {
  if (a <= .005) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(c, a)); gr.addColorStop(.35, rgba(c, a * .35)); gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
/** 稜線: いくつかの波を重ねた、なだらかで不規則な線（v を返す） */
const ridge = (seed: number, base: number, amp: number, rough = 1, peaky = 0) => (u: number) => {
  let s = 0, a = 1, f = 1.3 + rnd(seed, 1) * .6, n = 0;
  for (let k = 0; k < 5; k++) {
    const w = Math.sin(u * f * 6.283 + rnd(seed, k + 2) * 6.283);
    s += (peaky && k < 2 ? w + ((1 - Math.abs(w)) * 2 - 1 - w) * peaky : w) * a; n += a; a *= .5 * rough; f *= 2.03;
  }
  return base - amp * clamp(s / n * (.5 + peaky * .3) + .5);
};
function ridgeFill(V: View, f: (u: number) => number, fill: string | CanvasGradient, step = .006) {
  const { g, X, Y } = V;
  g.fillStyle = fill; g.beginPath(); g.moveTo(V.x0 - 2, V.y1 + 2);
  for (let u = (V.x0 - V.X(0)) / V.gw - .02; u <= (V.x1 - V.X(0)) / V.gw + .02; u += step) g.lineTo(X(u), Y(f(u)));
  g.lineTo(V.x1 + 2, V.y1 + 2); g.closePath(); g.fill();
}
/** 遠景の霧・もや: 朝と、雨の日に濃い */
function mist(V: View, v0: number, v1: number, k: number) {
  if (k < .02) return;
  const { g, Y, t } = V;
  const c = mixN(V.bottom, [235, 238, 242], .35 * V.day);
  const gr = g.createLinearGradient(0, Y(v0), 0, Y(v1));
  gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(.5, rgba(c, .55 * k)); gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr; g.fillRect(V.x0, Y(v0), V.x1 - V.x0, Y(v1) - Y(v0));
  // ゆっくり流れる霧のかたまり
  for (let i = 0; i < 5; i++) {
    const u = ((rnd(i, 61) + (V.calm ? 0 : t * .002 * (1 + rnd(i, 62)))) % 1.4) - .2, v = v0 + (v1 - v0) * (.3 + .4 * rnd(i, 63));
    const rx = V.gw * (.18 + .12 * rnd(i, 64)), ry = (Y(v1) - Y(v0)) * .22;
    const e = g.createRadialGradient(V.X(u), Y(v), 0, V.X(u), Y(v), rx);
    e.addColorStop(0, rgba(c, .3 * k)); e.addColorStop(1, rgba(c, 0));
    g.save(); g.translate(V.X(u), Y(v)); g.scale(1, ry / rx); g.translate(-V.X(u), -Y(v));
    g.fillStyle = e; g.fillRect(V.X(u) - rx, Y(v) - rx, rx * 2, rx * 2); g.restore();
  }
}
/** 水面に映る光の道（太陽・月・灯り）。x を中心に、手前ほど広がってきらめく */
function glitter(V: View, x: number, vTop: number, vBot: number, c: RGB, a: number, spread = .22, seed = 0) {
  if (a < .01) return;
  const { g, d, t, gw, Y } = V;
  for (let i = 0; i < 46; i++) {
    const k = rnd(i + seed, 41), v = vTop + (vBot - vTop) * k * k, near = (v - vTop) / (vBot - vTop);
    const w = gw * (.01 + spread * near) * (rnd(i + seed, 42) - .5) * 2 * (.4 + .6 * rnd(i + seed, 45));
    const fl = V.calm ? .6 : clamp(Math.sin(t * (1.5 + rnd(i + seed, 43) * 2) + i) * .8 + .3);
    g.fillStyle = rgba(c, a * fl * (1 - near * .5));
    g.fillRect(x + w - gw * .012 * (.4 + near), Y(v), gw * .024 * (.4 + near) * (.5 + rnd(i + seed, 44)), Math.max(.6, d * (.6 + near)));
  }
}

// ======================= 街 =======================
const city = (n: number, seed: number) => {
  const out: { x: number; w: number; h: number }[] = []; let x = -.02, i = 0;
  while (x < 1.02) { const w = .035 + rnd(i + seed, 1) * .07; out.push({ x, w, h: .04 + rnd(i + seed, 2) * n }); x += w + rnd(i + seed, 3) * .01; i++; }
  return out;
};
const FAR = city(.24, 50), NEAR = city(.16, 90);
const TOWER = .71; // 赤い灯りの鉄塔（横位置）

/** ビルの窓の灯り: ゆっくり点いたり消えたりする */
function litWindows(V: View, i: number, bx: number, by: number, bw: number, bh: number, gap: number, k = 1) {
  const { g, d, t, night, accent } = V;
  if (night < .15) return;
  const cols = Math.max(1, Math.floor(bw / (gap * d))), rows = Math.max(1, Math.floor(bh / (gap * d)));
  for (let cx = 0; cx < cols; cx++) for (let ry = 0; ry < rows; ry++) {
    if (rnd(i * 31 + cx * 7 + ry, Math.floor(t / (40 + (cx + ry) * 7)) + 1) <= .62) continue;
    g.globalAlpha = night * (.45 + .3 * rnd(i + cx, ry)) * k;
    g.fillStyle = rnd(i, cx + ry) > .8 ? "#cfe2ff" : accent;
    g.fillRect(bx + (cx + .35) * (bw / cols), by + (ry + .4) * (bh / rows), 1.6 * d, 1.6 * d);
  }
  g.globalAlpha = 1;
}
function drawCity(V: View) {
  const { g, d, t, X, Y, gw, gh, night } = V;
  const hor = Y(1), ext = V.y1 - hor + d;
  g.fillStyle = rgba(mixN(V.bottom, "#1a1e2a", .6), .8);
  for (const b of FAR) g.fillRect(X(b.x), hor - gh * (b.h + .06), gw * b.w + 1, gh * (b.h + .06) + ext);
  const tx = X(TOWER), ty = hor - gh * .42;
  g.strokeStyle = "rgba(20,24,32,.7)"; g.lineWidth = d;
  g.beginPath(); g.moveTo(tx - gh * .03, hor); g.lineTo(tx, ty); g.lineTo(tx + gh * .03, hor); g.moveTo(tx - gh * .02, hor - gh * .14); g.lineTo(tx + gh * .02, hor - gh * .14); g.stroke();
  if (night > .2 && Math.sin(t * 2.4) > .3) { g.fillStyle = "#ff5a4a"; g.shadowColor = "#ff5a4a"; g.shadowBlur = 8 * d; g.beginPath(); g.arc(tx, ty, 1.4 * d, 0, 7); g.fill(); g.shadowBlur = 0; }
  NEAR.forEach((b, i) => {
    const bx = X(b.x), bw = gw * b.w, by = hor - gh * b.h;
    g.fillStyle = "rgba(14,16,24,.92)"; g.fillRect(bx, by, bw - d, gh * b.h + ext);
    litWindows(V, i, bx, by, bw, gh * b.h, 5);
  });
}

// ======================= 海辺 =======================
const CAPE = ridge(7, .64, .025, .7);
const capeTop = (u: number) => { const s = clamp((u - .6) / .42); return s <= 0 ? .64 : Math.min(.64, CAPE(u) - .05 * Math.pow(Math.sin(s * Math.PI * .5), .7)); };
function drawSea(V: View) {
  const { g, d, t, X, Y, gw, gh, night, day, wet, season: S } = V;
  const hv = .64, hor = Y(hv), shore = (u: number) => .9 + .018 * Math.sin(u * 3.2 + 1) + .008 * Math.sin(u * 11);
  // 海: 水平線の近くは空を映して明るく、手前ほど深い色。夏は青く澄み、冬は鈍い鋼色
  const deep = tone(V, mixN(mixN("#2a5878", "#1d5f92", S.su), "#34495e", S.wi), 0, .9);
  const sea = g.createLinearGradient(0, hor, 0, V.y1);
  sea.addColorStop(0, rgba(mixN(V.bottom, deep, .62))); sea.addColorStop(.35, rgba(mixN(V.bottom, deep, .86))); sea.addColorStop(1, rgba(mixN(deep, NIGHT, .25)));
  g.fillStyle = sea; g.fillRect(V.x0, hor, V.x1 - V.x0, V.y1 - hor);
  g.fillStyle = rgba(mixN(deep, NIGHT, .2), .5); g.fillRect(V.x0, hor, V.x1 - V.x0, Math.max(.6, d * .6)); // 水平線のきわ
  // 遠くの島
  g.fillStyle = rgba(tone(V, "#6d8296", .62));
  g.beginPath(); g.moveTo(X(.08), hor); g.quadraticCurveTo(X(.12), hor - gh * .028, X(.17), hor - gh * .018); g.quadraticCurveTo(X(.2), hor - gh * .012, X(.23), hor); g.fill();
  // 波: 手前ほど間隔が広く、明暗がゆっくり入れ替わる
  for (let i = 0; i < 70; i++) {
    const k = rnd(i, 11), v = hv + (shore(.5) - hv) * k * k, near = (v - hv) / (shore(.5) - hv);
    const u = (rnd(i, 12) + (V.calm ? 0 : t * .0015 * (1 + near))) % 1.1 - .05, len = gw * (.015 + .07 * near) * (.5 + rnd(i, 13));
    const a = (V.calm ? .5 : clamp(Math.sin(t * .45 + i * 1.7) * .7 + .35)) * (.07 + .1 * near) * (1 - night * .6);
    g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; g.fillRect(X(u), Y(v), len, Math.max(.6, d * (.5 + near)));
    g.fillStyle = `rgba(0,10,20,${(a * .8).toFixed(3)})`; g.fillRect(X(u) + len * .1, Y(v) + d * (.6 + near), len * .8, Math.max(.6, d * .6));
  }
  // 太陽・月の光の道
  const bodyPath = (b: Body | null, c: RGB, a: number) => { if (b && b.y < hor) glitter(V, b.x, hv + .004, shore(.5), c, a * (1 - wet * .85), .14 + .1 * b.low); };
  bodyPath(V.sun, mixN([255, 246, 220], [255, 170, 100], V.sun?.low ?? 0), .55 + .3 * (V.sun?.low ?? 0));
  bodyPath(V.moon, [240, 232, 210], .45 * night);
  // 夏の夜の漁火: 水平線に並ぶ白い灯り
  const fish = night * (.25 + .75 * S.su) * (1 - wet * .7);
  if (fish > .05) for (let i = 0; i < 9; i++) {
    if (rnd(i, 51) > .25 + .75 * S.su) continue;
    const x = X(.04 + .52 * rnd(i, 52) + (V.calm ? 0 : Math.sin(t * .01 + i) * .006)), y = hor - d * .4;
    glow(g, x, y, gh * .04, [255, 250, 225], .5 * fish);
    g.fillStyle = rgba([255, 252, 236], .9 * fish); g.fillRect(x - d * .6, y - d * .6, d * 1.2, d * 1.2);
    g.fillStyle = rgba([255, 245, 210], .18 * fish); g.fillRect(x - d * .4, hor + d, d * .8, gh * .05 * (.6 + rnd(i, 53)));
  }
  // 昼は小さな漁船がゆっくり横切る
  if (day > .4) {
    const k = ((t / 240) + .3) % 1, bx = X(-.05 + k * 1.1), by = Y(.69), s = gh * .012;
    if (bx < X(.6)) {
      g.fillStyle = rgba(tone(V, "#e8e4da", .25)); fillPoly(g, [bx - s * 2.2, by - s * .6, bx + s * 2.2, by - s * .6, bx + s * 1.6, by + s * .4, bx - s * 1.8, by + s * .4]);
      g.fillStyle = rgba(tone(V, "#5a6470", .25)); g.fillRect(bx - s * .3, by - s * 1.8, s * 1.2, s * 1.2);
      g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(bx - s * 3.5, by + s * .5, s * 2, Math.max(.6, d * .5));
    }
  }
  // 右手の岬と灯台
  g.fillStyle = rgba(tone(V, mixN("#3f5a48", "#5b5b48", S.au * .6 + S.wi * .4), .38)); g.beginPath(); g.moveTo(X(.6), hor + d);
  for (let u = .6; u <= 1.06; u += .004) g.lineTo(X(u), Y(capeTop(u)));
  g.lineTo(X(1.06), hor + d); g.closePath(); g.fill();
  // 岬の木々のでこぼこ
  g.fillStyle = rgba(tone(V, "#2f4a3a", .3));
  for (let i = 0; i < 26; i++) { const u = .66 + i * .016, v = capeTop(u); if (v < hv) { g.beginPath(); g.arc(X(u), Y(v) + d, gh * (.008 + .008 * rnd(i, 3)), Math.PI, 0); g.fill(); } }
  const lu = .9, lx = X(lu), lb = Y(capeTop(lu)) + d, lh = gh * .085, lw = Math.max(1.5 * d, gw * .011);
  g.fillStyle = rgba(tone(V, "#ece8de", .2, .75));
  fillPoly(g, [lx - lw, lb, lx + lw, lb, lx + lw * .65, lb - lh, lx - lw * .65, lb - lh]);
  g.fillStyle = rgba(tone(V, "#b9473c", .2, .75)); g.fillRect(lx - lw * .78, lb - lh * .55, lw * 1.56, lh * .12); // 赤い帯
  g.fillStyle = rgba(tone(V, "#3b3f45", .2, .7)); g.fillRect(lx - lw * .9, lb - lh - lw * 1.3, lw * 1.8, lw * 1.3); g.fillRect(lx - lw * .5, lb - lh - lw * 2, lw, lw * .7);
  if (night > .15) {
    // 灯台の光: 回る光の束。こちらを向いた瞬間にまぶしく光る
    const a = V.calm ? 2.2 : t * .7, ly = lb - lh - lw * .65, k = clamp((night - .15) * 1.5);
    const facing = Math.pow(Math.max(0, Math.sin(a)), 6), len = gw * .9 * Math.cos(a);
    const beam = g.createLinearGradient(lx, ly, lx + len, ly);
    beam.addColorStop(0, rgba([255, 244, 200], .32 * k * (1 - facing * .5))); beam.addColorStop(1, rgba([255, 244, 200], 0));
    g.fillStyle = beam; fillPoly(g, [lx, ly - d, lx + len, ly - gh * .06, lx + len, ly + gh * .045, lx, ly + d]);
    glow(g, lx, ly, gh * (.05 + .25 * facing), [255, 240, 196], k * (.5 + .5 * facing));
    if (facing > .2) glitter(V, lx, hv + .01, shore(.8), [255, 240, 200], .5 * facing * k, .04, 9);
  }
  // 砂浜: 濡れた砂の帯と、寄せては返す波の泡
  const sand = tone(V, mixN("#d3bf98", "#a9a397", S.wi * .7), .05, .8), wetSand = mixN(sand, [60, 60, 66], .3);
  const surf = V.calm ? 0 : Math.sin(t * .33) * .012 + Math.sin(t * .71) * .004;
  ridgeFill(V, u => shore(u) - .012, rgba(wetSand), .02);
  ridgeFill(V, u => shore(u) + .006 + surf * .4, rgba(sand), .02);
  g.strokeStyle = `rgba(255,255,255,${(.55 - .3 * night).toFixed(3)})`; g.lineWidth = Math.max(.8, d * .9);
  g.beginPath(); for (let u = -.02; u <= 1.02; u += .02) { const y = Y(shore(u) - .012 - surf + .003 * Math.sin(u * 23 + t)); if (u <= -.02) g.moveTo(X(u), y); else g.lineTo(X(u), y); } g.stroke();
  g.strokeStyle = `rgba(255,255,255,${(.2 - .1 * night).toFixed(3)})`; g.lineWidth = d * .6;
  g.beginPath(); for (let u = -.02; u <= 1.02; u += .02) { const y = Y(shore(u) - .03 - surf * 1.5 + .004 * Math.sin(u * 17 - t * .5)); if (u <= -.02) g.moveTo(X(u), y); else g.lineTo(X(u), y); } g.stroke();
}

// ======================= 山と森 =======================
const M_FAR = ridge(21, .52, .3, .95, .6), M_MID = ridge(33, .66, .17), M_NEAR = ridge(45, .82, .1, .8);
const MID_TREES = Array.from({ length: 70 }, (_, i) => ({ u: i / 70 + rnd(i, 1) * .012, s: .6 + rnd(i, 2) * .7, c: rnd(i, 3), dv: rnd(i, 4) }));
const NEAR_TREES = Array.from({ length: 44 }, (_, i) => ({ u: i / 42 - .01 + rnd(i, 5) * .015, s: .6 + rnd(i, 6) * .8 }));
function conifer(g: CanvasRenderingContext2D, x: number, y: number, h: number) {
  const w = h * .32;
  g.moveTo(x, y - h);
  for (let k = 0; k < 3; k++) { const yy = y - h + h * (k + 1) / 3.3; g.lineTo(x + w * (k + 1) / 3, yy); g.lineTo(x + w * (k + .4) / 3, yy); }
  g.lineTo(x + w * .15, y + h * .05); g.lineTo(x - w * .15, y + h * .05);
  for (let k = 2; k >= 0; k--) { const yy = y - h + h * (k + 1) / 3.3; g.lineTo(x - w * (k + .4) / 3, yy); g.lineTo(x - w * (k + 1) / 3, yy); }
  g.closePath();
}
function drawMountain(V: View) {
  const { g, d, t, X, Y, gh, night, h, season: S } = V;
  // 遠い峰: 青く霞む。冬は雪をかぶり、春と晩秋は頂だけ白い
  const far = tone(V, "#6f87a6", .4);
  ridgeFill(V, M_FAR, rgba(far), .004);
  const snow = clamp(S.wi * 1.1 + S.sp * .35 + S.au * .25);
  if (snow > .05) {
    let peak = 1; for (let u = 0; u <= 1; u += .01) peak = Math.min(peak, M_FAR(u));
    const line = peak + (.5 - peak) * snow * .9;
    g.save(); g.beginPath(); g.moveTo(V.x0, V.y1);
    for (let u = -.02; u <= 1.02; u += .004) g.lineTo(X(u), Y(M_FAR(u)));
    g.lineTo(V.x1, V.y1); g.closePath(); g.clip();
    const sc = tone(V, "#eef2f7", .3, .78), shade = tone(V, "#b8c4d6", .35, .8);
    const grd = g.createLinearGradient(0, Y(peak), 0, Y(line + .03));
    grd.addColorStop(0, rgba(sc, .95)); grd.addColorStop(.8, rgba(sc, .85)); grd.addColorStop(1, rgba(sc, 0));
    g.fillStyle = grd; g.fillRect(V.x0, Y(peak) - 2, V.x1 - V.x0, Y(line + .03) - Y(peak) + 2);
    // 谷筋の影（斜面の陰）
    g.fillStyle = rgba(shade, .5);
    for (let i = 0; i < 18; i++) { const u = i / 17, v = M_FAR(u); if (v < line) fillPoly(g, [X(u), Y(v), X(u + .015), Y(v + (line - v) * .9), X(u - .01), Y(v + (line - v) * .7)]); }
    g.restore();
  }
  // 中ほどの山: 落葉樹の森。季節で色づく
  const midBase = mixN(mixN(mixN("#55724f", "#7c9a52", S.sp), "#8a6a3e", S.au * .55), "#6e6c66", S.wi * .8);
  ridgeFill(V, M_MID, rgba(tone(V, midBase, .3)), .005);
  const autumn = ["#b8452e", "#d07a2c", "#c9a23a", "#8f3a2a"];
  for (const tr of MID_TREES) {
    const v = M_MID(tr.u) + .006 + tr.dv * .05, r = gh * .011 * tr.s;
    let c: RGB = mixN("#4d6b44", "#6f8f4a", tr.c);
    c = mixN(c, mixN("#9cc46a", tr.c > .85 ? "#f0c8d2" : "#a9cc72", 1), S.sp * .8); // 春は芽吹きと山桜
    c = mixN(c, autumn[Math.floor(tr.c * 4)], S.au * .9);
    c = mixN(c, "#7a746a", S.wi * .9);
    g.fillStyle = rgba(tone(V, c, .26), 1 - S.wi * .5);
    g.beginPath(); g.arc(X(tr.u), Y(v), r, 0, Math.PI * 2); g.fill();
    if (S.wi > .4) { g.fillStyle = rgba(tone(V, "#eef2f6", .2, .75), (S.wi - .4) * 1.2); g.beginPath(); g.arc(X(tr.u), Y(v) - r * .3, r * .7, Math.PI, 0); g.fill(); }
  }
  // 山小屋の灯り
  if (night > .1) for (const u of [.18, .57, .62]) { const x = X(u), y = Y(M_MID(u) + .035); glow(g, x, y, gh * .03, [255, 196, 120], .6 * night); g.fillStyle = rgba([255, 214, 150], .9 * night); g.fillRect(x - d * .7, y - d * .7, d * 1.4, d * 1.4); }
  // 朝霧（と雨の日のもや）が谷にたまる
  mist(V, .6, .82, bell(h, 6.6, 1.7) * (.45 + .55 * (S.sp + S.au)) + V.wet * .5);
  // 手前の尾根と針葉樹
  const nearC = tone(V, mixN("#24382c", "#2e3a34", S.wi * .5), .08, .9);
  ridgeFill(V, M_NEAR, rgba(nearC), .008);
  g.fillStyle = rgba(nearC); g.beginPath();
  for (const tr of NEAR_TREES) conifer(g, X(tr.u), Y(M_NEAR(tr.u) + .02), gh * .13 * tr.s);
  g.fill();
  if (S.wi > .35) {
    g.fillStyle = rgba(tone(V, "#f2f5f9", .05, .72), clamp((S.wi - .35) * 1.6) * .85); g.beginPath();
    for (const tr of NEAR_TREES) { const x = X(tr.u), y = Y(M_NEAR(tr.u) + .02), hh = gh * .13 * tr.s; for (let k = 0; k < 3; k++) { const yy = y - hh + hh * (k + .2) / 3.3, w = hh * .32 * (k + .7) / 3; g.moveTo(x - w, yy + hh * .05); g.quadraticCurveTo(x - w * .2, yy - hh * .06, x + w * .3, yy + hh * .03); g.lineTo(x - w, yy + hh * .05); } }
    g.fill();
  }
  void t;
}

// ======================= 田園 =======================
// 地面の座標: 横 L・奥行き z（手前の窓の下端が z=1）を、画面の u・v に写す
const FV = .6; // 地平線
const fu = (L: number, z: number) => .5 + L * .5 / z, fv = (z: number) => FV + (1 - FV) / z;
const F_HILL = ridge(71, .6, .08, .7);
function drawField(V: View) {
  const { g, d, t, X, Y, gw, gh, night, day, h, season: S } = V;
  const hor = Y(FV);
  // 遠くの山並みと、手前の丘
  ridgeFill(V, F_HILL, rgba(tone(V, mixN("#6f8aa0", "#8a90a0", S.wi), .55)), .005);
  ridgeFill(V, u => FV - .012 - .012 * Math.sin(u * 5 + 1), rgba(tone(V, mixN(mixN("#4f6b48", "#7a6a46", S.au * .6), "#6a6658", S.wi * .7), .35)), .01);
  // 田んぼ: 春は水を張って空を映し、夏は青田、秋は黄金色、冬は刈り跡
  const crop = tone(V, mixN(mixN(mixN("#5f8f3a", "#c7a24a", S.au), "#7d6e55", S.wi), "#6f6650", S.sp * .6), .12, .9);
  g.fillStyle = rgba(crop); g.fillRect(V.x0, hor, V.x1 - V.x0, V.y1 - hor);
  const water = clamp(S.sp * 1.4 - .15) * (1 - S.su * .5);
  if (water > .02) {
    // 水鏡: 空を上下逆さに映す
    const wg = g.createLinearGradient(0, hor, 0, V.y1);
    wg.addColorStop(0, rgba(mixN(V.bottom, [40, 50, 60], .12), water)); wg.addColorStop(1, rgba(mixN(V.top, [20, 30, 40], .2), water));
    g.fillStyle = wg; g.fillRect(V.x0, hor, V.x1 - V.x0, V.y1 - hor);
    for (const b of [V.sun, V.moon]) if (b && b.y < hor) glitter(V, b.x, FV + .005, 1.05, b === V.sun ? [255, 236, 200] : [236, 230, 210], .4 * water * (1 - V.wet), .06, 3);
    // 苗の列（植えたばかりの小さな点）
    g.fillStyle = rgba(tone(V, "#6d9a4a", .1), .55 * water);
    for (let z = 1.1; z < 14; z *= 1.09) for (let L = -3; L <= 3; L += .14) { const u = fu(L, z); if (u > -.02 && u < 1.02) g.fillRect(X(u), Y(fv(z)), Math.max(.6, d * 1.4 / z), Math.max(.6, d * 1.6 / z)); }
  } else if (S.su + S.au > .3) {
    // 稲の列: 地平線へ向かって集まる筋
    g.strokeStyle = rgba(mixN(crop, [0, 0, 0], .15), .25); g.lineWidth = Math.max(.5, d * .5); g.beginPath();
    for (let L = -6; L <= 6; L += .22) { g.moveTo(X(fu(L, 1)), Y(1)); g.lineTo(X(fu(L, 14)), Y(fv(14))); }
    g.stroke();
    // 風が稲の上を渡る（明るい帯がゆっくり進む）
    if (!V.calm) { const w = (t * .05) % 1.4 - .2; const wg = g.createLinearGradient(X(w - .2), 0, X(w + .2), 0); wg.addColorStop(0, "rgba(255,255,230,0)"); wg.addColorStop(.5, `rgba(255,255,230,${(.08 * day).toFixed(3)})`); wg.addColorStop(1, "rgba(255,255,230,0)"); g.fillStyle = wg; g.fillRect(V.x0, Y(fv(5)), V.x1 - V.x0, V.y1 - Y(fv(5))); }
  }
  if (S.wi > .5) { g.fillStyle = rgba(tone(V, "#e9edf2", .1, .7), (S.wi - .5) * .8); for (let i = 0; i < 90; i++) { const z = 1 + rnd(i, 81) * 10, u = fu((rnd(i, 82) - .5) * 8, z); g.fillRect(X(u), Y(fv(z)), gw * .05 / z, Math.max(.6, d * 1.2 / z)); } }
  // あぜ道: 横のあぜと、奥へのびるあぜ
  const levee = tone(V, mixN(mixN("#6f7d4a", "#8c7a52", S.au), "#7a6e5c", S.wi), .1, .88);
  g.fillStyle = rgba(levee);
  for (const z of [1.3, 1.9, 2.9, 4.6, 7.5, 12]) { const y = Y(fv(z)); g.fillRect(V.x0, y, V.x1 - V.x0, Math.max(.8, d * 2.6 / z)); }
  for (const L of [-2.4, -.9, .6, 2.1, 3.6]) fillPoly(g, [X(fu(L - .04, 1)), Y(1), X(fu(L + .04, 1)), Y(1), X(fu(L + .04, 14)), Y(fv(14)), X(fu(L - .04, 14)), Y(fv(14))]);
  // 秋分のころ、あぜに彼岸花
  const higan = bell(S.doy, 266, 9);
  if (higan > .05) { g.fillStyle = rgba(tone(V, "#d2302a", .05, .8), higan); for (let i = 0; i < 60; i++) { const z = [1.3, 1.9, 2.9][i % 3], u = rnd(i, 91) * 1.1 - .05; g.fillRect(X(u), Y(fv(z)) - d * 1.2 / z, Math.max(1, d * 2 / z), Math.max(1, d * 1.6 / z)); } }
  // 鎮守の森と、農家
  const grove = tone(V, mixN("#2f4732", "#3b4a3a", S.wi), .3);
  g.fillStyle = rgba(grove); g.beginPath();
  for (let i = 0; i < 9; i++) { const u = .7 + i * .018, r = gh * (.02 + .02 * Math.sin(i / 8 * Math.PI)); g.moveTo(X(u) + r, hor); g.arc(X(u), hor - r * .5, r, 0, Math.PI * 2); }
  g.fill();
  const hx = X(.24), hw = gw * .07, hb = hor + d, hh = gh * .035;
  g.fillStyle = rgba(tone(V, "#d8d0bf", .25, .8)); g.fillRect(hx - hw / 2, hb - hh, hw, hh);
  g.fillStyle = rgba(tone(V, "#3d434d", .25)); fillPoly(g, [hx - hw * .62, hb - hh, hx + hw * .62, hb - hh, hx + hw * .4, hb - hh * 1.9, hx - hw * .4, hb - hh * 1.9]);
  if (S.wi > .5) { g.fillStyle = rgba(tone(V, "#eef1f5", .2, .7), S.wi); fillPoly(g, [hx - hw * .55, hb - hh * 1.15, hx + hw * .55, hb - hh * 1.15, hx + hw * .4, hb - hh * 1.9, hx - hw * .4, hb - hh * 1.9]); }
  const lit = clamp(night * 1.3 + (1 - day) * .3 + V.wet * .3);
  if (lit > .05) { for (const k of [-.25, .2]) { glow(g, hx + hw * k, hb - hh * .5, gh * .03, [255, 200, 130], .5 * lit); g.fillStyle = rgba([255, 214, 150], .9 * lit); g.fillRect(hx + hw * k - hw * .07, hb - hh * .7, hw * .14, hh * .35); } }
  // 電柱と電線: 奥へと小さくなって並ぶ
  const poles = [1.15, 1.7, 2.5, 3.7, 5.5, 8.2, 12].map(z => ({ x: X(fu(-1.15, z)), y: Y(fv(z)), hgt: gh * .5 / z, w: Math.max(.8, d * 2.4 / z) }));
  const pc = tone(V, "#3a3a3a", .05);
  g.fillStyle = rgba(pc);
  for (const p of poles) { g.fillRect(p.x - p.w / 2, p.y - p.hgt, p.w, p.hgt); g.fillRect(p.x - p.hgt * .12, p.y - p.hgt * .92, p.hgt * .24, Math.max(.7, p.w * .5)); }
  g.strokeStyle = rgba(pc, .75); g.lineWidth = Math.max(.5, d * .55); g.beginPath();
  for (const off of [-.11, .11, 0]) for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i], b = poles[i + 1], ya = a.y - a.hgt * (off ? .92 : .8), yb = b.y - b.hgt * (off ? .92 : .8), xa = a.x + a.hgt * off, xb = b.x + b.hgt * off;
    g.moveTo(xa, ya); g.quadraticCurveTo((xa + xb) / 2, (ya + yb) / 2 + (a.hgt + b.hgt) * .06, xb, yb);
  }
  g.stroke();
  // 電線にとまるスズメ（昼）
  if (day > .5 && V.wet < .3) { const p = poles[0], q = poles[1]; for (let i = 0; i < 3; i++) { const k = .3 + i * .09 + rnd(i, 7) * .04, x = p.x + (q.x - p.x) * k + p.hgt * .11, y = p.y - p.hgt * .92 + (q.y - q.hgt * .92 - p.y + p.hgt * .92) * k + Math.sin(k * Math.PI) * (p.hgt + q.hgt) * .06; g.fillStyle = rgba(tone(V, "#4a3a2a", 0)); g.beginPath(); g.ellipse(x, y - d * 1.4, d * 1.4, d * 1.1, 0, 0, Math.PI * 2); g.fill(); } }
  // 夏の夜の蛍
  const fire = night * bell(S.doy, 170, 18) * (1 - V.wet);
  if (fire > .03) for (let i = 0; i < 24; i++) {
    const ph = t * .15 + i, x = X(rnd(i, 95) + Math.sin(ph * .7) * .03), y = Y(.72 + rnd(i, 96) * .25 + Math.sin(ph) * .02);
    const on = V.calm ? .6 : Math.pow(clamp(Math.sin(t * (.8 + rnd(i, 97)) + i * 2)), 3);
    glow(g, x, y, gh * .02, [190, 255, 120], .7 * on * fire); g.fillStyle = rgba([220, 255, 170], on * fire); g.fillRect(x - d * .5, y - d * .5, d, d);
  }
  void h;
}

// ======================= 雪国 =======================
const S_FAR = ridge(111, .52, .22, .9, .5), S_MID = ridge(123, .68, .1, .6);
const HOUSES = [{ u: .1, w: .12, h: .07 }, { u: .27, w: .09, h: .055 }, { u: .44, w: .15, h: .085 }, { u: .63, w: .1, h: .06 }, { u: .8, w: .13, h: .075 }, { u: .96, w: .1, h: .06 }];
function drawSnow(V: View) {
  const { g, d, t, X, Y, gw, gh, night, day } = V;
  // 雪の夜は地面が明るい（雪明かり）。夜の沈み方を弱める
  const snowC = (haze: number) => tone(V, "#f3f6fa", haze, .7);
  const shadeC = (haze: number) => tone(V, "#b9c6d8", haze, .74);
  ridgeFill(V, S_FAR, rgba(tone(V, "#dfe7f0", .5, .72)), .004);
  // 遠い山の杉林（雪の合間に黒く）
  g.fillStyle = rgba(tone(V, "#5a6672", .55), .55); g.beginPath();
  for (let i = 0; i < 60; i++) { const u = i / 60 + rnd(i, 3) * .01, v = S_FAR(u) + .03 + rnd(i, 4) * .1; if (v < .6) conifer(g, X(u), Y(v), gh * .025); }
  g.fill();
  const mg = g.createLinearGradient(0, Y(.58), 0, Y(.8));
  mg.addColorStop(0, rgba(snowC(.25))); mg.addColorStop(1, rgba(shadeC(.2)));
  ridgeFill(V, S_MID, mg, .006);
  // 家々: 重い雪をのせた屋根、壁、窓の灯り
  const lit = clamp(night * 1.2 + (1 - day) * .4 + V.wet * .25 + .08);
  for (const [i, hs] of HOUSES.entries()) {
    const x = X(hs.u), w = gw * hs.w, base = Y(S_MID(hs.u) + .07 + rnd(i, 5) * .04), hh = gh * hs.h;
    g.fillStyle = rgba(tone(V, "#4a3a30", .2)); g.fillRect(x - w * .42, base - hh, w * .84, hh);
    // 屋根の雪: こんもり丸く、軒から少し垂れる
    g.fillStyle = rgba(snowC(.12));
    g.beginPath(); g.moveTo(x - w * .58, base - hh + d); g.quadraticCurveTo(x - w * .5, base - hh * 1.9, x, base - hh * 2); g.quadraticCurveTo(x + w * .5, base - hh * 1.9, x + w * .58, base - hh + d);
    g.quadraticCurveTo(x, base - hh * .85, x - w * .58, base - hh + d); g.fill();
    g.fillStyle = rgba(shadeC(.12), .7); g.beginPath(); g.moveTo(x + w * .05, base - hh * 1.98); g.quadraticCurveTo(x + w * .5, base - hh * 1.9, x + w * .58, base - hh + d); g.quadraticCurveTo(x + w * .3, base - hh * .95, x + w * .05, base - hh * 1.98); g.fill();
    // つらら
    g.strokeStyle = rgba(mixN(snowC(.1), [200, 220, 240], .4), .7); g.lineWidth = Math.max(.5, d * .5); g.beginPath();
    for (let k = 0; k < 5; k++) { const ix = x - w * .4 + k * w * .2 + rnd(i * 5 + k, 6) * w * .05; g.moveTo(ix, base - hh + d * 1.5); g.lineTo(ix, base - hh + d * 1.5 + hh * (.08 + .12 * rnd(i * 5 + k, 7))); }
    g.stroke();
    if (lit > .05) {
      const wx = x - w * .18, wy = base - hh * .62, ww = w * .2, wh = hh * .32;
      glow(g, wx + ww / 2, wy + wh / 2, gh * .05, [255, 190, 110], .45 * lit);
      g.fillStyle = rgba([255, 206, 140], .9 * lit); g.fillRect(wx, wy, ww, wh);
      g.fillStyle = rgba(tone(V, "#4a3a30", .2), .9); g.fillRect(wx + ww / 2 - d * .3, wy, d * .6, wh);
    }
    // 家の前に積もった雪
    g.fillStyle = rgba(snowC(.1)); g.beginPath(); g.ellipse(x, base + d, w * .62, hh * .32, 0, Math.PI, 0); g.fill();
  }
  // 手前の雪原: なだらかな起伏と陰
  const fg = g.createLinearGradient(0, Y(.86), 0, V.y1);
  fg.addColorStop(0, rgba(snowC(.05))); fg.addColorStop(1, rgba(shadeC(0)));
  ridgeFill(V, u => .88 + .025 * Math.sin(u * 4.1 + .5) + .01 * Math.sin(u * 13), fg, .01);
  // 街灯
  const sx = X(.7), sy = Y(.9), sh = gh * .2;
  g.fillStyle = rgba(tone(V, "#2c2f35", 0)); g.fillRect(sx - d * .7, sy - sh, d * 1.4, sh); g.fillRect(sx - d * .7, sy - sh, gh * .03, d * 1.2);
  g.fillStyle = rgba(snowC(0)); g.fillRect(sx - d * 1.4, sy - sh - d, gh * .032 + d * 1.4, d * 1.4);
  if (lit > .1) {
    const lx = sx + gh * .026, ly = sy - sh + d * 2.4;
    glow(g, lx, ly, gh * .12, [255, 214, 150], .5 * lit);
    const cone = g.createLinearGradient(0, ly, 0, sy); cone.addColorStop(0, rgba([255, 220, 160], .18 * lit)); cone.addColorStop(1, rgba([255, 220, 160], 0));
    g.fillStyle = cone; fillPoly(g, [lx - d, ly, lx + d, ly, lx + gh * .07, sy, lx - gh * .07, sy]);
  }
  // 雪面のきらめき（晴れた昼）
  if (day > .5 && V.wet < .5 && !V.calm) { g.fillStyle = "rgba(255,255,255,.9)"; for (let i = 0; i < 40; i++) { if (Math.sin(t * (2 + rnd(i, 98) * 3) + i * 7) < .93) continue; g.fillRect(X(rnd(i, 99)), Y(.9 + rnd(i, 100) * .1), d, d); } }
}

// ======================= 川沿いの街 =======================
// 川を下流へ見通す。川の両岸に建物が奥へ並び、遠くを鉄橋が横切る
const RV = .56;
const ru = (L: number, z: number) => .5 + L * .5 / z, rv = (z: number) => RV + (1 - RV) / z;
const RIVER = 1.05, WALL = 1.75;
const BLOCKS = (() => {
  const out: { side: number; z0: number; z1: number; h: number; c: number }[] = [];
  for (const side of [-1, 1]) { let z = 1.5; let i = side > 0 ? 100 : 0; while (z < 40) { const len = z * (.22 + rnd(i, 1) * .35); out.push({ side, z0: z, z1: z + len, h: .35 + rnd(i, 2) * rnd(i, 5) * 2, c: rnd(i, 3) }); z += len * (1 + rnd(i, 4) * .1); i++; } }
  return out.sort((a, b) => b.z0 - a.z0);
})();
const BRIDGE_Z = 6.5;
function drawRiver(V: View) {
  const { g, d, t, X, Y, gw, gh, night, day, season: S } = V;
  const P = (L: number, z: number, hgt = 0): [number, number] => [X(ru(L, z)), Y(rv(z)) - hgt * gw * .5 / z];
  const hor = Y(RV);
  // 遠くの街並み（地平線の上）
  g.fillStyle = rgba(tone(V, "#59647a", .55), .9);
  for (const b of FAR) g.fillRect(X(b.x), hor - gh * (b.h * .35 + .02), gw * b.w + 1, gh * (b.h * .35 + .02) + d);
  // 岸（遊歩道）
  g.fillStyle = rgba(tone(V, "#8a8478", .2, .88));
  for (const s of [-1, 1]) fillPoly(g, [...P(s * RIVER, 1), ...P(s * WALL * 1.8, 1), ...P(s * WALL * 1.8, 40), ...P(s * RIVER, 40)]);
  // 川面: 空を映し、手前は暗い
  const wtop = mixN(V.bottom, [40, 60, 72], .3), wbot = tone(V, mixN("#30505c", "#3c4a50", S.wi), 0, .9);
  const wg = g.createLinearGradient(0, hor, 0, V.y1); wg.addColorStop(0, rgba(wtop)); wg.addColorStop(1, rgba(mixN(wbot, V.top, .25)));
  g.fillStyle = wg; fillPoly(g, [...P(-RIVER, 1), ...P(RIVER, 1), ...P(RIVER, 60), ...P(-RIVER, 60)]);
  // 護岸のきわ
  g.strokeStyle = rgba(tone(V, "#5b5a55", .1), .9); g.lineWidth = Math.max(.6, d * .8); g.beginPath();
  for (const s of [-1, 1]) { g.moveTo(...P(s * RIVER, 1)); g.lineTo(...P(s * RIVER, 60)); }
  g.stroke();
  // さざ波
  g.save(); g.beginPath(); fillPolyPath(g, [...P(-RIVER, 1), ...P(RIVER, 1), ...P(RIVER, 60), ...P(-RIVER, 60)]); g.clip();
  for (let i = 0; i < 60; i++) {
    const z = 1 + Math.pow(rnd(i, 21), 2) * 20, L = (rnd(i, 22) * 2 - 1) * RIVER + (V.calm ? 0 : Math.sin(t * .2 + i) * .05);
    const [x, y] = P(L, z), len = gw * .08 / z * (.5 + rnd(i, 23)), a = (V.calm ? .5 : clamp(Math.sin(t * .6 + i * 1.3) * .7 + .35)) * (.12 - .05 * night);
    g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; g.fillRect(x - len / 2, y, len, Math.max(.6, d * .8 / Math.sqrt(z)));
  }
  // 月・太陽の光の道
  for (const b of [V.sun, V.moon]) if (b && b.y < hor) glitter(V, b.x, RV + .01, 1.02, b === V.sun ? mixN([255, 240, 210], [255, 170, 100], b.low) : [235, 228, 205], (b === V.sun ? .4 : .35 * night) * (1 - V.wet * .8), .1, 5);
  g.restore();
  // 両岸の建物（奥から）。夜は窓に灯りが点き、川面に灯りが揺れて映る
  const reflections: [number, number, RGB, number][] = [];
  for (const [i, b] of BLOCKS.entries()) {
    const L = b.side * WALL;
    const [x0, y0] = P(L, b.z0), [x1, y1] = P(L, b.z1), [, t0] = P(L, b.z0, b.h), [, t1] = P(L, b.z1, b.h);
    // 川に向いた壁（奥へすぼまる台形）
    g.fillStyle = rgba(tone(V, mixN("#9a948a", "#6e7682", b.c), .18 + .25 * Math.min(1, b.z0 / 15)));
    fillPoly(g, [x0, y0, x1, y1, x1, t1, x0, t0]);
    // 屋上の縁
    g.fillStyle = "rgba(0,0,0,.18)"; fillPoly(g, [x0, t0, x1, t1, x1, t1 + (y1 - t1) * .05, x0, t0 + (y0 - t0) * .05]);
    // 窓: 各階の横筋
    const floors = Math.max(1, Math.round(b.h / .35));
    for (let f = 0; f < floors; f++) for (let k = 0; k < 6; k++) {
      const fz = b.z0 + (b.z1 - b.z0) * (k + .5) / 6, [wx, wy] = P(L, fz, b.h * (f + .55) / floors), s = Math.max(.8, d * 3 / fz);
      const on = night > .15 && rnd(i * 13 + f * 7 + k, Math.floor(t / (50 + k * 9)) + 1) >= .55;
      if (!on) { g.fillStyle = `rgba(30,40,52,${(.28 * (1 - night)).toFixed(3)})`; g.fillRect(wx - s / 2, wy - s / 2, s, s * .8); continue; }
      const col = rnd(i, f + k) > .8 ? hex("#cfe2ff") : hex(/^#[0-9a-f]{6}$/i.test(V.accent) ? V.accent : "#f0b35e");
      g.fillStyle = rgba(col, night * (.5 + .35 * rnd(i + f, k))); g.fillRect(wx - s / 2, wy - s / 2, s, s * .8);
      if (f === 0 || rnd(i + f, k + 9) > .7) reflections.push([wx, Y(rv(fz)), col, s]);
    }
  }
  // 並木: 春は桜、夏は青葉、秋は黄葉、冬は枯れ枝
  const sakura = bell(S.doy, 95, 11);
  for (const s of [-1, 1]) for (let z = 1.25; z < 30; z *= 1.32) {
    const [x, y] = P(s * 1.35, z), r = gw * .085 / z, trunk = gw * .16 / z;
    g.strokeStyle = rgba(tone(V, "#3a302a", .1 + Math.min(.4, z / 40))); g.lineWidth = Math.max(.6, gw * .012 / z);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - trunk);
    if (S.wi > .4) { for (const a of [-.6, -.2, .3, .7]) { g.moveTo(x, y - trunk * .7); g.lineTo(x + Math.sin(a) * r, y - trunk - Math.cos(a) * r * .9); } }
    g.stroke();
    let c = mixN(mixN("#4d7a3e", "#d9a73a", S.au), "#6a8f4a", S.sp * .5);
    c = mixN(c, "#f2c9d4", sakura);
    const a = 1 - clamp((S.wi - .3) * 2);
    if (a > .02) { g.fillStyle = rgba(tone(V, c, .1 + Math.min(.45, z / 30), .86), a); g.beginPath(); g.ellipse(x, y - trunk - r * .4, r * 1.05, r * .8, 0, 0, Math.PI * 2); g.fill(); }
  }
  // 街灯: 遊歩道に並び、夜は川面に長く映る
  for (const s of [-1, 1]) for (let z = 1.5; z < 30; z *= 1.45) {
    const [x, y] = P(s * 1.15, z), hh = gw * .22 / z;
    g.fillStyle = rgba(tone(V, "#2e3136", .05)); g.fillRect(x - Math.max(.5, d * .6 / Math.sqrt(z)), y - hh, Math.max(1, d * 1.2 / Math.sqrt(z)), hh);
    if (night > .1) { glow(g, x, y - hh, gw * .05 / Math.sqrt(z), [255, 210, 150], .6 * night); reflections.push([x, Y(rv(z)), [255, 210, 150], gw * .02 / z]); }
  }
  // 鉄橋と電車
  const [bl, by] = P(-WALL * 1.5, BRIDGE_Z), [br] = P(WALL * 1.5, BRIDGE_Z), s1 = gw * .5 / BRIDGE_Z;
  const deck = by - s1 * .45, th = s1 * .07, tr = s1 * .22;
  g.fillStyle = rgba(tone(V, "#3e4248", .3));
  for (let i = 0; i <= 4; i++) { const px = bl + (br - bl) * i / 4; g.fillRect(px - s1 * .04, deck, s1 * .08, by - deck); }
  g.fillRect(bl, deck, br - bl, th);
  // 電車: ときどき橋を渡る（夜は窓が光る）
  const cyc = 70, k = ((t + 20) % cyc) / 9;
  if (k < 1 && !V.calm) {
    const len = (br - bl) * .55, x0 = bl - len + k * (br - bl + len), ch = tr * .62;
    g.save(); g.beginPath(); g.rect(bl, deck - tr * 1.2, br - bl, tr * 1.2); g.clip();
    g.fillStyle = rgba(tone(V, "#c8ccd0", .25, .8)); g.fillRect(x0, deck - ch - d, len, ch);
    g.fillStyle = rgba(tone(V, "#3a8a5a", .25, .8)); g.fillRect(x0, deck - ch * .35 - d, len, ch * .12);
    for (let w = 0; w < 18; w++) { const wx = x0 + len * (w + .3) / 18; g.fillStyle = night > .2 ? rgba([255, 236, 190], .9 * night) : "rgba(30,40,50,.5)"; g.fillRect(wx, deck - ch * .85 - d, len / 18 * .5, ch * .35); }
    g.restore();
  }
  // トラス（電車の手前の鉄骨）
  g.strokeStyle = rgba(tone(V, "#4a4f57", .3)); g.lineWidth = Math.max(.6, s1 * .015); g.beginPath();
  const n = 16; g.moveTo(bl, deck - tr); g.lineTo(br, deck - tr);
  for (let i = 0; i < n; i++) { const xa = bl + (br - bl) * i / n, xb = bl + (br - bl) * (i + 1) / n; g.moveTo(xa, deck); g.lineTo(xb, deck - tr); g.moveTo(xb, deck); g.lineTo(xb, deck - tr); }
  g.stroke();
  // 橋の下の影が水面に落ちる
  g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(X(ru(-RIVER, BRIDGE_Z)), by, X(ru(RIVER, BRIDGE_Z)) - X(ru(-RIVER, BRIDGE_Z)), s1 * .05);
  // 灯りの映り込み: 縦にのびて揺れる
  if (night > .1) {
    g.save(); g.beginPath(); fillPolyPath(g, [...P(-RIVER, 1), ...P(RIVER, 1), ...P(RIVER, 60), ...P(-RIVER, 60)]); g.clip();
    for (const [x, y, c, s] of reflections) {
      const len = Math.min(gh * .2, (V.y1 - y) * .6) * .8;
      for (let j = 0; j < 5; j++) { const yy = y + len * (j + .5) / 5, wob = V.calm ? 0 : Math.sin(t * 2 + yy * .2 + x) * s * .8; g.fillStyle = rgba(c, .22 * night * (1 - j / 5) * (1 - V.wet * .4)); g.fillRect(x - s * .8 + wob, yy, s * 1.6, len / 5 * .6); }
    }
    g.restore();
  }
  void day;
}
function fillPolyPath(g: CanvasRenderingContext2D, p: number[]) { g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); }

const DRAW: Record<SceneKey, (V: View) => void> = { city: drawCity, sea: drawSea, mountain: drawMountain, field: drawField, snow: drawSnow, river: drawRiver };
export const drawScene = (key: SceneKey, V: View) => DRAW[key](V);

/** 外に降るもの: 雪国はいつも雪（雨の日は本降り）。山と田園は真冬なら雨が雪になる */
export function precipitation(key: SceneKey, V: View): { kind: "rain" | "snow"; amt: number } {
  if (key === "snow") return { kind: "snow", amt: Math.max(V.wet, .3 + .25 * Math.sin(V.t / 400)) };
  if ((key === "mountain" || key === "field") && V.season.wi > .6) return { kind: "snow", amt: V.wet };
  return { kind: "rain", amt: V.wet };
}
/** 降る雪: 手前の粒ほど大きく速く、左右にゆれる */
export function snowfall(V: View, amt: number) {
  const { g, d, t, X, Y } = V;
  const n = Math.round(160 * amt);
  for (let i = 0; i < n; i++) {
    const k = rnd(i, 31), sp = .025 + .05 * k, sz = (.6 + 1.8 * k * k) * d;
    const y = (((rnd(i, 32) + (V.calm ? 0 : t * sp)) % 1.15) - .08);
    const x = ((rnd(i, 33) + (V.calm ? 0 : Math.sin(t * (.4 + k * .5) + i) * .015 * (.3 + k) + t * .003)) % 1.1) - .05;
    g.fillStyle = `rgba(246,249,253,${((.35 + .5 * k) * (1 - V.night * .35)).toFixed(3)})`;
    g.beginPath(); g.arc(X(x), Y(y), sz, 0, Math.PI * 2); g.fill();
  }
}

