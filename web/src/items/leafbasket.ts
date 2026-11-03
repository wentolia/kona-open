// 落ち葉の籠。実績「秋の音」で届く
import { poly, tone, leaf } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#a8824e");
  return `${["#c4523e", "#e08a3a", "#c9a24a", "#8a3a2a", "#d86a3a"].map((c, i) => leaf(c, tone(c).lo, 14 + i * 10, 22, 14, 5, -50 + i * 25)).join("")}
    ${poly(B.mid, [[4, 20], [66, 20], [60, 52], [10, 52]])}${poly(B.hi, [[4, 20], [66, 20], [64, 24], [6, 24]])}
    ${[0, 1, 2, 3].map(i => poly(B.lo, [[6 + i, 28 + i * 6], [64 - i, 28 + i * 6], [64 - i, 30 + i * 6], [6 + i, 30 + i * 6]])).join("")}`;
}

export default { key: "leafbasket", label: "落ち葉の籠", at: "floor", w: 70, h: 52, cat: "季節", order: 742, note: "実績「秋の音」で届く", art } satisfies ItemDef;
