// 部屋に置く家具と、壁に掛けるもの。棚の小物と同じローポリ（平らな多角形と濃淡 4 段）で描く。
// 何を置くかは設定の「部屋」→「置くもの」からホームへドラッグして選ぶ。同じものをいくつでも置ける（猫の家具はひとつずつ）。
//  - 床: 左右にドラッグ、上下にドラッグで奥行き（奥ほど小さく・少し暗く・後ろに重なる）。床を敷いているときだけ見える
//  - 壁: 上下左右どこにでも掛けられる。棚やモジュールの手前に掛かる
//  - 大きさは角のつまみ（size-knob.ts）、ダブルクリックで左右を反転
// 猫はソファやクッションの上で丸くなり、ソファの背もたれにも乗る（data-cat-plat を cat.ts が足場として測る）。
// ラグの上は暖かいので、床にいる猫はラグの上で横になりたがる（data-cat-rug）。
// 保存は kona.things に { v: 2, items: [{ id, k, x, d?, y?, s?, f? }] }。以前の { on, x, s }（種類ごとにひとつ）は読むときに移す
import "./room-things.css";
import { stored, currentOver, mountingWith } from "./modctx";
import { mountCatTower, mountScratcher, mountCatFood, mountCatBox } from "./mod-cat";

const KEY = "kona.things";
/** 置ける数の上限（パーティーで部屋を写すとき、ひとつの値が大きくなりすぎないように） */
export const MAX_ITEMS = 60;

type Def = { key: string; label: string; w: number; h: number; x: number; y?: number; flat?: boolean; at: "floor" | "wall"; one?: boolean };
/** 置けるもの。w/h は描いた大きさ（大きさ 100% のときの px）、x/y は最初に置く位置（0〜1）。flat は床に敷くもの、one はひとつだけ置けるもの */
export const THINGS: readonly Def[] = [
  { key: "sofa", label: "ソファ", w: 300, h: 110, x: .5, at: "floor" },
  { key: "chair", label: "ひとりがけ", w: 150, h: 112, x: .8, at: "floor" },
  { key: "cushion", label: "クッション", w: 100, h: 36, x: .22, at: "floor" },
  { key: "kilim", label: "キリム", w: 280, h: 0, x: .5, flat: true, at: "floor" },
  { key: "round", label: "丸いラグ", w: 240, h: 0, x: .3, flat: true, at: "floor" },
  // 猫の家具（以前はモジュール。形と動きは mod-cat.ts。中に状態を持つので、ひとつずつ）
  { key: "tower", label: "キャットタワー", w: 170, h: 330, x: .92, at: "floor", one: true },
  { key: "box", label: "箱（紙袋）", w: 120, h: 96, x: .06, at: "floor", one: true },
  { key: "food", label: "猫のごはん", w: 150, h: 40, x: .7, at: "floor", one: true },
  { key: "scratcher", label: "爪とぎ", w: 170, h: 36, x: .38, at: "floor", one: true },
  // 壁に掛けるもの
  { key: "frame", label: "額（夜の丘）", w: 96, h: 74, x: .3, y: .15, at: "wall" },
  { key: "still", label: "額（静物）", w: 56, h: 72, x: .4, y: .2, at: "wall" },
  { key: "mirror", label: "丸い鏡", w: 72, h: 72, x: .6, y: .15, at: "wall" },
  { key: "sconce", label: "壁のランプ", w: 44, h: 48, x: .7, y: .2, at: "wall" },
  { key: "garland", label: "ガーランド", w: 240, h: 46, x: .5, y: .02, at: "wall" },
  { key: "swag", label: "ドライフラワー", w: 50, h: 96, x: .15, y: .12, at: "wall" },
];
export const defOf = (k: string) => THINGS.find(t => t.key === k);
/** 猫の家具は mod-cat.ts の描き方（大きさに合わせて描き、猫の足場も中に持つ）でそのまま置く */
const MOUNT: Record<string, (body: HTMLElement) => void> = { tower: mountCatTower, box: mountCatBox, food: mountCatFood, scratcher: mountScratcher };
/** 以前のモジュールの種類 → 床の家具 */
export const THING_OF_MODULE: Record<string, string> = { cattower: "tower", catbox: "box", catfood: "food", scratcher: "scratcher" };
export const THING_MIN = 0.5, THING_MAX = 1.5;

