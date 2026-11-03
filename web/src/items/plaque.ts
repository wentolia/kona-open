// 記念の盾。実績「百日」で届く
import { poly, tone, BRASS } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#5e3d26");
  return `${poly(W.mid, [[4, 0], [36, 0], [36, 30], [20, 46], [4, 30]])}${poly(W.hi, [[4, 0], [36, 0], [32, 4], [8, 4]])}
    ${poly(BRASS.mid, [[9, 6], [31, 6], [31, 27], [20, 38], [9, 27]])}${poly(BRASS.hi, [[9, 6], [31, 6], [9, 22]])}
    ${poly(BRASS.deep, [[14, 14], [26, 14], [26, 16], [14, 16]])}${poly(BRASS.deep, [[16, 20], [24, 20], [24, 22], [16, 22]])}
    ${poly(W.lo, [[2, 46], [38, 46], [40, 54], [0, 54]])}${poly(W.hi, [[2, 46], [38, 46], [38, 48], [2, 48]])}`;
}

export default { key: "plaque", label: "記念の盾", at: "shelf", w: 40, h: 54, cat: "飾り", order: 748, note: "実績「百日」で届く", art } satisfies ItemDef;
