// 猫のハンモック。実績「猫の選曲」で届く。猫が寝る
import { poly, tone, puff } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#8a6a48"), F = tone("#c9b8a0");
  return `${poly(W.mid, [[4, 4], [10, 4], [12, 70], [6, 70]])}${poly(W.lo, [[100, 4], [106, 4], [104, 70], [98, 70]])}${poly(W.lo, [[6, 62], [104, 62], [104, 66], [6, 66]])}
    ${poly(W.hi, [[2, 2], [108, 2], [108, 6], [2, 6]])}
    ${puff(F, [[10, 12], [100, 12], [92, 34], [55, 46], [18, 34]], [40, 20])}
    ${[0, 1, 2].map(i => poly(F.lo, [[22 + i * 28, 14], [26 + i * 28, 14], [28 + i * 22, 40], [24 + i * 22, 40]])).join("")}
    <i data-cat-plat="bed" data-sink="6" style="left:14%;width:72%;top:22%"></i>`;
}

export default { key: "cathammock", label: "猫のハンモック", at: "floor", w: 110, h: 70, cat: "猫", order: 752, note: "実績「猫の選曲」で届く。猫が寝る", art } satisfies ItemDef;
