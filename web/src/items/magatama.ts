// 勾玉。島根で。翡翠色の玉を紐に
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const J = tone("#3f8a6a");
  return `<polyline points="6,4 18,20 30,4" style="fill:none;stroke:#8a6a4a;stroke-width:1.2"/>
    ${puff(J, [[10, 22], [16, 18], [24, 18], [28, 24], [28, 32], [24, 40], [16, 44], [12, 42], [18, 38], [20, 34], [14, 32], [9, 28]], [16, 24])}
    ${poly(J.deep, ngon(18, 24, 2, 6))}${poly("rgba(255,255,255,.4)", [[22, 21], [25, 23], [24, 27], [22, 25]])}`;
}

export default { key: "magatama", label: "勾玉", at: "shelf", w: 40, h: 44, cat: "飾り", order: 635, region: "JP-32", note: "島根で。翡翠色の玉を紐に", art } satisfies ItemDef;
