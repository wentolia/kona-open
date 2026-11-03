// 床に置く家具: ソファ・ひとりがけ・クッション・ラグ。棚の小物と同じローポリ（平らな多角形と濃淡 4 段）で描く。
// 小物が「好きな棚に置ける・大きさを変えられる」のと同じく、家具は床の好きな位置に置けて、大きさを変えられる（設定の「部屋」）。
// 猫はソファやクッションの上で丸くなり、ソファの背もたれにも乗る（data-cat-plat を cat.ts が足場として測る）。
// ラグの上は暖かいので、床にいる猫はラグの上で横になりたがる（data-cat-rug）。床を敷いているときだけ見える。
import "./room-things.css";

const KEY = "kona.things";

/** 置ける家具。w/h は描いた大きさ（大きさ 100% のときの px）、x は最初に置く位置（床の左端 0 〜 右端 1）。flat は床に敷くもの */
export const THINGS = [
  { key: "sofa", label: "ソファ", w: 300, h: 110, x: .5, flat: false },
  { key: "chair", label: "ひとりがけ", w: 150, h: 112, x: .8, flat: false },
  { key: "cushion", label: "クッション", w: 100, h: 36, x: .22, flat: false },
  { key: "kilim", label: "キリム", w: 280, h: 0, x: .5, flat: true },
  { key: "round", label: "丸いラグ", w: 240, h: 0, x: .3, flat: true },
] as const;
export const THING_MIN = 0.5, THING_MAX = 1.5;

type Saved = { on: string[]; x: Record<string, number>; s: Record<string, number> };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const known = (k: unknown) => THINGS.some(t => t.key === k);
function load(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    const num = (o: unknown) => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).filter(([k, n]) => known(k) && typeof n === "number"));
    return { on: Array.isArray(v.on) ? v.on.filter(known) : [], x: num(v.x), s: num(v.s) };
  } catch { return { on: [], x: {}, s: {} }; }
}
const save = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 保存できなくても動く */ } };

/** 床に置いている家具（THINGS の順） */
export const placedThings = () => { const on = load().on; return THINGS.filter(t => on.includes(t.key)).map(t => t.key); };
export const thingX = (k: string) => clamp(load().x[k] ?? THINGS.find(t => t.key === k)?.x ?? .5, 0, 1);
export const thingSize = (k: string) => clamp(load().s[k] ?? 1, THING_MIN, THING_MAX);

export function toggleThing(k: string, on: boolean) {
  const s = load();
  s.on = on ? [...new Set([...s.on, k])] : s.on.filter(x => x !== k);
  save(s); paint(true);
}
/** 位置と大きさ。つまみを動かしている間は描き直さず、置き場所だけを動かす。done で猫の足場を測り直す */
export function setThing(k: string, p: { x?: number; s?: number }, done = false) {
  const s = load();
  if (p.x !== undefined) s.x[k] = clamp(p.x, 0, 1);
  if (p.s !== undefined) { if (Math.abs(p.s - 1) < .001) delete s.s[k]; else s.s[k] = clamp(p.s, THING_MIN, THING_MAX); }
  save(s);
  const el = layer?.querySelector<HTMLElement>(`[data-thing="${k}"]`);
  if (el) place(el, k); else paint();
  room();
  if (done) dispatchEvent(new Event("resize"));
}

