// 朝食のトレー。実績「週末の朝」で届く。湯気が立つ
import { poly, ngon, WOOD } from "./lowpoly";
import { wisps, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${poly(WOOD.lo, [[0, 26], [72, 26], [68, 34], [4, 34]])}${poly(WOOD.hi, [[2, 24], [70, 24], [72, 26], [0, 26]])}
    ${poly("#efe6d2", [[6, 18], [30, 18], [28, 24], [8, 24]])}${poly("#e8c46a", ngon(18, 18, 4, 8).map(([x, y]) => [x, 18 + (y - 18) * .5] as [number, number]))}${poly("#f4f1ea", ngon(18, 18, 7, 8).map(([x, y]) => [x, 18 + (y - 18) * .4] as [number, number]).slice(0, 5))}
    ${poly("#c9894a", [[34, 14], [50, 12], [52, 24], [34, 24]])}${poly("#e0a86a", [[34, 14], [50, 12], [48, 15], [36, 16]])}
    ${poly("#efe6d2", [[56, 8], [68, 8], [66, 24], [58, 24]])}${poly("#7a4a2a", [[57, 9], [67, 9], [67, 11], [57, 11]])}${poly("#efe6d2", [[66, 12], [71, 13], [70, 19], [66, 19]])}`;
}

const live: Live = svg => { const w = wisps(svg, 62, 6, 2); return s => w(s, s.playing ? 1 : .6); };

export default { key: "breakfast", label: "朝食のトレー", at: "shelf", w: 72, h: 34, cat: "食べ物", order: 735, note: "実績「週末の朝」で届く。湯気が立つ", art, live } satisfies ItemDef;
