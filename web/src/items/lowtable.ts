// ローテーブル（試作）。上に棚の小物を置ける予定。猫が上に乗る
import { poly, slab, tone, WOOD } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#7a5638");
  return `${poly(WOOD.deep, [[22, 26], [30, 26], [28, 58], [24, 58]])}${poly(WOOD.deep, [[170, 26], [178, 26], [176, 58], [172, 58]])}
    ${poly(WOOD.lo, [[12, 26], [20, 26], [18, 58], [14, 58]])}${poly(WOOD.lo, [[180, 26], [188, 26], [186, 58], [182, 58]])}
    ${poly(T.hi, [[14, 10], [186, 10], [196, 18], [4, 18]])}
    ${slab(T.mid, T.lo, [4, 18, 196, 27])}
    ${poly(T.deep, [[4, 27], [196, 27], [194, 30], [6, 30]])}
    <i data-cat-plat="perch" data-sink="1" style="left:6%;width:88%;top:20%"></i>`;
}

export default { key: "lowtable", label: "ローテーブル", at: "floor", w: 200, h: 58, cat: "家具", order: 30, draft: true, note: "上に棚の小物を置ける予定。猫が上に乗る", art } satisfies ItemDef;
