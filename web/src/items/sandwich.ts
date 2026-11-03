// サンドイッチ。三角のふたつを立てて、断面に卵・レタス・トマト・ハム
import { poly, tone, type Pt } from "./lowpoly";
import { ell } from "./_cafe";
import type { ItemDef } from "./types";

/** 頂点 a・底の y と左右から作る三角の、上から f0〜f1 の帯（内側に inset 寄せる） */
function band(a: Pt, by: number, bl: number, br: number, f0: number, f1: number, inset = 0) {
  const at = (f: number, side: number) => { const x = side < 0 ? a[0] + (bl - a[0]) * f + inset : a[0] + (br - a[0]) * f - inset; return [x, a[1] + (by - a[1]) * f] as Pt; };
  return [at(f0, -1), at(f0, 1), at(f1, 1), at(f1, -1)];
}
function half(a: Pt, by: number, bl: number, br: number, back = false) {
  // 奥のひとつは一段暗く
  const c = (hex: string) => back ? tone(hex).lo : hex;
  const layers: [number, number, string][] = [[.3, .46, "#f2d36b"], [.46, .56, "#7fb44a"], [.56, .68, "#d65a45"], [.68, .8, "#e49a8e"], [.8, .87, "#7fb44a"]];
  return poly(c("#c99a5c"), [a, [br, by], [bl, by]]) + poly(c("#f1e4c4"), band(a, by, bl, br, .12, .93, 1.4))
    + layers.map(([f0, f1, col]) => poly(c(col), band(a, by, bl, br, f0, f1, 1.6))).join("");
}

function art() {
  return `${poly("#cfc8bc", [[2, 29], [46, 29], [42, 32], [6, 32]])}${poly("#e8e4dc", ell(24, 28.6, 22, 3))}
    ${half([31, 4], 27, 20, 44, true)}${half([15, 6], 29, 3, 28)}`;
}

export default { key: "sandwich", label: "サンドイッチ", at: "shelf", w: 48, h: 32, cat: "食べ物", order: 415, draft: true, note: "卵・レタス・トマト・ハムの断面", art } satisfies ItemDef;
