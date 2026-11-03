// 旅行かばん。実績「はじめまして」で届く。猫が上に乗る
import { poly, tone, box, BRASS } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#8a5a36");
  return `${poly(C.deep, [[34, 4], [56, 4], [56, 12], [52, 12], [52, 8], [38, 8], [38, 12], [34, 12]])}
    ${box(C, 4, 14, 76, 48, 8, -4)}${poly(C.lo, [[4, 36], [80, 36], [80, 38], [4, 38]])}
    ${poly(BRASS.mid, [[18, 14], [22, 14], [22, 62], [18, 62]])}${poly(BRASS.mid, [[62, 14], [66, 14], [66, 62], [62, 62]])}
    ${poly("#d8cdb4", [[30, 22], [46, 20], [48, 30], [32, 32]])}${poly("#5f8a5a", [[50, 42], [60, 40], [60, 50], [50, 52]])}
    <i data-cat-plat="bed" data-sink="1" style="left:6%;width:88%;top:12%"></i>`;
}

export default { key: "suitcase", label: "旅行かばん", at: "floor", w: 90, h: 66, cat: "小物", order: 724, note: "実績「はじめまして」で届く。猫が上に乗る", art } satisfies ItemDef;
