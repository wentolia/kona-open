// 月のモビール。実績「日付をまたいで」で届く。ゆっくり回る
import { poly, ngon, WOOD, INK } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${poly(WOOD.mid, [[6, 6], [64, 6], [64, 9], [6, 9]])}${poly(INK.lo, [[34.5, 0], [35.5, 0], [35.5, 6], [34.5, 6]])}
    <g class="mob">${poly("rgba(220,210,180,.5)", [[11.5, 9], [12.5, 9], [12.5, 50], [11.5, 50]])}${poly("rgba(220,210,180,.5)", [[34.5, 9], [35.5, 9], [35.5, 32], [34.5, 32]])}${poly("rgba(220,210,180,.5)", [[57.5, 9], [58.5, 9], [58.5, 60], [57.5, 60]])}
    ${poly("#f0dc9a", [[26, 32], [44, 34], [48, 48], [40, 62], [28, 64], [34, 54], [36, 44]])}${poly("#d8c07a", [[34, 54], [28, 64], [40, 62]])}
    ${poly("#e8c46a", ngon(12, 54, 5, 5, -Math.PI / 2))}${poly("#e8c46a", ngon(12, 54, 2.2, 5, Math.PI / 2))}
    ${poly("#c9ccd2", ngon(58, 66, 6, 8))}${poly("#9aa0a8", [[54, 64], [58, 62], [60, 68]])}</g>`;
}

const live: Live = svg => { const g = q(svg, ".mob")!; return s => { const a = Math.sin(s.t * .6) * (s.calm ? 1.5 : 3); g.setAttribute("transform", `rotate(${a.toFixed(2)} 35 6)`); }; };

export default { key: "moonmobile", label: "月のモビール", at: "wall", w: 70, h: 90, cat: "飾り", order: 731, note: "実績「日付をまたいで」で届く。ゆっくり回る", art, live } satisfies ItemDef;
