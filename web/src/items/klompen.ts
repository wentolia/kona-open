// 木靴とチューリップ。オランダで。片方に花を挿して
import { poly, tone, leaf } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const Y = tone("#d4a640"), Y2 = tone("#c2952f");
  const shoe = (P: typeof Y, x: number, y: number) =>
    poly(P.mid, [[x - 1, y - 6], [x + 8, y - 6], [x + 22, y - 6], [x + 28, y - 2], [x + 30, y + 4], [x + 26, y + 8], [x + 2, y + 8], [x - 2, y + 4]]) +
    poly(P.hi, [[x - 1, y - 6], [x + 22, y - 6], [x + 16, y - 2], [x, y]]) +
    poly(P.lo, [[x + 16, y + 2], [x + 28, y - 2], [x + 30, y + 4], [x + 26, y + 8], [x + 12, y + 8]]) +
    poly(P.deep, [[x + 1, y - 5.4], [x + 11, y - 5.4], [x + 11, y - 2], [x + 2, y - 2]]) +
    poly("#b8302a", [[x + 18, y - 3], [x + 24, y - 2], [x + 23, y], [x + 18, y]]);
  const tulip = (x: number, y: number, c: string) => {
    const T = tone(c);
    return poly(T.hi, [[x - 4, y], [x - 4, y - 6], [x - 2, y - 4], [x, y - 7], [x, y + 2]]) + poly(T.lo, [[x, y + 2], [x, y - 7], [x + 2, y - 4], [x + 4, y - 6], [x + 4, y]]);
  };
  return `${poly("#3f6a35", [[11, 34], [12, 34], [16, 14], [15, 14]])}${poly("#3f6a35", [[13, 34], [14, 34], [22, 12], [21, 12]])}
    ${leaf("#4f7a3e", "#3f6a35", 12, 32, 12, 2.4, -20)}
    ${tulip(15, 14, "#c44a5a")}${tulip(22, 12, "#e08a3a")}
    ${shoe(Y2, 28, 34)}${shoe(Y, 2, 36)}`;
}

export default { key: "klompen", label: "木靴とチューリップ", at: "shelf", w: 60, h: 44, cat: "飾り", order: 651, region: "NL", note: "オランダで。片方に花を挿して", art } satisfies ItemDef;
