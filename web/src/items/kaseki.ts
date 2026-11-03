// 恐竜の化石。福井で。台に据えた小さな骨
import { poly, tone, box } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const B = tone("#e0d4b8");
  let ribs = "";
  for (let i = 0; i < 5; i++) ribs += poly(B.mid, [[22 + i * 5, 16], [24 + i * 5, 16], [22 + i * 5, 28], [20 + i * 5, 28]]);
  return `${box(tone("#4a3a2c"), 4, 34, 50, 6, 4, -3)}
    ${poly(B.lo, [[28, 34], [30, 34], [30, 18], [28, 18]])}
    ${poly(B.hi, [[8, 16], [48, 14], [56, 20], [48, 18], [10, 19]])}${ribs}
    ${poly(B.hi, [[46, 12], [56, 8], [60, 12], [54, 16], [46, 16]])}${poly(B.deep, [[52, 10], [54, 10], [54, 11.6], [52, 11.6]])}
    ${poly(B.mid, [[2, 18], [10, 16], [10, 19], [0, 22]])}`;
}

export default { key: "kaseki", label: "恐竜の化石", at: "shelf", w: 60, h: 40, cat: "飾り", order: 624, region: "JP-18", note: "福井で。台に据えた小さな骨", art } satisfies ItemDef;
