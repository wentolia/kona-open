// 鹿の置物。奈良で。せんべいを待つ顔
import { poly, puff, tone, ngon } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const D = tone("#a8744a"), Wt = "#e8dcc4";
  return `${poly(D.deep, [[10, 32], [14, 32], [13, 48], [10, 48]])}${poly(D.deep, [[30, 32], [34, 32], [34, 48], [31, 48]])}
    ${puff(D, [[6, 24], [14, 20], [32, 20], [38, 26], [36, 34], [8, 34]], [18, 24])}
    ${poly(D.lo, [[14, 32], [18, 32], [18, 48], [14, 48]])}${poly(D.lo, [[34, 32], [38, 32], [38, 48], [35, 48]])}
    ${[[12, 25], [18, 23], [24, 25], [30, 23]].map(([x, y]) => poly(Wt, ngon(x, y, 1.2, 5))).join("")}
    ${poly(D.mid, [[32, 22], [36, 10], [40, 10], [40, 22]])}${puff(D, [[34, 4], [42, 4], [46, 10], [42, 14], [36, 12]], [38, 7])}
    ${poly(D.lo, [[33, 4], [30, 1], [35, 3]])}${poly("#2a1c14", [[40, 7], [41.4, 7], [41.4, 8.4], [40, 8.4]])}${poly("#2a1c14", oval(45.4, 10.4, 1, .8, 5))}
    ${poly(Wt, [[4, 24], [7, 22], [7, 26]])}`;
}

export default { key: "shika", label: "鹿の置物", at: "shelf", w: 46, h: 50, cat: "飾り", order: 632, region: "JP-29", note: "奈良で。せんべいを待つ顔", art } satisfies ItemDef;
