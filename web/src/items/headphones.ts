// ヘッドホン。★
import { poly, puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#3d3a38"), P = tone("#9b6b48");
  let band = "";
  for (let i = 0; i < 10; i++) { const a0 = Math.PI + i / 10 * Math.PI, a1 = Math.PI + (i + 1) / 10 * Math.PI; band += poly(i < 5 ? T.hi : T.mid, [[29 + Math.cos(a0) * 24, 30 + Math.sin(a0) * 24], [29 + Math.cos(a1) * 24, 30 + Math.sin(a1) * 24], [29 + Math.cos(a1) * 20, 30 + Math.sin(a1) * 20], [29 + Math.cos(a0) * 20, 30 + Math.sin(a0) * 20]]); }
  return `${band}${puff(P, [[2, 30], [8, 26], [14, 30], [14, 54], [8, 58], [2, 54]], [7, 40])}${puff(P, [[44, 30], [50, 26], [56, 30], [56, 54], [50, 58], [44, 54]], [49, 40])}`;
}

export default { key: "headphones", label: "ヘッドホン", at: "shelf", w: 58, h: 58, cat: "音楽", order: 203, note: "★", art } satisfies ItemDef;
