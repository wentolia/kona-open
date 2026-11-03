// 額（夜の丘）96×74: 夜空と月、重なる丘
import { poly, WOOD, bevel, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = 96, H = 74, b = 7, R = W - b, B = H - b;
  return `${bevel(W, H, b, WOOD)}
    ${poly("#24304a", [[b, b], [R, b], [R, 30], [b, 26]])}${poly("#2e3c5a", [[b, 26], [R, 30], [R, 44], [b, 42]])}${poly("#3a4a68", [[b, 42], [R, 44], [R, 52], [b, 52]])}
    ${poly("#eadcae", ngon(68, 21, 6, 8))}${poly("#d2c290", [[68, 15], [74, 21], [68, 27]])}
    ${poly("#e9e4d0", [[22, 16], [23, 17], [22, 18], [21, 17]])}${poly("#e9e4d0", [[40, 12], [41, 13], [40, 14], [39, 13]])}${poly("#e9e4d0", [[83, 33], [84, 34], [83, 35], [82, 34]])}
    ${poly("#4f6b55", [[b, 46], [26, 37], [44, 45], [b, 54]])}${poly("#3f5946", [[26, 37], [52, 47], [R, 40], [R, 56], [b, 54], [44, 45]])}
    ${poly("#34503d", [[b, 54], [R, 56], [R, B], [b, B]])}${poly("#2a4232", [[b, 58], [36, 52], [64, 61], [R, 57], [R, B], [b, B]])}
    ${poly("#1f3326", [[52, B], [60, 58], [68, B]])}`;
}

export default { key: "frame", label: "夜の丘の額", at: "wall", w: 96, h: 74, x: 0.3, y: 0.15, cat: "飾り", order: 100, art } satisfies ItemDef;
