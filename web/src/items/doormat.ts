// 玄関マット。実績「はじめての家具」で届く
import { poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const M = tone("#a8824e");
  return `${poly(M.lo, [[10, 8], [130, 8], [140, 34], [0, 34]])}${poly(M.mid, [[14, 10], [126, 10], [134, 31], [6, 31]])}
    ${[0, 1, 2, 3, 4].map(i => poly(M.lo, [[20 + i * 22, 13], [28 + i * 22, 13], [26 + i * 22, 28], [18 + i * 22, 28]])).join("")}
    ${poly("#5f8a5a", ngon(70, 20, 5, 6).map(([x, y]) => [x, 20 + (y - 20) * .5] as [number, number]))}`;
}

export default { key: "doormat", label: "玄関マット", at: "floor", w: 140, h: 0, flat: true, vh: 40, cat: "敷きもの", order: 770, note: "実績「はじめての家具」で届く", art } satisfies ItemDef;
