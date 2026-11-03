// マンゴー。宮崎で。赤く熟して
import { poly, puff, tone } from "./lowpoly";
import { stem } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const M = tone("#d8503a");
  return `${puff(M, [[4, 22], [10, 12], [24, 8], [38, 12], [42, 22], [34, 30], [12, 30]], [16, 14])}
    ${poly("rgba(236,180,60,.6)", [[26, 22], [38, 16], [40, 24], [32, 30], [24, 30]])}${stem(28, 9, 20)}`;
}

export default { key: "mango", label: "マンゴー", at: "shelf", w: 44, h: 34, cat: "食べ物", order: 646, region: "JP-45", note: "宮崎で。赤く熟して", art } satisfies ItemDef;
