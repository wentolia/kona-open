// いちごのケーキ。ひと切れ、皿にのせて
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#f3ead8"), S = tone("#e8c890"), R = tone("#d23a3a");
  return `${poly(C.hi, [[8, 14], [30, 8], [42, 14], [20, 20]])}${poly(C.mid, [[8, 14], [20, 20], [20, 36], [8, 30]])}${poly(C.lo, [[20, 20], [42, 14], [42, 30], [20, 36]])}
    ${poly(S.mid, [[8, 21], [20, 27], [20, 30], [8, 24]])}${poly("#d23a3a", [[8, 22.5], [20, 28.5], [20, 29], [8, 23]])}${poly(S.lo, [[20, 27], [42, 21], [42, 24], [20, 30]])}
    ${poly(R.mid, [[24, 12], [28, 5], [32, 12], [28, 15]])}${poly(R.hi, [[24, 12], [28, 5], [28, 15]])}${poly("#4f8a3a", [[26, 5], [28, 3], [30, 5], [28, 6]])}
    ${poly("#e8e4dc", [[0, 36], [48, 36], [44, 40], [4, 40]])}${poly("#cfc8bc", [[4, 40], [44, 40], [42, 41], [6, 41]])}`;
}

export default { key: "cake", label: "いちごのケーキ", at: "shelf", w: 48, h: 41, cat: "食べ物", order: 402, draft: true, note: "ひと切れ、皿にのせて", art } satisfies ItemDef;
