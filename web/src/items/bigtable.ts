// 大きなテーブル。実績「にぎやかな夜」で届く。猫が上に乗る
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#8a6a48");
  return `${poly(W.hi, [[10, 10], [230, 10], [240, 24], [0, 24]])}${poly(W.lo, [[0, 24], [240, 24], [240, 32], [0, 32]])}
    ${poly(W.mid, [[14, 32], [24, 32], [22, 96], [14, 96]])}${poly(W.deep, [[216, 32], [226, 32], [226, 96], [218, 96]])}
    ${poly(W.lo, [[40, 24], [48, 24], [48, 84], [42, 84]])}${poly(W.deep, [[192, 24], [200, 24], [198, 84], [192, 84]])}
    ${poly("#efe6d2", [[60, 14], [180, 14], [184, 20], [56, 20]])}
    <i data-cat-plat="perch" data-sink="1" style="left:4%;width:92%;top:12%"></i>`;
}

export default { key: "bigtable", label: "大きなテーブル", at: "floor", w: 240, h: 96, cat: "家具", order: 763, note: "実績「にぎやかな夜」で届く。猫が上に乗る", art } satisfies ItemDef;
