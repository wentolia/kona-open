// ティーポット（試作）。
import { poly, puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#5e7f86");
  return `${poly(T.lo, [[48, 22], [60, 12], [62, 14], [52, 30]])}${poly(T.deep, [[8, 18], [2, 14], [4, 30], [10, 32]])}
    ${puff(T, [[10, 16], [22, 12], [40, 12], [50, 18], [52, 32], [46, 44], [16, 44], [8, 32]], [26, 24])}
    ${poly(T.hi, [[22, 12], [40, 12], [36, 8], [26, 8]])}${poly(T.mid, [[29, 3], [33, 3], [34, 8], [28, 8]])}${poly(T.deep, [[16, 44], [46, 44], [44, 48], [18, 48]])}`;
}

export default { key: "teapot", label: "ティーポット", at: "shelf", w: 62, h: 48, cat: "小物", order: 201, draft: true, note: "", art } satisfies ItemDef;
