// しゃちほこ。愛知で。金色の小さな置物
import { poly, puff, tone, box } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const G = tone("#d8a83a");
  let sc = "";
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) sc += poly(G.hi, [[12 + c * 6 + (r % 2) * 3, 26 + r * 5], [15 + c * 6 + (r % 2) * 3, 24 + r * 5], [18 + c * 6 + (r % 2) * 3, 26 + r * 5]]);
  return `${box(tone("#4a3a2c"), 6, 46, 26, 6, 4, -3)}
    ${puff(G, [[10, 46], [8, 32], [12, 18], [20, 12], [28, 14], [30, 24], [26, 38], [22, 46]], [14, 26])}${sc}
    ${poly(G.mid, [[20, 12], [14, 4], [22, 2], [30, 8], [28, 14]])}${poly(G.lo, [[22, 2], [34, 0], [36, 6], [30, 8]])}
    ${poly(G.deep, [[14, 18], [16, 18], [16, 19.6], [14, 19.6]])}${poly(G.lo, [[8, 30], [2, 26], [6, 36]])}`;
}

export default { key: "shachihoko", label: "しゃちほこ", at: "shelf", w: 40, h: 52, cat: "飾り", order: 628, region: "JP-23", note: "愛知で。金色の小さな置物", art } satisfies ItemDef;
