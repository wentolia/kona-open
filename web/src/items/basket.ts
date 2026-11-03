// 籐のかご。毛布入り。猫が中で丸くなる
import { poly, puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const R = tone("#b48a52"), B = tone("#8a9bb0");
  let weave = "";
  for (let i = 0; i < 12; i++) { const x0 = 10 + i * 8.7, x1 = x0 + 8.7; weave += poly(i % 2 ? R.mid : R.lo, [[x0, 26], [x1, 26], [x1 - .6, 62], [x0 + .6, 62]]); }
  for (let j = 0; j < 4; j++) weave += poly(j % 2 ? "rgba(0,0,0,.12)" : "rgba(255,240,200,.1)", [[10, 30 + j * 8], [114, 30 + j * 8], [114, 34 + j * 8], [10, 34 + j * 8]]);
  return `${puff(B, [[16, 26], [40, 12], [70, 10], [104, 16], [112, 28], [12, 30]], [60, 20])}
    ${weave}${poly(R.hi, [[6, 22], [118, 22], [116, 28], [8, 28]])}${poly(R.deep, [[12, 62], [112, 62], [108, 66], [16, 66]])}
    <i data-cat-plat="bed" data-sink="8" style="left:14%;width:72%;top:30%"></i>`;
}

export default { key: "basket", label: "籐のかご", at: "floor", w: 124, h: 66, cat: "猫", order: 38, note: "毛布入り。猫が中で丸くなる", art } satisfies ItemDef;
