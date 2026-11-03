// 明太子。福岡で。器にひと腹
import { poly, puff, tone, ngon } from "./lowpoly";
import { plate } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const M = tone("#d8504a");
  return `${plate("#ece8e0", 26, 22, 24)}${puff(M, [[8, 20], [14, 14], [34, 13], [44, 18], [40, 22], [14, 22]], [20, 16])}
    ${puff(tone("#c8443e"), [[12, 22], [18, 17], [38, 17], [46, 21], [40, 24], [16, 25]], [24, 19])}
    ${[[18, 16], [26, 15], [34, 16], [22, 20], [32, 20]].map(([x, y]) => poly(M.hi, ngon(x, y, .8, 4))).join("")}`;
}

export default { key: "mentaiko", label: "明太子", at: "shelf", w: 52, h: 30, cat: "食べ物", order: 641, region: "JP-40", note: "福岡で。器にひと腹", art } satisfies ItemDef;
