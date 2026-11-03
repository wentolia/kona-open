// クッション（100×36）。床に置く大きな座布団: ふくらんだ上の面と、手前の側面
import { poly, puff, ROSE } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const F = ROSE;
  return `
    ${poly(F.mid, [[3, 17], [50, 17], [50, 34], [12, 34], [5, 31]])}
    ${poly(F.lo, [[50, 17], [97, 17], [95, 31], [88, 34], [50, 34]])}
    ${puff(F, [[10, 5], [50, 2], [90, 5], [98, 12], [97, 18], [50, 20], [3, 18], [2, 12]], [46, 9])}
    ${poly(F.deep, [[44, 8], [48, 7.4], [49, 10], [45, 10.6]])}
    <i data-cat-plat="bed" data-sink="5" style="left:12%;width:76%;top:22%"></i>`;
}

export default { key: "cushion", label: "クッション", at: "floor", w: 100, h: 36, x: 0.22, cat: "家具", order: 12, art } satisfies ItemDef;