/** 置いたひとつ。x: 左端 0〜右端 1。d: 床の奥行き（0 手前〜1 奥）。y: 壁の高さ（0 上〜1 下）。s: 大きさ。f: 左右反転 */
export type Item = { id: string; k: string; x: number; d?: number; y?: number; s?: number; f?: 1 };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const num = (v: unknown, a: number, b: number) => typeof v === "number" && Number.isFinite(v) ? clamp(v, a, b) : undefined;

/** 保存した形・ホストから届いた形を確かめて、知っている種類と範囲の中の数だけにする */
function clean(list: unknown[]): Item[] {
  const out: Item[] = [], ids = new Set<string>(), one = new Set<string>();
  for (const v of list) {
    if (out.length >= MAX_ITEMS) break;
    const o = v as Record<string, unknown> | null;
    if (!o || typeof o !== "object" || typeof o.k !== "string") continue;
    const def = defOf(o.k);
    if (!def || (def.one && one.has(def.key))) continue;
    const id = typeof o.id === "string" && /^[a-z0-9-]{1,24}$/.test(o.id) && !ids.has(o.id) ? o.id : newId(def.key, ids);
    const it: Item = { id, k: def.key, x: num(o.x, 0, 1) ?? def.x };
    if (def.at === "wall") it.y = num(o.y, 0, 1) ?? def.y ?? .2;
    else if (!def.flat) { const d = num(o.d, 0, 1); if (d) it.d = d; }
    const s = num(o.s, THING_MIN, THING_MAX);
    if (s !== undefined && Math.abs(s - 1) > .001) it.s = s;
    if (o.f === 1 && !MOUNT[def.key]) it.f = 1;
    ids.add(id); if (def.one) one.add(def.key);
    out.push(it);
  }
  return out;
}
function newId(k: string, used: Set<string> | Item[]) {
  const has = (id: string) => used instanceof Set ? used.has(id) : used.some(i => i.id === id);
  if (!has(k)) return k; // ひとつめは種類の名前のまま（以前の保存と同じ）
  for (let n = 2; ; n++) if (!has(`${k}-${n}`)) return `${k}-${n}`;
}
function load(): Item[] {
  try {
    const v = JSON.parse(stored(KEY) || "{}");
    if (Array.isArray(v?.items)) return clean(v.items);
    // 以前の形: 種類ごとにひとつ（on: 置いている種類、x: 左右、s: 大きさ）
    const on: unknown[] = Array.isArray(v?.on) ? v.on : [], xs = v?.x && typeof v.x === "object" ? v.x : {}, ss = v?.s && typeof v.s === "object" ? v.s : {};
    return clean(on.filter((k): k is string => typeof k === "string").map(k => ({ id: k, k, x: xs[k], s: ss[k] })));
  } catch { return []; }
}
const save = (items: Item[]) => { try { localStorage.setItem(KEY, JSON.stringify({ v: 2, items })); } catch { /* 保存できなくても動く */ } };

/** 置いているもの（置いた順） */
export const thingItems = () => load();
/** 置いている種類（THINGS の順、重ならない） */
export const placedThings = () => { const ks = new Set(load().map(i => i.k)); return THINGS.filter(t => ks.has(t.key)).map(t => t.key); };
export const countOf = (k: string) => load().filter(i => i.k === k).length;
export const thingOf = (id: string) => load().find(i => i.id === id);
export const thingSize = (id: string) => thingOf(id)?.s ?? 1;
export const canFlip = (id: string) => { const k = thingOf(id)?.k; return !!k && !MOUNT[k]; };

