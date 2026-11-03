// ビールジョッキ。泡の帽子をのせて、細かな泡がのぼる
import { poly, puff, tone } from "./lowpoly";
import { type Live } from "./live";
import { bubbles } from "./_cafe";
import type { ItemDef } from "./types";

function art() {
  const F = tone("#f2ead6"), G = "rgba(220,235,235,.2)";
  return `${poly("rgba(220,235,235,.3)", [[29, 14], [37, 14], [38, 38], [29, 38], [29, 34], [34, 33], [34, 18], [29, 18]])}
    ${poly(G, [[3, 6], [29, 6], [29, 48], [3, 48]])}
    ${poly("#d99a2b", [[3.6, 13], [28.4, 13], [28.4, 44], [3.6, 44]])}${poly("#e8b54a", [[3.6, 13], [10, 13], [10, 44], [3.6, 44]])}${poly("#b87a1e", [[22, 13], [28.4, 13], [28.4, 44], [22, 44]])}
    ${[8, 16, 24].map(x => poly("rgba(255,255,255,.12)", [[x, 8], [x + 1.4, 8], [x + 1.4, 44], [x, 44]])).join("")}
    ${puff(F, [[2, 10], [7, 5], [15, 3], [24, 4], [30, 8], [30, 14], [2, 14]], [14, 8])}${poly(F.lo, [[3.6, 13], [28.4, 13], [28.4, 15], [3.6, 15]])}
    ${poly("rgba(220,235,235,.36)", [[3, 44], [29, 44], [29, 48], [3, 48]])}`;
}

const live: Live = svg => bubbles(svg, 6, 26, 43, 16, 9, "rgba(255,240,200,.7)", .7);

export default { key: "beer", label: "ビールジョッキ", at: "shelf", w: 38, h: 48, cat: "食べ物", order: 419, draft: true, note: "泡の帽子。細かな泡がのぼる", art, live } satisfies ItemDef;
