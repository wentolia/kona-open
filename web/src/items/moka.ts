// モカポット。イタリアで。八角の直火式
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const A = tone("#a8acb0");
  return `${poly(A.mid, [[8, 48], [6, 34], [10, 28], [24, 28], [28, 34], [26, 48]])}${poly(A.lo, [[17, 28], [24, 28], [28, 34], [26, 48], [17, 48]])}
    ${poly(A.deep, [[6, 27], [28, 27], [28, 29], [6, 29]])}
    ${poly(A.hi, [[10, 26], [8, 14], [12, 8], [22, 8], [26, 14], [24, 26]])}${poly(A.mid, [[17, 8], [22, 8], [26, 14], [24, 26], [17, 26]])}
    ${poly(A.lo, [[8, 10], [2, 14], [6, 15]])}${poly("#2a2420", [[26, 12], [32, 14], [32, 24], [26, 22]])}
    ${poly("#2a2420", [[15, 4], [19, 4], [19, 8], [15, 8]])}`;
}

export default { key: "moka", label: "モカポット", at: "shelf", w: 34, h: 50, cat: "小物", order: 669, region: "IT", note: "イタリアで。八角の直火式", art } satisfies ItemDef;