// ---------- 描くための道具 ----------
type Pt = [number, number];
type Pal = { hi: string; mid: string; lo: string; deep: string };
const P = (pts: Pt[]) => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
// 棚の小物と同じく、多角形を同じ色の細い縁で塗って継ぎ目を消す
const poly = (c: string, pts: Pt[]) => `<polygon style="fill:${c};stroke:${c}" points="${P(pts)}"/>`;
/** ふくらんだ面: 頂点を中に置いた扇に割り、左上から光が当たる向きの面ほど明るく塗る（クッションの丸み） */
function puff(pal: Pal, pts: Pt[], apex: Pt) {
  const L = [-.55, -.83];
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length], mx = (a[0] + b[0]) / 2 - apex[0], my = (a[1] + b[1]) / 2 - apex[1], d = Math.hypot(mx, my) || 1;
    const t = (mx * L[0] + my * L[1]) / d;
    return poly(t > .45 ? pal.hi : t > -.1 ? pal.mid : t > -.6 ? pal.lo : pal.deep, [apex, a, b]);
  }).join("");
}
/** 平らな面を 2 枚の三角に割る（左上を明るく） */
const slab = (a: string, b: string, [x0, y0, x1, y1]: number[]) => poly(a, [[x0, y0], [x1, y0], [x0, y1]]) + poly(b, [[x1, y0], [x1, y1], [x0, y1]]);
const mirror = (W: number, pts: Pt[]): Pt[] => pts.map(([x, y]) => [W - x, y] as Pt).reverse();

// 素材の色（夜の部屋に合わせて、やや暗め）
const WOOD: Pal = { hi: "#94694a", mid: "#704e35", lo: "#513725", deep: "#36251a" };
const SAGE: Pal = { hi: "#93a89c", mid: "#76897f", lo: "#5a6b62", deep: "#3d4a43" };
const OCHRE: Pal = { hi: "#d3a55a", mid: "#b38641", lo: "#8b652e", deep: "#5c421e" };
const ROSE: Pal = { hi: "#c98d78", mid: "#a96d59", lo: "#845241", deep: "#59362b" };

// ---------- ソファ（300×110、足元 y=110） ----------
function sofaArt() {
  const W = 300, F = SAGE;
  const backL: Pt[] = [[44, 27], [96, 21], [148, 25], [150, 47], [148, 69], [46, 69], [42, 47]];
  const seatL: Pt[] = [[44, 70], [148, 70], [150, 77], [148, 91], [46, 91], [43, 77]];
  const armL: Pt[] = [[5, 52], [22, 45], [40, 47], [47, 55], [45, 63], [8, 63], [3, 57]];
  return `
    ${poly(F.deep, [[30, 30], [60, 18], [150, 13], [240, 18], [270, 30], [270, 92], [30, 92]])}
    ${poly(F.lo, [[30, 30], [60, 18], [150, 13], [240, 18], [270, 30], [150, 22]])}
    ${puff(F, backL, [92, 41])}${puff(F, mirror(W, backL), [W - 92 - 6, 41])}
    ${slab(F.lo, F.deep, [30, 90, 270, 101])}
    ${poly(F.hi, [[46, 63], [148, 63], [149, 70], [44, 70]])}${poly(F.mid, [[152, 63], [254, 63], [256, 70], [151, 70]])}
    ${puff(F, seatL, [94, 78])}${puff(F, mirror(W, seatL), [W - 94 - 4, 78])}
    ${slab(F.mid, F.lo, [5, 61, 45, 101])}${slab(F.lo, F.deep, [255, 61, 295, 101])}
    ${puff(F, armL, [21, 53])}${puff(F, mirror(W, armL), [W - 21 - 6, 53])}
    ${poly(WOOD.mid, [[38, 100], [50, 100], [47, 110], [41, 110]])}${poly(WOOD.lo, [[250, 100], [262, 100], [259, 110], [253, 110]])}
    <i data-cat-plat="bed" data-sink="4" style="left:16%;width:68%;top:57.5%"></i>
    <i data-cat-plat="perch" data-sink="2" style="left:14%;width:72%;top:13%"></i>`;
}

