// 猫のキューブハウス。フェルトの箱に丸い入り口。上の座布団で猫が丸くなる
import { arc, box, poly, puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const F = tone("#7b8c6c"), C = tone("#c9b79c"), PI = Math.PI;
  return `${box(F, 4, 18, 74, 70, 8, -6)}
    ${poly(F.lo, arc(41, 57, 21, 22, 0, 2 * PI, 14))}${poly(F.deep, arc(42.5, 58.5, 18, 19.5, 0, 2 * PI, 14))}
    ${puff(C, [[8, 14], [24, 9], [44, 8], [66, 9], [84, 8], [84, 14], [76, 19], [44, 21], [10, 20]], [44, 13])}
    <i data-cat-plat="bed" data-sink="3" style="left:8%;width:80%;top:11%"></i>`;
}

export default { key: "cube", label: "猫のキューブハウス", at: "floor", w: 86, h: 88, x: .62, cat: "猫", order: 45, note: "フェルトの箱に丸い入り口。上の座布団で猫が丸くなる", art } satisfies ItemDef;
