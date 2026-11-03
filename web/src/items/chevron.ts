// ジグザグのラグ: 山形の帯を色を替えて重ねる。手前と奥に房
import { poly, type Pt } from "./lowpoly";
import { trap, cell, tassel } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const at = trap(0, 300, 4, 36, 20), C = ["#d8c9a6", "#3d6a6a", "#d8c9a6", "#c58b4a", "#2e2b28", "#c58b4a", "#d8c9a6", "#3d6a6a"];
  const Z = 10, bands = C.length;
  let s = cell(at, "#cfbf9c", 0, 0, 1, 1);
  // 帯 k の上の縁（山形）
  const edge = (k: number): Pt[] => Array.from({ length: Z * 2 + 1 }, (_, i) => { const u = .02 + i * .96 / (Z * 2), v = .06 + k * .88 / bands + (i % 2 ? .07 : 0); return at(u, Math.min(.94, v)); });
  for (let k = 0; k < bands; k++) {
    const top = edge(k), bot = k + 1 < bands ? edge(k + 1) : edge(k).map((_, i) => at(.02 + i * .96 / (Z * 2), .94));
    for (let i = 0; i < Z * 2; i++) {
      const c = C[k], dark = i % 2 ? c : shade(c);
      s += poly(dark, [top[i], top[i + 1], bot[i + 1], bot[i]]);
    }
  }
  for (let i = 0; i <= 30; i++) { s += tassel("#d3c09a", at(i / 30, 1), 0, 3) + tassel("#d3c09a", at(i / 30, 0), 0, -2.2, .5); }
  return s;
}
const shade = (c: string) => ({ "#d8c9a6": "#cbbb97", "#3d6a6a": "#345c5c", "#c58b4a": "#b37c40", "#2e2b28": "#272421" } as Record<string, string>)[c] ?? c;

export default { key: "chevron", label: "ジグザグのラグ", at: "floor", w: 300, h: 0, flat: true, vh: 40, x: 0.5, cat: "敷きもの", order: 27, art } satisfies ItemDef;