// ---------- ひとりがけ（150×112）。背の高いウイングチェア ----------
function chairArt() {
  const W = 150, F = OCHRE;
  const armL: Pt[] = [[5, 54], [18, 48], [34, 50], [39, 58], [37, 66], [8, 66], [3, 60]];
  return `
    ${poly(F.deep, [[22, 22], [44, 10], [75, 6], [106, 10], [128, 22], [130, 94], [20, 94]])}
    ${puff(F, [[34, 18], [75, 11], [116, 18], [118, 44], [116, 70], [34, 70], [32, 44]], [70, 34])}
    ${slab(F.lo, F.deep, [22, 92, 128, 102])}
    ${poly(F.hi, [[38, 64], [112, 64], [114, 71], [36, 71]])}
    ${puff(F, [[34, 71], [116, 71], [118, 78], [116, 93], [34, 93], [32, 78]], [70, 79])}
    ${slab(F.mid, F.lo, [5, 64, 37, 102])}${slab(F.lo, F.deep, [113, 64, 145, 102])}
    ${puff(F, armL, [19, 55])}${puff(F, mirror(W, armL), [W - 19 - 6, 55])}
    ${poly(WOOD.mid, [[28, 101], [38, 101], [36, 112], [31, 112]])}${poly(WOOD.lo, [[112, 101], [122, 101], [119, 112], [114, 112]])}
    <i data-cat-plat="bed" data-sink="4" style="left:24%;width:52%;top:58%"></i>`;
}

// ---------- クッション（100×36）。床に置く大きな座布団: ふくらんだ上の面と、手前の側面 ----------
function cushionArt() {
  const F = ROSE;
  return `
    ${poly(F.mid, [[3, 17], [50, 17], [50, 34], [12, 34], [5, 31]])}
    ${poly(F.lo, [[50, 17], [97, 17], [95, 31], [88, 34], [50, 34]])}
    ${puff(F, [[10, 5], [50, 2], [90, 5], [98, 12], [97, 18], [50, 20], [3, 18], [2, 12]], [46, 9])}
    ${poly(F.deep, [[44, 8], [48, 7.4], [49, 10], [45, 10.6]])}
    <i data-cat-plat="bed" data-sink="5" style="left:12%;width:76%;top:22%"></i>`;
}

// ---------- ラグ（床に敷く。高さは床の奥行きに合わせて伸び縮みする） ----------
// キリム: 奥へ向かって少し細くなる長方形。赤の地に菱形を 5 つ、手前に房
function kilimArt() {
  const R: Pal = { hi: "#b4503a", mid: "#a1452f", lo: "#8a3a27", deep: "#6a2b1e" };
  const at = (u: number, v: number): Pt => { const y = 2 + 36 * v, inset = 22 * (1 - v); return [inset + (280 - 2 * inset) * u, y]; };
  const quad = (u0: number, v0: number, u1: number, v1: number) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  let s = poly("#e2cfa8", quad(0, 0, 1, 1)) + poly(R.deep, quad(.02, .1, .98, .9));
  // 地: 細長い三角の面で、わずかに濃淡
  for (let i = 0; i < 8; i++) {
    const u0 = .03 + i * .94 / 8, u1 = u0 + .94 / 8, c = [R.hi, R.mid, R.lo, R.mid][i % 4];
    s += poly(c, [at(u0, .16), at(u1, .16), at(u0, .84)]) + poly(i % 2 ? R.mid : R.lo, [at(u1, .16), at(u1, .84), at(u0, .84)]);
  }
  for (let i = 0; i < 5; i++) {
    const u = .14 + i * .18, w = .06, c = i % 2 ? "#d0953e" : "#2d3f5c";
    s += poly(c, [at(u, .2), at(u + w, .5), at(u, .8), at(u - w, .5)]);
    s += poly("#e7d5b1", [at(u, .38), at(u + w * .4, .5), at(u, .62), at(u - w * .4, .5)]);
  }
  for (let i = 0; i <= 34; i++) { const [x] = at(i / 34, 1); s += poly("#d9c6a0", [[x - .7, 38], [x + .7, 38], [x + .4, 40], [x - .4, 40]]); }
  return s;
}
// 丸いラグ: 楕円を同心の輪に分け、輪ごとに三角の面で
function roundArt() {
  const N = 18, cx = 120, cy = 20, rings = [[118, 19.5], [92, 15], [62, 10], [28, 4.6]];
  const cols = [["#d8c8a6", "#c6b48f"], ["#b8693f", "#a35a34"], ["#d8c8a6", "#c6b48f"], ["#8a6a48", "#755a3c"]];
  const pt = (r: number[], k: number): Pt => { const a = k / N * Math.PI * 2; return [cx + Math.cos(a) * r[0], cy + Math.sin(a) * r[1]]; };
  let s = "";
  rings.forEach((r, j) => {
    const inner = rings[j + 1];
    for (let k = 0; k < N; k++) {
      const [a, b] = cols[j], lit = Math.sin(k / N * Math.PI * 2) < 0; // 奥側が少し明るい
      if (inner) s += poly(lit ? a : b, [pt(r, k), pt(r, k + 1), pt(inner, k)]) + poly(lit ? b : a, [pt(r, k + 1), pt(inner, k + 1), pt(inner, k)]);
      else s += poly(k % 2 ? a : b, [[cx, cy], pt(r, k), pt(r, k + 1)]);
    }
  });
  return s;
}

