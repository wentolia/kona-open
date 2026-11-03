// ひとりがけ（150×112）。背の高いウイングチェア
import { poly, puff, slab, mirror, WOOD, OCHRE, type Pt } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
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

export default { key: "chair", label: "ひとりがけ", at: "floor", w: 150, h: 112, x: 0.8, cat: "家具", order: 11, art } satisfies ItemDef;
