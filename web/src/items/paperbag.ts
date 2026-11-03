// 紙袋（試作）。猫が入る（段ボールとは別に）
import { poly, slab, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#b9905c");
  return `${poly(T.lo, [[62, 14], [78, 8], [80, 90], [64, 94]])}
    ${slab(T.mid, T.lo, [6, 14, 64, 94])}
    ${poly(T.hi, [[6, 14], [18, 6], [30, 14], [42, 6], [54, 14], [64, 14], [78, 8], [62, 4], [10, 4]])}
    ${poly(T.deep, [[10, 12], [60, 12], [60, 16], [10, 16]])}
    <i data-cat-plat="bed" data-sink="10" style="left:10%;width:60%;top:40%"></i>`;
}

export default { key: "paperbag", label: "紙袋", at: "floor", w: 84, h: 94, cat: "猫", order: 41, draft: true, note: "猫が入る（段ボールとは別に）", art } satisfies ItemDef;
