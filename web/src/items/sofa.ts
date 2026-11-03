// ソファ（300×110、足元 y=110）。猫は座面で丸くなり、背もたれに乗る
import { poly, puff, slab, mirror, WOOD, SAGE, type Pt } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
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

export default { key: "sofa", label: "ソファ", at: "floor", w: 300, h: 110, x: 0.5, cat: "家具", order: 10, art } satisfies ItemDef;
