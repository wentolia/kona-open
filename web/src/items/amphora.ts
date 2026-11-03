// アンフォラ。ギリシャで。黒い絵の帯
import { poly, puff, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const T = tone("#c8763e");
  return `${puff(T, [[10, 14], [24, 14], [32, 26], [26, 44], [17, 50], [8, 44], [2, 26]], [10, 22])}
    ${poly(T.mid, [[12, 4], [22, 4], [24, 14], [10, 14]])}${poly(T.hi, oval(17, 4, 6, 1.4, 10, 0))}
    <polyline points="11,6 4,8 6,18" style="fill:none;stroke:${T.lo};stroke-width:2"/><polyline points="23,6 30,8 28,18" style="fill:none;stroke:${T.deep};stroke-width:2"/>
    ${poly("#2a1c14", [[4, 26], [30, 26], [29, 34], [5, 34]])}
    ${[8, 14, 20, 26].map(x => poly(T.hi, [[x - 1, 32], [x, 27], [x + 2, 27], [x + 1, 32]])).join("")}
    ${poly(T.deep, [[14, 50], [20, 50], [20, 54], [14, 54]])}`;
}

export default { key: "amphora", label: "アンフォラ", at: "shelf", w: 34, h: 54, cat: "飾り", order: 674, region: "GR", note: "ギリシャで。黒い絵の帯", art } satisfies ItemDef;
