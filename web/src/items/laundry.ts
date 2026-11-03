// 洗濯かご。タオルが掛かっている。猫が入って顔だけ出す
import { poly, puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#86a3b0"), W = tone("#e2d4be");
  const edge = (y: number): [number, number] => [8 + (y - 16) * 6 / 54, 96 - (y - 16) * 6 / 54]; // 下ほど細い
  let holes = "";
  for (let j = 0; j < 4; j++) {
    const y = 26 + j * 11, [a, b] = edge(y), n = 8, step = (b - a - 8) / n;
    for (let i = 0; i < n; i++) { const x = a + 6 + i * step; holes += poly(B.deep, [[x, y], [x + step * .5, y], [x + step * .5, y + 6], [x, y + 6]]); }
  }
  return `${poly(B.lo, [[12, 2], [92, 2], [92, 5], [12, 5]])}${poly(B.deep, [[12, 5], [92, 5], [100, 12], [4, 12]])}
    ${poly(B.mid, [[8, 16], [52, 16], [51, 70], [14, 70]])}${poly(B.lo, [[52, 16], [96, 16], [90, 70], [51, 70]])}
    ${holes}${poly(B.hi, [[4, 12], [100, 12], [96, 18], [8, 18]])}${poly(B.deep, [[44, 20], [60, 20], [59, 23.5], [45, 23.5]])}
    ${puff(W, [[14, 10], [28, 7], [42, 9], [45, 15], [43, 33], [36, 41], [28, 38], [22, 30], [19, 17]], [31, 15])}
    <i data-cat-plat="box" data-sink="24" style="left:14%;width:72%;top:15%"></i>`;
}

export default { key: "laundry", label: "洗濯かご", at: "floor", w: 104, h: 72, x: .15, cat: "猫", order: 42, note: "タオルが掛かっている。猫が入って顔だけ出す", art } satisfies ItemDef;
