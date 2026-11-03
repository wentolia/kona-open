// 蒸籠と小籠包。中国で。ふたを開けて湯気
import { poly, puff, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const W = tone("#c8a070"), D = tone("#f0e8d8");
  const bao = (x: number, y: number) => puff(D, [[x - 6, y + 3], [x - 4, y - 2], [x, y - 5], [x + 4, y - 2], [x + 6, y + 3]], [x - 2, y - 2]) + poly(D.lo, [[x - .6, y - 5], [x + .6, y - 5], [x + .4, y - 2], [x - .4, y - 2]]);
  return `${poly(W.mid, [[4, 20], [48, 20], [46, 34], [6, 34]])}${poly(W.lo, [[26, 20], [48, 20], [46, 34], [26, 34]])}
    ${poly(W.deep, [[4, 26], [48, 26], [48, 27.4], [4, 27.4]])}${poly(W.hi, oval(26, 20, 22, 4.4, 14, 0))}${poly("#d8c8a0", oval(26, 20, 19, 3.4, 14, 0))}
    ${bao(14, 18)}${bao(26, 17)}${bao(38, 18)}`;
}
import { wisps, type Live } from "./live";
const live: Live = svg => { const steam = wisps(svg, 26, 12, 3); return s => steam(s, .8); };
export default { key: "seiro", label: "蒸籠と小籠包", at: "shelf", w: 52, h: 36, cat: "食べ物", order: 679, region: "CN", note: "中国で。ふたを開けて湯気", art, live } satisfies ItemDef;