/** ひとつ置く（ひとつだけのものは、置いてあればそれを動かす）。置いたものの id を返す */
export function addThing(k: string, p: { x?: number; d?: number; y?: number } = {}): string | undefined {
  const def = defOf(k), items = load();
  if (!def) return undefined;
  const had = def.one && items.find(i => i.k === k);
  if (had) { setThing(had.id, p, true); return had.id; }
  if (items.length >= MAX_ITEMS) return undefined;
  const id = newId(k, items);
  items.push(clean([{ id, k, x: p.x ?? def.x, d: p.d, y: p.y ?? def.y }])[0]);
  save(items); paint(true);
  return id;
}
export function removeThing(id: string) { save(load().filter(i => i.id !== id)); paint(true); }
/** 種類ごと置く / しまう（しまうときは、その種類をすべて） */
export function toggleThing(k: string, on: boolean) {
  if (on) { if (!countOf(k)) addThing(k); return; }
  save(load().filter(i => i.k !== k)); paint(true);
}
export function flipThing(id: string) {
  const items = load(), it = items.find(i => i.id === id);
  if (!it || MOUNT[it.k]) return;
  if (it.f) delete it.f; else it.f = 1;
  save(items);
  const el = elOf(id);
  if (el) place(el, it);
}
/** 位置と大きさ。つまみを動かしている間は描き直さず、置き場所だけを動かす。done で猫の足場を測り直す */
export function setThing(id: string, p: { x?: number; d?: number; y?: number; s?: number }, done = false) {
  const items = load(), it = items.find(i => i.id === id);
  if (!it) return;
  const def = defOf(it.k)!;
  if (p.x !== undefined) it.x = clamp(p.x, 0, 1);
  if (p.y !== undefined && def.at === "wall") it.y = clamp(p.y, 0, 1);
  if (p.d !== undefined && def.at === "floor" && !def.flat) { if (p.d < .005) delete it.d; else it.d = clamp(p.d, 0, 1); }
  if (p.s !== undefined) { if (Math.abs(p.s - 1) < .001) delete it.s; else it.s = clamp(p.s, THING_MIN, THING_MAX); }
  save(items);
  const el = elOf(id);
  if (el) place(el, it); else paint();
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


// ---------- 壁に掛けるもの ----------
const BRASS: Pal = { hi: "#d8b46a", mid: "#b48f4c", lo: "#8a6b35", deep: "#5e4823" };
const INK: Pal = { hi: "#4a4440", mid: "#38332f", lo: "#2b2724", deep: "#1e1b19" };
/** 額縁: 4 本の台形（上と左が明るい） */
const bevel = (W: number, H: number, b: number, p: Pal) =>
  poly(p.hi, [[0, 0], [W, 0], [W - b, b], [b, b]]) + poly(p.mid, [[0, 0], [b, b], [b, H - b], [0, H]]) +
  poly(p.lo, [[W, 0], [W, H], [W - b, H - b], [W - b, b]]) + poly(p.deep, [[0, H], [b, H - b], [W - b, H - b], [W, H]]);
/** 正多角形（n 角）の頂点 */
const ngon = (cx: number, cy: number, r: number, n: number, a0 = 0): Pt[] => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt; });

