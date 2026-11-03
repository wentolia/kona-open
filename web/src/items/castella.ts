// カステラ。長崎で。ざらめの焼き色
import { poly, tone, ngon, box } from "./lowpoly";
import { plate } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const C = tone("#f0d27a"), B = tone("#8a4a22");
  return `${plate("#ece8e0", 26, 28, 24)}${box(C, 8, 14, 34, 14, 6, -4)}${poly(B.mid, [[8, 14], [14, 10], [48, 10], [42, 14]])}${poly(B.lo, [[8, 14], [42, 14], [42, 16.4], [8, 16.4]])}
    ${poly(B.deep, [[42, 14], [48, 10], [48, 12.4], [42, 16.4]])}${poly(B.deep, [[8, 26], [42, 26], [42, 28], [8, 28]])}
    ${[[14, 24], [22, 25], [32, 24]].map(([x, y]) => poly("#f4e8c4", ngon(x, y, .8, 4))).join("")}`;
}

export default { key: "castella", label: "カステラ", at: "shelf", w: 52, h: 34, cat: "食べ物", order: 643, region: "JP-42", note: "長崎で。ざらめの焼き色", art } satisfies ItemDef;
