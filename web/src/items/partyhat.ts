// パーティ帽。実績「常連」で届く
import { poly, tone, ngon, puff } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const H = tone("#3d6b8a");
  return `${poly(H.hi, [[17, 4], [2, 40], [17, 42]])}${poly(H.lo, [[17, 4], [17, 42], [32, 40]])}
    ${poly("#e8c46a", [[13, 14], [21, 14], [23, 19], [11, 19]])}${poly("#d9584a", [[8, 28], [26, 28], [28, 33], [6, 33]])}
    ${puff(tone("#efe6d2"), ngon(17, 4, 4, 8), [16, 3])}${poly("#e58fa4", [[2, 40], [32, 40], [30, 44], [4, 44]])}`;
}

export default { key: "partyhat", label: "パーティ帽", at: "shelf", w: 34, h: 44, cat: "飾り", order: 760, note: "実績「常連」で届く", art } satisfies ItemDef;
