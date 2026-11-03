// たこ焼き。大阪で。舟に 6 つ、湯気
import { poly, puff, tone, ngon } from "./lowpoly";
import { wisps, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#c88a48"), S = "#4a2a1a", N = "#5f8a3a";
  const ball = (cx: number, cy: number) => puff(B, ngon(cx, cy, 6.4, 8, .2), [cx - 2, cy - 2.4]) +
    poly(S, [[cx - 5, cy - 3], [cx + 4, cy - 4.6], [cx + 5, cy - 1], [cx - 4, cy]]) +
    poly("#e8dcc0", [[cx - 3, cy - 3.4], [cx + 3, cy - 4.4], [cx + 3.2, cy - 3.8], [cx - 2.8, cy - 2.8]]) +
    poly(N, [[cx - 1, cy - 4.6], [cx, cy - 4.6], [cx, cy - 3.8]]) + poly(N, [[cx + 2, cy - 2.4], [cx + 3, cy - 2.4], [cx + 2.6, cy - 1.6]]);
  return `${ball(14, 22)}${ball(27, 21)}${ball(40, 22)}${ball(20, 16)}${ball(34, 15)}
    ${poly("#d9c49a", [[2, 22], [52, 22], [48, 32], [6, 32]])}${poly("#b8a27a", [[28, 22], [52, 22], [48, 32], [28, 32]])}${poly("#ece0c4", [[2, 22], [52, 22], [51, 24], [3, 24]])}
    ${poly("#c8a878", [[40, 10], [52, 2], [52.6, 3], [41, 11]])}`;
}

const live: Live = svg => { const steam = wisps(svg, 27, 10, 2); return s => steam(s, .55); };

export default { key: "takoyaki", label: "たこ焼き", at: "shelf", w: 54, h: 32, cat: "食べ物", order: 609, region: "JP-27", note: "大阪で。舟に 6 つ、湯気", art, live } satisfies ItemDef;
