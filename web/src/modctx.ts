// 棚・再生中以外のモジュールが、本体（main.ts）から借りるもの

import type { Album } from "./library";
import type { Player } from "./player";
import { reduceMotion } from "./prefs";

export interface ModuleContext {
  player: Player;
  albums(): Album[];
  byKey(key: string): Album | undefined;
  play(a: Album): void;
  colorOf(a: Album): string;
}

let current: ModuleContext | undefined;
export const setModuleContext = (c: ModuleContext) => { current = c; };
export const ctx = () => current!;

export const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** canvas を表示サイズ × 画素密度に合わせる。大きさが変わったら true */
export function fit(c: HTMLCanvasElement) {
  const r = c.getBoundingClientRect(), d = devicePixelRatio || 1;
  const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
  if (c.width === w && c.height === h) return false;
  c.width = w; c.height = h; return true;
}

/** 表示されている間だけ毎フレーム呼ぶ */
export function everyFrame(root: HTMLElement, fn: () => void) {
  requestAnimationFrame(function frame() {
    if (!root.isConnected) { setTimeout(() => root.isConnected ? everyFrame(root, fn) : undefined, 1000); return; }
    fn();
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
