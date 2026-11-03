// 毛糸玉の籠。実績「寝息」で届く
import { poly, tone, ngon, puff } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#a8824e");
  return `${puff(tone("#c4523e"), ngon(18, 18, 10, 9), [15, 14])}${puff(tone("#5f8a5a"), ngon(34, 14, 10, 9), [31, 10])}${puff(tone("#e8c46a"), ngon(48, 20, 9, 9), [45, 17])}
    ${poly("#c4523e", [[10, 24], [4, 40], [2, 50], [4, 50], [7, 40], [13, 26]])}
    ${poly(B.mid, [[6, 22], [60, 22], [56, 50], [10, 50]])}${poly(B.hi, [[6, 22], [60, 22], [58, 26], [8, 26]])}
    ${[0, 1, 2].map(i => poly(B.lo, [[8, 31 + i * 6], [58, 31 + i * 6], [58, 33 + i * 6], [8, 33 + i * 6]])).join("")}`;
}

export default { key: "yarnbasket", label: "毛糸玉の籠", at: "floor", w: 64, h: 50, cat: "猫", order: 755, note: "実績「寝息」で届く", art } satisfies ItemDef;
