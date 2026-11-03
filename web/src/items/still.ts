// 額（静物）56×72: 黒い細い額、生成りの台紙、卓の上の器と果物
import { poly, INK, bevel, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = 56, H = 72, b = 4;
  return `${bevel(W, H, b, INK)}
    ${poly("#e4d8bf", [[b, b], [W - b, b], [W - b, H - b], [b, H - b]])}
    ${poly("#c9b48e", [[9, 9], [47, 9], [47, 63], [9, 63]])}${poly("#b9a37c", [[9, 46], [47, 46], [47, 63], [9, 63]])}
    ${poly("#5b7a8c", [[18, 46], [17, 34], [20, 26], [26, 26], [29, 34], [28, 46]])}${poly("#46606f", [[23, 46], [23, 26], [26, 26], [29, 34], [28, 46]])}
    ${poly("#c4683f", ngon(36, 42, 4.6, 7))}${poly("#a2512f", [[36, 37.4], [40.6, 42], [36, 46.6]])}
    ${poly("#d9a441", ngon(41, 44, 3, 6))}`;
}

export default { key: "still", label: "額（静物）", at: "wall", w: 56, h: 72, x: 0.4, y: 0.2, cat: "飾り", order: 101, art } satisfies ItemDef;
