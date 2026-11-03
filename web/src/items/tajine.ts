// タジン鍋。モロッコで。とんがりの蓋に絵付け
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const L = tone("#2f6a78"), D = tone("#b85a3a"), Wt = "#e8dcc0", Gd = "#d8b46a";
  return `${poly(D.mid, [[2, 38], [50, 38], [46, 46], [6, 46]])}${poly(D.lo, [[26, 38], [50, 38], [46, 46], [26, 46]])}${poly(D.hi, [[2, 38], [50, 38], [49, 40], [3, 40]])}
    ${poly(L.hi, [[6, 38], [22, 12], [26, 4], [26, 38]])}${poly(L.lo, [[26, 4], [30, 12], [46, 38], [26, 38]])}
    ${poly(L.mid, [[14, 26], [26, 26], [26, 30], [12, 30]])}${poly(L.deep, [[26, 26], [38, 26], [40, 30], [26, 30]])}
    ${poly(Wt, [[10, 30], [42, 30], [43, 32], [9, 32]])}${poly(Gd, [[18, 21], [34, 21], [35, 22.4], [17, 22.4]])}
    ${[13, 19, 25, 31, 37].map(x => poly(Wt, [[x, 33], [x + 2, 35], [x, 37], [x - 2, 35]])).join("")}
    ${poly(Gd, [[24, 2], [28, 2], [29, 5], [23, 5]])}`;
}

export default { key: "tajine", label: "タジン鍋", at: "shelf", w: 52, h: 46, cat: "小物", order: 653, region: "MA", note: "モロッコで。とんがりの蓋に絵付け", art } satisfies ItemDef;
