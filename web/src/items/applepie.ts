// アップルパイ。アメリカで。格子の焼き目
import { poly, tone } from "./lowpoly";
import { oval, plate } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const C = tone("#d8a058"), F = tone("#c8843a");
  let lat = "";
  for (let i = 0; i < 4; i++) lat += poly(C.hi, [[12 + i * 8, 10], [15 + i * 8, 10], [11 + i * 8, 20], [8 + i * 8, 20]]) + poly(C.hi, [[8 + i * 2, 12 + i * 2.4], [44 - i * 2, 12 + i * 2.4], [44 - i * 2, 13.6 + i * 2.4], [8 + i * 2, 13.6 + i * 2.4]]);
  return `${plate("#ece8e0", 26, 24, 24)}${poly(F.lo, [[6, 16], [46, 16], [42, 24], [10, 24]])}${poly("#a8402a", oval(26, 15, 19, 5.4, 14, 0))}${lat}
    ${poly(C.mid, [[6, 15], [46, 15], [46, 17], [6, 17]])}`;
}

export default { key: "applepie", label: "アップルパイ", at: "shelf", w: 52, h: 30, cat: "食べ物", order: 661, region: "US", note: "アメリカで。格子の焼き目", art } satisfies ItemDef;
