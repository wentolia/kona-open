// 壁掛けの猫ベッド。半月の木の受け皿に座布団。猫が壁の上で丸くなる
import { arc, poly, puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#8f6a48"), C = tone("#a99484"), PI = Math.PI;
  const lower = arc(50, 14, 46, 30, 0, PI, 12);
  return `${poly(W.deep, [[20, 26], [28, 26], [24, 50]])}${poly(W.deep, [[72, 26], [80, 26], [76, 50]])}
    ${poly(W.mid, [[50, 14], ...lower.slice(6)])}${poly(W.lo, [...lower.slice(0, 7), [50, 14]])}
    ${puff(C, [[10, 14], [22, 6], [40, 3], [62, 3], [80, 6], [90, 13], [50, 16]], [48, 9])}
    ${poly(W.hi, [[3, 12], [97, 12], [95, 16], [5, 16]])}
    <i data-cat-plat="bed" data-sink="4" style="left:14%;width:72%;top:9%"></i>`;
}

export default { key: "wallbed", label: "壁掛けの猫ベッド", at: "wall", w: 100, h: 50, y: .35, cat: "猫", order: 114, note: "半月の受け皿に座布団。猫が壁の上で丸くなる", art } satisfies ItemDef;
