// ふぐ提灯。山口で。ふくらんだ灯り
import { poly, puff, tone, ngon } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const F = tone("#e8d6a8");
  return `<polyline points="22,0 22,8" style="stroke:#5a4030;stroke-width:1.2"/>
    ${puff(F, oval(22, 26, 18, 16, 12), [16, 18])}${poly("rgba(255,210,140,.5)", oval(20, 24, 9, 8, 9))}
    ${[[12, 20], [18, 16], [28, 18], [14, 30], [24, 34], [32, 28]].map(([x, y]) => poly("#6a4a2a", ngon(x, y, 1, 5))).join("")}
    ${poly(F.lo, [[40, 22], [46, 18], [46, 34], [40, 30]])}${poly("#2a1c14", oval(10, 22, 2, 2, 7))}${poly("#e8e0cc", oval(9.4, 21.4, .7, .7, 5))}
    ${poly("#c4785a", oval(5, 28, 2.6, 1.4, 6))}`;
}

export default { key: "fugu", label: "ふぐ提灯", at: "shelf", w: 46, h: 46, cat: "飾り", order: 637, region: "JP-35", note: "山口で。ふくらんだ灯り", art } satisfies ItemDef;
