// ガーランド 240×46: たるんだ紐に三角の旗
import { P, poly, type Pt } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
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

export default { key: "garland", label: "ガーランド", at: "wall", w: 240, h: 46, x: 0.5, y: 0.02, cat: "飾り", order: 104, art } satisfies ItemDef;
