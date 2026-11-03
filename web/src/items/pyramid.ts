// ピラミッドの置物。エジプトで。砂色の三つ
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const S = tone("#d8b878"), S2 = tone("#c8a868");
  const pyr = (P: typeof S, x: number, w: number, h: number) => poly(P.hi, [[x, 34], [x + w / 2, 34 - h], [x + w * .6, 34]]) + poly(P.lo, [[x + w * .6, 34], [x + w / 2, 34 - h], [x + w, 34]]);
  return `${pyr(S2, 30, 24, 16)}${pyr(S, 2, 36, 28)}${pyr(S2, 22, 16, 10)}${poly(tone("#8a6a3a").mid, [[0, 34], [56, 34], [56, 36], [0, 36]])}`;
}

export default { key: "pyramid", label: "ピラミッドの置物", at: "shelf", w: 56, h: 36, cat: "飾り", order: 675, region: "EG", note: "エジプトで。砂色の三つ", art } satisfies ItemDef;
