// 猫の肖像画。実績「なでなで」で届く
import { poly, tone, ngon, puff, bevel, BRASS } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#c98a4a");
  return `${bevel(80, 96, 7, BRASS)}${poly("#3d4a43", [[7, 7], [73, 7], [73, 89], [7, 89]])}${poly("#4a5a52", [[7, 7], [73, 7], [7, 60]])}
    ${puff(C, [[18, 88], [24, 56], [40, 50], [56, 56], [62, 88]], [34, 62])}
    ${puff(C, ngon(40, 40, 15, 10), [35, 35])}${poly(C.mid, [[27, 32], [28, 18], [36, 28]])}${poly(C.mid, [[53, 32], [52, 18], [44, 28]])}
    ${poly("#e8a090", [[29, 29], [29.5, 22], [34, 28]])}${poly("#e8a090", [[51, 29], [50.5, 22], [46, 28]])}
    ${poly("#5f8a5a", ngon(34, 40, 2.2, 6))}${poly("#5f8a5a", ngon(46, 40, 2.2, 6))}${poly("#c97a7a", [[38.5, 45], [41.5, 45], [40, 47]])}
    ${poly("#d9584a", [[30, 55], [50, 55], [50, 58], [30, 58]])}${poly(BRASS.hi, ngon(40, 60, 2.4, 6))}`;
}

export default { key: "catportrait", label: "猫の肖像画", at: "wall", w: 80, h: 96, cat: "猫", order: 751, note: "実績「なでなで」で届く", art } satisfies ItemDef;