// 額（夜の丘）96×74: 夜空と月、重なる丘
function frameArt() {
  const W = 96, H = 74, b = 7, R = W - b, B = H - b;
  return `${bevel(W, H, b, WOOD)}
    ${poly("#24304a", [[b, b], [R, b], [R, 30], [b, 26]])}${poly("#2e3c5a", [[b, 26], [R, 30], [R, 44], [b, 42]])}${poly("#3a4a68", [[b, 42], [R, 44], [R, 52], [b, 52]])}
    ${poly("#eadcae", ngon(68, 21, 6, 8))}${poly("#d2c290", [[68, 15], [74, 21], [68, 27]])}
    ${poly("#e9e4d0", [[22, 16], [23, 17], [22, 18], [21, 17]])}${poly("#e9e4d0", [[40, 12], [41, 13], [40, 14], [39, 13]])}${poly("#e9e4d0", [[83, 33], [84, 34], [83, 35], [82, 34]])}
    ${poly("#4f6b55", [[b, 46], [26, 37], [44, 45], [b, 54]])}${poly("#3f5946", [[26, 37], [52, 47], [R, 40], [R, 56], [b, 54], [44, 45]])}
    ${poly("#34503d", [[b, 54], [R, 56], [R, B], [b, B]])}${poly("#2a4232", [[b, 58], [36, 52], [64, 61], [R, 57], [R, B], [b, B]])}
    ${poly("#1f3326", [[52, B], [60, 58], [68, B]])}`;
}
// 額（静物）56×72: 黒い細い額、生成りの台紙、卓の上の器と果物
function stillArt() {
  const W = 56, H = 72, b = 4;
  return `${bevel(W, H, b, INK)}
    ${poly("#e4d8bf", [[b, b], [W - b, b], [W - b, H - b], [b, H - b]])}
    ${poly("#c9b48e", [[9, 9], [47, 9], [47, 63], [9, 63]])}${poly("#b9a37c", [[9, 46], [47, 46], [47, 63], [9, 63]])}
    ${poly("#5b7a8c", [[18, 46], [17, 34], [20, 26], [26, 26], [29, 34], [28, 46]])}${poly("#46606f", [[23, 46], [23, 26], [26, 26], [29, 34], [28, 46]])}
    ${poly("#c4683f", ngon(36, 42, 4.6, 7))}${poly("#a2512f", [[36, 37.4], [40.6, 42], [36, 46.6]])}
    ${poly("#d9a441", ngon(41, 44, 3, 6))}`;
}
// 丸い鏡 72×72: 真鍮の八角の縁、映り込みの斜めの帯
function mirrorArt() {
  const o = ngon(36, 36, 35, 12, Math.PI / 12), i = ngon(36, 36, 29, 12, Math.PI / 12);
  let s = "";
  for (let k = 0; k < 12; k++) { const n = (k + 1) % 12, t = Math.sin(k / 12 * Math.PI * 2 + 2.4); s += poly(t > .4 ? BRASS.hi : t > -.2 ? BRASS.mid : t > -.7 ? BRASS.lo : BRASS.deep, [o[k], o[n], i[n], i[k]]); }
  s += poly("#56606a", i) + poly("#6b7680", [i[6], i[7], i[8], [20, 46], [12, 40]]);
  s += poly("#8a96a0", [[22, 14], [30, 11], [12, 40], [9, 33]]) + poly("#7a868f", [[36, 9], [40, 10], [16, 50], [13, 46]]);
  return s;
}
// 壁のランプ 44×80: 壁の座金と腕、布のかさ
function sconceArt() {
  return `${poly(BRASS.lo, [[3, 30], [9, 27], [9, 47], [3, 44]])}${poly(BRASS.mid, [[9, 36], [24, 30], [25, 33], [9, 39]])}
    ${poly(BRASS.deep, [[22, 30], [26, 30], [26, 22], [22, 22]])}
    ${poly("#e8d3a6", [[13, 4], [35, 4], [41, 26], [7, 26]])}${poly("#c9b281", [[24, 4], [35, 4], [41, 26], [24, 26]])}
    ${poly("#f6e2b0", [[9, 26], [39, 26], [37, 29], [11, 29]])}`;
}
// ガーランド 240×46: たるんだ紐に三角の旗
function garlandArt() {
  const W = 240, sag = (u: number) => 4 + 24 * 4 * u * (1 - u), cols = ["#b85a43", "#d3a55a", "#6f8f7d", "#d8c8a6", "#7a6aa0"];
  let s = "";
  for (let i = 0; i < 24; i++) { const u0 = i / 24, u1 = (i + 1) / 24; s += poly("#cbbfa6", [[u0 * W, sag(u0)], [u1 * W, sag(u1)], [u1 * W, sag(u1) + 1.2], [u0 * W, sag(u0) + 1.2]]); }
  for (let i = 0; i < 9; i++) {
    const u = .08 + i * .105, a = (u - .035) * W, b = (u + .035) * W, ya = sag(u - .035) + .6, yb = sag(u + .035) + .6, tip: Pt = [u * W, sag(u) + 16];
    const c = cols[i % cols.length], mid: Pt = [u * W, (ya + yb) / 2];
    s += poly(c, [[a, ya], mid, tip]) + `<polygon style="fill:${c};stroke:${c};filter:brightness(.78)" points="${P([mid, [b, yb], tip])}"/>`;
  }
  return s;
}
// ドライフラワー 50×96: 逆さに吊った束。紐・結び目・茎・花穂
function swagArt() {
  let s = poly("#9c8a6a", [[24.4, 0], [25.6, 0], [25.6, 14], [24.4, 14]]) + poly("#a7553f", [[18, 14], [32, 14], [29, 22], [21, 22]]) + poly("#8a4433", [[25, 14], [32, 14], [29, 22], [25, 22]]);
  const heads = ["#c9a46a", "#b9806c", "#d8cca8", "#9a8a5a", "#c27a5a", "#e0c79a", "#8f7a99"];
  for (let i = 0; i < 9; i++) {
    const a = (i - 4) * .13, x0 = 25 + (i - 4) * .8, len = 52 + (i % 3) * 8, x1 = 25 + Math.sin(a) * len, y1 = 20 + Math.cos(a) * len;
    s += poly(i % 2 ? "#7d7a4e" : "#6a6a42", [[x0 - .6, 20], [x0 + .6, 20], [x1 + .5, y1], [x1 - .5, y1]]);
    const c = heads[i % heads.length];
    s += poly(c, [[x1 - 4, y1 - 2], [x1, y1 - 5], [x1 + 4, y1 - 1], [x1 + 2, y1 + 6], [x1 - 2, y1 + 6]]) + `<polygon style="fill:${c};stroke:${c};filter:brightness(.8)" points="${P([[x1, y1 - 5], [x1 + 4, y1 - 1], [x1 + 2, y1 + 6]])}"/>`;
  }
  return s;
}

