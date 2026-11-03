// パンの籠。山型の食パンとバゲット
import { poly, puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#c88a4a"), K = tone("#b08a5a");
  return `${puff(C, [[34, 26], [40, 2], [46, 0], [50, 4], [44, 28]], [44, 10])}${poly("#e8c890", [[41, 8], [45, 4], [44, 9]])}${poly("#e8c890", [[39, 16], [43, 12], [42, 17]])}
    ${puff(C, [[6, 28], [6, 16], [12, 10], [20, 12], [26, 8], [34, 12], [36, 20], [36, 28]], [16, 16])}${poly("#f0dcb0", [[10, 22], [32, 22], [32, 28], [10, 28]])}
    ${poly(K.hi, [[2, 26], [58, 26], [54, 42], [6, 42]])}${[10, 18, 26, 34, 42, 50].map(x => poly(K.lo, [[x, 28], [x + 2, 28], [x + 2, 40], [x, 40]])).join("")}${poly(K.deep, [[2, 26], [58, 26], [58, 29], [2, 29]])}`;
}

export default { key: "bread", label: "パンの籠", at: "shelf", w: 60, h: 42, cat: "食べ物", order: 401, draft: true, note: "山型の食パンとバゲット", art } satisfies ItemDef;
