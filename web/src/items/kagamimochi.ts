// 鏡餅。実績「元日」で届く
import { poly, tone, ngon, puff, leaf } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const M = tone("#efe8da");
  return `${poly("#a8824e", [[2, 40], [44, 40], [40, 50], [6, 50]])}${poly("#c9a26a", [[2, 38], [44, 38], [44, 40], [2, 40]])}
    ${poly("#e8dcc0", [[4, 34], [42, 34], [44, 38], [2, 38]])}
    ${puff(M, ngon(23, 30, 17, 12).map(([x, y]) => [x, 30 + (y - 30) * .45] as [number, number]), [18, 26])}
    ${puff(M, ngon(23, 20, 13, 12).map(([x, y]) => [x, 20 + (y - 20) * .45] as [number, number]), [19, 17])}
    ${puff(tone("#ec8a22"), ngon(23, 10, 6, 9), [21, 8])}${leaf("#5f8a5a", "#4a6a3a", 23, 5, 6, 2, -30)}`;
}

export default { key: "kagamimochi", label: "鏡餅", at: "shelf", w: 46, h: 50, cat: "季節", order: 744, note: "実績「元日」で届く", art } satisfies ItemDef;
