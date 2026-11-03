// マテ茶の器。アルゼンチンで。金属のストローを挿して
import { poly, puff, tone, BRASS } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const G = tone("#7a5a3a");
  return `${puff(G, [[6, 22], [10, 16], [20, 16], [24, 22], [26, 34], [22, 42], [8, 42], [4, 34]], [10, 22])}
    ${poly(BRASS.hi, [[5, 16], [25, 16], [25, 19], [5, 19]])}${poly("#5f8a3a", oval(15, 16, 9, 2, 10, 0))}
    ${poly("#c8ccd0", [[17, 18], [19, 18], [24, 0], [22, 0]])}${poly("#c8ccd0", [[21, 0], [27, 0], [26, 2], [22, 2]])}
    ${poly(G.deep, [[8, 42], [22, 42], [21, 46], [9, 46]])}`;
}

export default { key: "mate", label: "マテ茶の器", at: "shelf", w: 30, h: 48, cat: "小物", order: 665, region: "AR", note: "アルゼンチンで。金属のストローを挿して", art } satisfies ItemDef;
