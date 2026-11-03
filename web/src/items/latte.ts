// カフェラテ。受け皿つきのカップに、ミルクのハートのラテアート。湯気が立つ
import { cylinder, poly, tone } from "./lowpoly";
import { wisps, type Live } from "./live";
import { ell } from "./_cafe";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#e9e2d4"), S = tone("#d9d1c2");
  return `${poly(S.lo, [[2, 27], [42, 27], [38, 30], [6, 30]])}${poly(S.mid, ell(22, 27, 20, 3))}
    ${poly(C.lo, [[32, 11], [38, 11], [40, 15], [38, 20], [32, 21], [32, 18], [36, 17], [37, 14], [32, 14]])}
    ${cylinder(C, 20, 9, 24, 13, 6, false)}${poly(C.lo, [[7, 24], [33, 24], [29, 27], [11, 27]])}
    ${poly(C.hi, ell(20, 9, 13, 3.2))}${poly("#9a6440", ell(20, 9.3, 11.4, 2.5))}${poly("#b57b50", ell(19, 9.1, 8, 1.7))}
    ${poly("#f1e6d2", [[15.6, 8.6], [17.6, 7.7], [20, 8.6], [22.4, 7.7], [24.4, 8.6], [20, 10.7]])}${poly("#f1e6d2", [[19.7, 10.4], [20.3, 10.4], [21.4, 11.2], [20.6, 11.3]])}`;
}

const live: Live = svg => { const steam = wisps(svg, 20, 6, 3); return s => steam(s, .6); };

export default { key: "latte", label: "カフェラテ", at: "shelf", w: 44, h: 30, cat: "食べ物", order: 410, draft: true, note: "ハートのラテアート。湯気が立つ", art, live } satisfies ItemDef;
