// 年越しそば。実績「年越し」で届く。湯気が立つ
import { poly, tone, ngon } from "./lowpoly";
import { wisps, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#2f2622");
  return `${poly(B.mid, [[2, 12], [42, 12], [36, 28], [8, 28]])}${poly("#c4523e", [[2, 12], [42, 12], [41, 15], [3, 15]])}${poly(B.lo, [[14, 28], [30, 28], [30, 32], [14, 32]])}
    ${poly("#8a6b45", [[5, 10], [39, 10], [42, 12], [2, 12]])}${poly("#b99a6a", [[10, 9], [24, 7], [34, 9], [24, 11]])}
    ${poly("#e0a86a", [[22, 4], [36, 6], [34, 11], [20, 10]])}${poly("#5f8a5a", ngon(12, 9, 2, 6))}
    ${poly("#c9a26a", [[30, 0], [44, 8], [43, 9], [29, 1]])}`;
}

const live: Live = svg => { const w = wisps(svg, 20, 4, 2); return s => w(s, s.playing ? 1 : .6); };

export default { key: "soba", label: "年越しそば", at: "shelf", w: 44, h: 32, cat: "食べ物", order: 745, note: "実績「年越し」で届く。湯気が立つ", art, live } satisfies ItemDef;
