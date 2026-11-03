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
import { ITEMS, itemOf, viewBoxOf } from "./items";
import { startLive } from "./items/live";
import { itemTag } from "./presents";
import { t as tr } from "./i18n";
import { clamp } from "./dom";

const KEY = "kona.things";
/** 置ける数の上限（パーティーで部屋を写すとき、ひとつの値が大きくなりすぎないように） */
export const MAX_ITEMS = 60;

type Def = { key: string; label: string; w: number; h: number; x: number; y?: number; flat?: boolean; at: "floor" | "wall"; one?: boolean };
/** 置けるもの: items/ の床と壁のもの（形は 1 品 1 ファイル）と、猫の家具（形と動きは mod-cat.ts。中に状態を持つので、ひとつずつ）。
 *  w/h は描いた大きさ（大きさ 100% のときの px）、x/y は最初に置く位置（0〜1）。flat は床に敷くもの、one はひとつだけ置けるもの */
export const THINGS: readonly Def[] = [
  ...ITEMS.filter(d => d.at === "floor" && !d.flat).map(d => ({ key: d.key, label: d.label, w: d.w, h: d.h, x: d.x ?? .5, at: "floor" as const })),
  ...ITEMS.filter(d => d.at === "floor" && d.flat).map(d => ({ key: d.key, label: d.label, w: d.w, h: d.h, x: d.x ?? .5, flat: true, at: "floor" as const })),
  { key: "tower", label: "キャットタワー", w: 170, h: 330, x: .92, at: "floor", one: true },
  { key: "box", label: "箱（紙袋）", w: 120, h: 96, x: .06, at: "floor", one: true },
  { key: "food", label: "猫のごはん", w: 150, h: 40, x: .7, at: "floor", one: true },
  { key: "scratcher", label: "爪とぎ", w: 170, h: 36, x: .38, at: "floor", one: true },
  ...ITEMS.filter(d => d.at === "wall").map(d => ({ key: d.key, label: d.label, w: d.w, h: d.h, x: d.x ?? .5, y: d.y ?? .2, at: "wall" as const })),
];
export const defOf = (k: string) => THINGS.find(t => t.key === k);
/** 猫の家具は mod-cat.ts の描き方（大きさに合わせて描き、猫の足場も中に持つ）でそのまま置く */
const MOUNT: Record<string, (body: HTMLElement) => void> = { tower: mountCatTower, box: mountCatBox, food: mountCatFood, scratcher: mountScratcher };
/** 以前のモジュールの種類 → 床の家具 */
export const THING_OF_MODULE: Record<string, string> = { cattower: "tower", catbox: "box", catfood: "food", scratcher: "scratcher" };
export const THING_MIN = 0.5, THING_MAX = 1.5;

/** 置いたひとつ。x: 左端 0〜右端 1。d: 床の奥行き（0 手前〜1 奥）。y: 壁の高さ（0 上〜1 下）。s: 大きさ。f: 左右反転 */
export type Item = { id: string; k: string; x: number; d?: number; y?: number; s?: number; f?: 1 };
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
/** 置いているものの key（同じものを 2 つ置けば 2 つ） */
export const placedAll = () => load().map(i => i.k);
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

const ART = (k: string) => itemOf(k)!.art();
const VB = (k: string) => viewBoxOf(itemOf(k)!);
/** 設定に並べる見本・ドラッグの影（猫の足場の印は除く）。猫の家具は、標準の大きさで描いたものを縮めて見せる */
export function thingThumb(k: string, box = 44): HTMLElement {
  const t = defOf(k)!, wrap = document.createElement("span");
  wrap.className = "thing-thumb";
  if (!MOUNT[k]) { wrap.innerHTML = `<svg viewBox="${VB(k)}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${ART(k).replace(/<i [^>]*><\/i>/g, "")}</svg>`; return wrap; }
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
  { const tag = itemTag(k); if (tag) el.title = `${tr(t.label)} · ${tag}`; }
  if (t.flat) el.dataset.catRug = "";
  if (MOUNT[k]) {
    const body = document.createElement("div");
    body.className = "thing-mod";
    el.append(body);
    const o = currentOver();
    requestAnimationFrame(() => mountingWith(o, () => MOUNT[k](body)));
    return el;
  }
  const art = ART(k), plats = art.match(/<i [^>]*><\/i>/g) ?? [];
  el.innerHTML = `<svg viewBox="${VB(k)}" preserveAspectRatio="${t.flat ? "none" : "xMidYMax meet"}">${art.replace(/<i [^>]*><\/i>/g, "")}</svg>${plats.join("")}`;
  startLive(itemOf(k), el.querySelector("svg"));
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

// ---------- 転がるおもちゃ ----------
// 毛糸玉・ねずみ・けりぐるみ（<i data-cat-toy="roll|slide">）は、猫が叩く・押すと床の上を転がって（滑って）止まり、止まった所を覚える。
// 端に当たると跳ね返る。転がる向きは叩いた向き（detail.dir）
const rolling = new Set<string>();
document.addEventListener("kona:bat", e => {
  const mark = e.target as HTMLElement | null, kind = mark?.dataset?.catToy;
  const el = mark?.closest?.<HTMLElement>(".thing"), id = el?.dataset.thing;
  if ((kind !== "roll" && kind !== "slide") || !el || !id || !floorLayer?.contains(el) || rolling.has(id)) return;
  const it = thingOf(id), span = floorLayer.getBoundingClientRect().width - el.getBoundingClientRect().width;
  if (!it || span <= 0) return;
  const d = (e as CustomEvent<{ dir?: number; power?: number }>).detail ?? {}, power = clamp(d.power ?? 1, 0, 1.3);
  const dist = (d.dir ?? 1) * power * (kind === "roll" ? 70 + Math.random() * 90 : 30 + Math.random() * 40) / span;
  const x0 = it.x, dur = (kind === "roll" ? 900 : 500) * (.7 + .4 * power), t0 = performance.now();
  const bounce = (x: number) => { x = ((x % 2) + 2) % 2; return x > 1 ? 2 - x : x; }; // 0〜1 の間で跳ね返す
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setThing(id, { x: bounce(x0 + dist * .5) }); return; }
  rolling.add(id);
  const step = (now: number) => {
    const u = Math.min(1, (now - t0) / dur), k = 1 - (1 - u) ** 3, x = bounce(x0 + dist * k);
    if (!el.isConnected) { rolling.delete(id); return; }
    el.style.setProperty("--x", x.toFixed(4));
    if (u < 1) requestAnimationFrame(step); else { rolling.delete(id); setThing(id, { x }); }
  };
  requestAnimationFrame(step);
});
