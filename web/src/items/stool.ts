// スツール（試作）。猫が上に座る
import { cylinder, poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#8a6a48"), S = tone("#a85f4a");
  return `${poly(T.lo, [[12, 20], [17, 20], [10, 64], [6, 64]])}${poly(T.deep, [[45, 20], [50, 20], [56, 64], [52, 64]])}
    ${poly(T.mid, [[28, 20], [34, 20], [33, 64], [29, 64]])}
    ${poly(T.lo, [[10, 44], [52, 44], [52, 47], [10, 47]])}
    ${cylinder(S, 31, 12, 20, 25, 7)}
    <i data-cat-plat="bed" data-sink="2" style="left:10%;width:80%;top:16%"></i>`;
}

export default { key: "stool", label: "スツール", at: "floor", w: 62, h: 64, cat: "家具", order: 32, draft: true, note: "猫が上に座る", art } satisfies ItemDef;
