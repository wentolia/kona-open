// 目覚まし時計。実績「早起き」で届く。押すとベル
import { poly, tone, ngon, puff, BRASS } from "./lowpoly";
import { onPress, chimeNotes, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const R = tone("#c4523e");
  return `${poly(BRASS.mid, ngon(9, 6, 6, 8))}${poly(BRASS.lo, ngon(29, 6, 6, 8))}${poly(BRASS.deep, [[18, 2], [20, 2], [20, 8], [18, 8]])}
    ${puff(R, ngon(19, 23, 15, 12), [14, 18])}${poly("#efe6d2", ngon(19, 23, 11, 12))}
    ${poly("#2b2420", [[18.3, 23], [19.7, 23], [19.7, 15], [18.3, 15]])}${poly("#2b2420", [[19, 22.3], [25, 22.3], [25, 23.7], [19, 23.7]])}
    ${poly(R.deep, [[8, 36], [12, 36], [8, 42], [5, 42]])}${poly(R.deep, [[26, 36], [30, 36], [33, 42], [30, 42]])}`;
}

const live: Live = svg => { onPress(svg, () => chimeNotes([1568, 1568, 1568, 1568], .07, .03)); };

export default { key: "alarm", label: "目覚まし時計", at: "shelf", w: 38, h: 42, cat: "小物", order: 732, note: "実績「早起き」で届く。押すとベル", art, live } satisfies ItemDef;