const ART: Record<string, () => string> = {
  sofa: sofaArt, chair: chairArt, cushion: cushionArt, kilim: kilimArt, round: roundArt,
  frame: frameArt, still: stillArt, mirror: mirrorArt, sconce: sconceArt, garland: garlandArt, swag: swagArt,
};
const VB: Record<string, string> = Object.fromEntries(THINGS.filter(t => !MOUNT[t.key]).map(t => [t.key, `0 0 ${t.w} ${t.flat ? 40 : t.h}`]));
/** 設定に並べる見本・ドラッグの影（猫の足場の印は除く）。猫の家具は、標準の大きさで描いたものを縮めて見せる */
export function thingThumb(k: string, box = 44): HTMLElement {
  const t = defOf(k)!, wrap = document.createElement("span");
  wrap.className = "thing-thumb";
  if (!MOUNT[k]) { wrap.innerHTML = `<svg viewBox="${VB[k]}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${ART[k]().replace(/<i [^>]*><\/i>/g, "")}</svg>`; return wrap; }
  const z = Math.min(box / t.h, (box * 1.6) / t.w), inner = document.createElement("div");
  inner.className = "thing-mod"; inner.style.cssText = `display:flex;flex-direction:column;width:${t.w}px;height:${t.h}px;transform:scale(${z.toFixed(3)});transform-origin:0 100%;position:absolute;left:0;bottom:0;pointer-events:none`;
  wrap.style.cssText = `position:relative;display:block;width:${(t.w * z).toFixed(0)}px;height:${(t.h * z).toFixed(0)}px`;
  wrap.append(inner);
  // 大きさを測ってから描くので、画面に入ってから描く
  requestAnimationFrame(() => { MOUNT[k](inner); inner.querySelectorAll("[data-cat-plat]").forEach(e => e.removeAttribute("data-cat-plat")); inner.querySelectorAll("button").forEach(b => { b.tabIndex = -1; }); });
  return wrap;
}

// ---------- 床と壁に並べる ----------
let floorLayer: HTMLElement | undefined, wallLayer: HTMLElement | undefined;
const made = new Map<string, HTMLElement>(); // id → 要素（猫の家具の動きを止めないよう、一度作ったものは使い回す）
const elOf = (id: string) => (floorLayer ?? wallLayer) && [floorLayer, wallLayer].map(l => l?.querySelector<HTMLElement>(`:scope > [data-thing="${id}"]`)).find(Boolean);