const ART: Record<string, () => string> = { sofa: sofaArt, chair: chairArt, cushion: cushionArt, kilim: kilimArt, round: roundArt };
const VB: Record<string, string> = { sofa: "0 0 300 110", chair: "0 0 150 112", cushion: "0 0 100 36", kilim: "0 0 280 40", round: "0 0 240 40" };

// ---------- 床に並べる ----------
let layer: HTMLElement | undefined;
function place(el: HTMLElement, k: string) {
  const t = THINGS.find(x => x.key === k)!, s = thingSize(k);
  el.style.setProperty("--w", `${(t.w * s).toFixed(1)}px`);
  el.style.setProperty("--h", `${(t.h * s).toFixed(1)}px`);
  el.style.setProperty("--s", s.toFixed(3));
  el.style.setProperty("--x", thingX(k).toFixed(3));
}
/** 背の高い家具の分だけ、ホームの下（床の上の余白）を広げる */
function room() {
  const tall = Math.max(0, ...placedThings().map(k => { const t = THINGS.find(x => x.key === k)!; return t.flat ? 0 : t.h * thingSize(k); }));
  document.documentElement.style.setProperty("--things-h", `${Math.max(0, Math.round(tall - 52))}px`);
}
function paint(remeasure = false) {
  const grid = document.querySelector<HTMLElement>("#view-home .grid");
  if (!grid) return;
  if (!layer || !layer.isConnected || layer.parentElement !== grid) {
    layer?.remove();
    layer = document.createElement("div");
    layer.className = "room-things";
    layer.setAttribute("aria-hidden", "true");
    grid.prepend(layer);
  }
  const want = placedThings().sort((a, b) => Number(!THINGS.find(t => t.key === a)!.flat) - Number(!THINGS.find(t => t.key === b)!.flat)); // 敷くものを下に
  layer.innerHTML = want.map(k => {
    const t = THINGS.find(x => x.key === k)!, art = ART[k](), plats = art.match(/<i [^>]*><\/i>/g) ?? [];
    return `<div class="thing thing-${k}${t.flat ? " flat" : ""}" data-thing="${k}"${t.flat ? " data-cat-rug" : ""}>
      <svg viewBox="${VB[k]}" preserveAspectRatio="${t.flat ? "none" : "xMidYMax meet"}">${art.replace(/<i [^>]*><\/i>/g, "")}</svg>${plats.join("")}</div>`;
  }).join("");
  layer.querySelectorAll<HTMLElement>("[data-thing]").forEach(el => place(el, el.dataset.thing!));
  room();
  if (remeasure) dispatchEvent(new Event("resize"));
}

/** ホームを作ったあとに呼ぶ（床の上に家具を置く） */
export function mountThings() { paint(); }
