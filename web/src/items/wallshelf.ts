// 壁掛けの小さな棚（試作）。上に小物を置ける予定。猫が飛び乗る
import { poly, slab, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#8a6544");
  return `${slab(T.hi, T.mid, [0, 0, 140, 8])}${poly(T.deep, [[0, 8], [140, 8], [138, 11], [2, 11]])}
    ${poly(T.lo, [[18, 11], [26, 11], [26, 14], [20, 38], [18, 38]])}${poly(T.lo, [[114, 11], [122, 11], [122, 38], [120, 38], [114, 14]])}
    <i data-cat-plat="perch" data-sink="1" style="left:2%;width:96%;top:0%"></i>`;
}

export default { key: "wallshelf", label: "壁掛けの小さな棚", at: "wall", w: 140, h: 40, cat: "家具", order: 111, draft: true, note: "上に小物を置ける予定。猫が飛び乗る", art } satisfies ItemDef;
