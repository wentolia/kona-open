// だるま。群馬で。目は片方だけ
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const R = tone("#b8302a"), F = tone("#ece4d4"), K = "#1f1b19", G = "#d8b46a";
  const body = ngon(20, 26, 18, 12, .26).map(([x, y]) => [x, 26 + (y - 26) * (y > 26 ? .95 : 1.15)] as [number, number]);
  return `${puff(R, body, [14, 18])}
    ${puff(F, [[10, 14], [16, 10], [24, 10], [30, 14], [30, 24], [24, 28], [16, 28], [10, 24]], [16, 16])}
    ${poly(K, [[11, 13], [17, 11.6], [17, 12.8], [12, 14]])}${poly(K, [[23, 11.6], [29, 13], [28, 14], [23, 12.8]])}
    ${poly("#fbf6ec", ngon(15, 18, 3.4, 8))}${poly(K, ngon(15, 18, 2, 8))}${poly("#fbf6ec", ngon(25, 18, 3.4, 8))}
    ${poly(K, [[14, 24], [20, 23.4], [26, 24], [20, 24.8]])}
    ${poly(G, [[12, 34], [28, 34], [26, 38], [14, 38]])}${poly(G, [[18, 31], [22, 31], [22, 40], [18, 40]])}`;
}

export default { key: "daruma", label: "だるま", at: "shelf", w: 40, h: 46, cat: "飾り", order: 605, region: "JP-10", note: "群馬で。目は片方だけ", art } satisfies ItemDef;
