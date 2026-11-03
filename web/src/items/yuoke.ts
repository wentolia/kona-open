// 湯桶と手ぬぐい。大分で。湯けむり
import { poly, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const W = tone("#d8b884");
  let staves = "";
  for (let i = 0; i < 6; i++) staves += poly(i % 2 ? W.mid : W.hi, [[6 + i * 6, 12], [12 + i * 6, 12], [11.4 + i * 6, 32], [7.4 + i * 6, 32]]);
  return `${staves}${poly(W.lo, oval(24, 12, 18, 3.4, 12, 0))}${poly("#9ac0d0", oval(24, 12.6, 15, 2.6, 12, 0))}
    ${[18, 28].map(y => poly("#4a3a2a", [[5, y], [43, y], [42.6, y + 1.6], [5.4, y + 1.6]])).join("")}
    ${poly("#e8e4dc", [[30, 6], [44, 4], [46, 22], [40, 24], [38, 10]])}${poly("#4a7aa8", [[31, 8], [44, 6], [44, 8], [31, 10]])}`;
}
import { wisps, type Live } from "./live";
const live: Live = svg => { const steam = wisps(svg, 22, 10, 2); return s => steam(s, .7); };
export default { key: "yuoke", label: "湯桶と手ぬぐい", at: "shelf", w: 48, h: 36, cat: "小物", order: 645, region: "JP-44", note: "大分で。湯けむり", art, live } satisfies ItemDef;
