// 棚・再生中以外のモジュールが、本体（main.ts）から借りるもの
export { esc, fmt } from "./dom";

import type { Album } from "./library";
import type { Player } from "./player";
import { reduceMotion } from "./prefs";
import { listenedSeconds, playLog, stat, type PlayEvent, type PlayStat } from "./store";

export interface ModuleContext {
  player: Player;
  albums(): Album[];
  byKey(key: string): Album | undefined;
  play(a: Album): void;
  colorOf(a: Album): string;
}

let current: ModuleContext | undefined;
export const setModuleContext = (c: ModuleContext) => { current = c; };

/** 聴いた記録（聴いた記録・聴いた距離・アルバムの情報のモジュールが読む） */
export interface HistorySource {
  log(): readonly PlayEvent[];
  stat(albumKey: string): PlayStat;
  listened(): number;
}
const ownHistory: HistorySource = { log: playLog, stat, listened: listenedSeconds };

// リスニングパーティーの部屋では、ホームの写しのモジュールを、ホストの再生（の写し）と記録で動かす。
// モジュールは組み立てるときに ctx().player / hist() を受け取って持ち続けるので、組み立てる間だけ差し替える
export type ModOverride = Partial<ModuleContext> & { history?: HistorySource };
let over: ModOverride | undefined;
export function mountingWith<T>(o: ModOverride | undefined, fn: () => T): T {
  const was = over; over = o;
  try { return fn(); } finally { over = was; }
}
export const ctx = (): ModuleContext => over ? { ...current!, ...over } : current!;
export const hist = (): HistorySource => over?.history ?? ownHistory;

export const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** canvas を表示サイズ × 画素密度に合わせる。大きさが変わったら true */
export function fit(c: HTMLCanvasElement) {
  const r = c.getBoundingClientRect(), d = devicePixelRatio || 1;
  const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
  if (c.width === w && c.height === h) return false;
  c.width = w; c.height = h; return true;
}

/** モジュールが document に付ける聞き耳。root が DOM から外れていたら、次に届いたときに外す。
 *  まとめて捨てる写し（パーティーの部屋のホームの写しなど）は、捨てるときに releaseIn で外す */
const docListeners = new Set<{ root: HTMLElement; type: string; h: (e: Event) => void }>();
export function onDocument(root: HTMLElement, type: string, fn: (e: Event) => void) {
  const entry = { root, type, h: (e: Event) => { if (!root.isConnected) { off(); return; } fn(e); } };
  const off = () => { document.removeEventListener(type, entry.h); docListeners.delete(entry); };
  docListeners.add(entry);
  document.addEventListener(type, entry.h);
}
/** container の中のモジュールが付けた聞き耳を外す（container を捨てる前に呼ぶ） */
export function releaseIn(container: HTMLElement) {
  for (const e of [...docListeners]) if (container.contains(e.root)) { document.removeEventListener(e.type, e.h); docListeners.delete(e); }
}

/** 表示されている間だけ毎フレーム呼ぶ */
export function everyFrame(root: HTMLElement, fn: () => void) {
  requestAnimationFrame(function frame() {
    if (!root.isConnected) { setTimeout(() => root.isConnected ? everyFrame(root, fn) : undefined, 1000); return; }
    // 1 コマの失敗で描き続けるのをやめない（止まると、そのモジュールは二度と動かない）
    try { fn(); } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  });
}

const swaps = new WeakMap<HTMLElement, number>();
/** 中身の差し替えを、いったん薄く消してから現れるようにする（曲やアルバムが変わったとき、パッと変わらない） */
export function fadeSwap(el: HTMLElement, render: () => void, out = 200) {
  if (!el.childElementCount || reduceMotion()) { render(); return; }
  clearTimeout(swaps.get(el));
  el.classList.remove("swap-in");
  el.classList.add("swap-out");
  swaps.set(el, window.setTimeout(() => {
    swaps.delete(el);
    el.classList.remove("swap-out");
    render();
    fadeIn(el);
  }, out));
}
/** 現れるだけのフェード */
export function fadeIn(el: Element | null | undefined) {
  if (!el) return;
  el.classList.remove("swap-in"); void (el as HTMLElement).offsetWidth; el.classList.add("swap-in");
  el.addEventListener("animationend", () => el.classList.remove("swap-in"), { once: true });
}
