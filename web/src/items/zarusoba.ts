// ざるそば。長野で。せいろに盛って
import { poly, tone, cylinder, box } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const W = tone("#c9a676"), N = tone("#8a7a62");
  let n = "";
  for (let i = 0; i < 8; i++) n += poly(i % 2 ? N.mid : N.lo, [[10 + i * 3.6, 14 + Math.abs(3.5 - i)], [13 + i * 3.6, 12 + Math.abs(3.5 - i)], [14 + i * 3.6, 24], [10 + i * 3.6, 24]]);
  return `${box(W, 4, 22, 40, 8, 6, -4)}${n}${poly("#2a3a2a", [[16, 12], [30, 10], [32, 12], [18, 14]])}
    ${cylinder(tone("#3a5a7a"), 48, 24, 34, 6, 5)}`;
}

export default { key: "zarusoba", label: "ざるそば", at: "shelf", w: 56, h: 36, cat: "食べ物", order: 626, region: "JP-20", note: "長野で。せいろに盛って", art } satisfies ItemDef;
