// 鉄瓶。岩手で。あられ模様の南部鉄器
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const K = tone("#3a3836");
  let dots = "";
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) dots += poly(K.hi, ngon(13 + c * 5 + (r % 2) * 2.5, 26 + r * 5, 1.1, 5));
  return `${poly(K.deep, [[44, 26], [54, 18], [55, 20], [46, 32]])}
    ${puff(K, [[6, 24], [14, 18], [36, 18], [44, 24], [46, 36], [40, 44], [10, 44], [4, 36]], [18, 24])}${dots}
    ${poly(K.lo, [[14, 18], [36, 18], [33, 15], [17, 15]])}${poly(K.mid, [[23, 11], [27, 11], [28, 15], [22, 15]])}
    <polyline points="10,20 12,4 38,4 40,20" style="fill:none;stroke:${K.hi};stroke-width:1.8"/>`;
}

export default { key: "tetsubin", label: "鉄瓶", at: "shelf", w: 54, h: 46, cat: "小物", order: 613, region: "JP-03", note: "岩手で。あられ模様の南部鉄器", art } satisfies ItemDef;
