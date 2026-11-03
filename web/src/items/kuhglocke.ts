// カウベル。スイスで。刺繍の革ひも
import { poly, puff, tone, ngon } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const B = tone("#b48f4c");
  return `<path d="M12 16 C 8 4, 32 4, 28 16" style="fill:none;stroke:#2a2420;stroke-width:4"/>
    ${[[11, 10], [20, 6], [29, 10]].map(([x, y]) => poly("#c44a3a", ngon(x, y, 1.3, 5))).join("")}
    ${puff(B, [[12, 16], [28, 16], [32, 32], [36, 44], [4, 44], [8, 32]], [14, 24])}${poly(B.deep, oval(20, 44, 16, 2.4, 12, 0))}${poly(B.lo, ngon(20, 46, 2.4, 6))}`;
}

export default { key: "kuhglocke", label: "カウベル", at: "shelf", w: 40, h: 50, cat: "飾り", order: 672, region: "CH", note: "スイスで。刺繍の革ひも", art } satisfies ItemDef;
