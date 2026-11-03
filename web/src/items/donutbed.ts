// 丸い猫ベッド。ふちの高いドーナツ形。猫が中で丸くなる
import { arc, poly, puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#9c8672"), C = tone("#d4c3aa"), PI = Math.PI;
  return `${puff(T, arc(55, 21, 53, 16, PI, 3 * PI, 16).slice(0, -1), [46, 13])}
    ${poly(T.deep, arc(55, 21, 38, 9, 0, 2 * PI, 14))}
    ${puff(C, arc(55, 24, 34, 7, 0, 2 * PI, 12).slice(0, -1), [49, 21])}
    ${puff(T, [...arc(55, 23, 54, 18, 0, PI, 12), ...arc(55, 23, 37, 8, PI, 0, 10)], [55, 38])}
    <i data-cat-plat="bed" data-sink="3" style="left:20%;width:60%;top:40%"></i>`;
}

export default { key: "donutbed", label: "丸い猫ベッド", at: "floor", w: 110, h: 42, x: .3, cat: "猫", order: 36, note: "ふちの高いドーナツ形。猫が中で丸くなる", art } satisfies ItemDef;
