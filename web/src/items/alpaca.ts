// アルパカの置物。ペルーで。毛糸の房を耳に
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const W = tone("#ece2cc");
  return `${[[8, 36], [14, 36], [26, 36], [32, 36]].map(([x, y]) => poly(W.lo, [[x, y], [x + 4, y], [x + 4, y + 14], [x, y + 14]])).join("")}
    ${puff(W, [[4, 28], [10, 22], [32, 22], [38, 30], [36, 38], [6, 38]], [14, 26])}
    ${puff(W, [[26, 8], [34, 8], [34, 26], [26, 26]], [28, 12])}${puff(W, [[24, 4], [36, 2], [38, 10], [34, 12], [26, 10]], [28, 5])}
    ${poly(W.mid, [[26, 0], [28, -4], [29, 2]])}${poly(W.mid, [[33, -1], [35, -5], [35, 1]])}
    ${poly("#d84a8a", ngon(26, 1, 1.6, 6))}${poly("#3aa8a0", ngon(35, 0, 1.6, 6))}
    ${poly("#2a2420", [[33, 5], [34.4, 5], [34.4, 6.4], [33, 6.4]])}
    ${poly("#c44a3a", [[6, 26], [32, 26], [32, 29], [6, 29]])}${poly("#e8b83a", [[6, 29], [32, 29], [32, 30.4], [6, 30.4]])}`;
}

export default { key: "alpaca", label: "アルパカの置物", at: "shelf", w: 40, h: 52, cat: "飾り", order: 666, region: "PE", note: "ペルーで。毛糸の房を耳に", art } satisfies ItemDef;