// ひとつ作る。猫の家具は床に置いて大きさが決まってから描く（部屋の写しでは、ホストの設定のまま描く）
function build(it: Item) {
  const t = defOf(it.k)!, k = it.k;
  const el = document.createElement("div");
  el.className = `thing thing-${k}${t.flat ? " flat" : ""}${MOUNT[k] ? " cat-thing" : ""}`;
  el.dataset.thing = it.id; el.dataset.kind = k;
  if (t.flat) el.dataset.catRug = "";
  if (MOUNT[k]) {
    const body = document.createElement("div");
    body.className = "thing-mod";
    el.append(body);
    const o = currentOver();
    requestAnimationFrame(() => mountingWith(o, () => MOUNT[k](body)));
    return el;
  }
  const art = ART[k](), plats = art.match(/<i [^>]*><\/i>/g) ?? [];
  el.innerHTML = `<svg viewBox="${VB[k]}" preserveAspectRatio="${t.flat ? "none" : "xMidYMax meet"}">${art.replace(/<i [^>]*><\/i>/g, "")}</svg>${plats.join("")}`;
  return el;
}
/** 奥行き d（0 手前〜1 奥）での縮み */
const farScale = (d: number) => 1 - .16 * d;
function place(el: HTMLElement, it: Item) {
  const t = defOf(it.k)!, s = it.s ?? 1, d = t.at === "floor" && !t.flat ? it.d ?? 0 : 0, z = s * farScale(d);
  el.style.setProperty("--w", `${(t.w * z).toFixed(1)}px`);
  el.style.setProperty("--h", `${(t.h * z).toFixed(1)}px`);
  el.style.setProperty("--s", s.toFixed(3));
  el.style.setProperty("--x", it.x.toFixed(3));
  if (t.at === "wall") el.style.setProperty("--y", (it.y ?? .2).toFixed(3));
  else { el.style.setProperty("--d", d.toFixed(3)); el.style.zIndex = t.flat ? "0" : String(2 + Math.round((1 - d) * 40)); }
  el.classList.toggle("flip", !!it.f);
}
/** 背の高い家具の分だけ、ホームの下（床の上の余白）を広げる */
function room() {
  const tall = Math.max(0, ...load().map(it => { const t = defOf(it.k)!; return t.at !== "floor" || t.flat ? 0 : t.h * (it.s ?? 1) * farScale(it.d ?? 0) + 22 * (it.d ?? 0); }));
  document.documentElement.style.setProperty("--things-h", `${Math.max(0, Math.round(tall - 52))}px`);
}
const newLayer = (cls: string) => { const el = document.createElement("div"); el.className = cls; el.setAttribute("aria-hidden", "true"); return el; };
/** 敷くものを下に、あとは置いた順 */
const ordered = (items: Item[]) => [...items].sort((a, b) => Number(!defOf(a.k)!.flat) - Number(!defOf(b.k)!.flat));
/** 床と壁の層（部屋の写しで使う。組み立てる間はホストの設定で読む） */
export function thingsLayer(): DocumentFragment {
  const f = newLayer("room-things"), w = newLayer("room-wall"), items = ordered(load());
  for (const it of items) { const el = build(it); place(el, it); (defOf(it.k)!.at === "wall" ? w : f).append(el); }
  const frag = document.createDocumentFragment();
  frag.append(f, w);
  return frag;
}
function paint(remeasure = false) {
  const grid = document.querySelector<HTMLElement>("#view-home .grid");
  if (!grid) return;
  if (!floorLayer || floorLayer.parentElement !== grid) { floorLayer?.remove(); floorLayer = newLayer("room-things"); grid.prepend(floorLayer); }
  if (!wallLayer || wallLayer.parentElement !== grid) { wallLayer?.remove(); wallLayer = newLayer("room-wall"); floorLayer.after(wallLayer); }
  const items = ordered(load()), keep = new Set(items.map(i => `${i.id}:${i.k}`));
  for (const key of [...made.keys()]) if (!keep.has(key)) made.delete(key);
  const fl: HTMLElement[] = [], wl: HTMLElement[] = [];
  for (const it of items) {
    const key = `${it.id}:${it.k}`;
    let el = made.get(key);
    if (!el) { el = build(it); made.set(key, el); }
    place(el, it);
    (defOf(it.k)!.at === "wall" ? wl : fl).push(el);
  }
  floorLayer.replaceChildren(...fl); wallLayer.replaceChildren(...wl);
  room();
  if (remeasure) dispatchEvent(new Event("resize"));
}

/** ホームを作ったあとに呼ぶ（床と壁に置く） */
export function mountThings() { paint(); }
