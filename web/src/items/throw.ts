// ひざ掛け。実績「長い一日」で届く。たたんで置く。猫が上で寝る
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const A = tone("#a85f4a"), B = tone("#d8c7a4");
  return `${poly(A.lo, [[4, 14], [86, 12], [88, 38], [2, 38]])}${poly(A.mid, [[6, 6], [84, 4], [86, 14], [4, 16]])}${poly(A.hi, [[6, 6], [40, 5], [36, 10], [8, 11]])}
    ${[0, 1, 2, 3].map(i => poly(B.mid, [[14 + i * 20, 5], [18 + i * 20, 5], [18 + i * 20, 38], [14 + i * 20, 38]])).join("")}
    ${poly(A.deep, [[2, 26], [88, 25], [88, 28], [2, 29]])}
    ${Array.from({ length: 8 }, (_, i) => poly(B.lo, [[6 + i * 11, 38], [8 + i * 11, 38], [7 + i * 11, 40]])).join("")}
    <i data-cat-plat="bed" data-sink="2" style="left:8%;width:84%;top:10%"></i>`;
}

export default { key: "throw", label: "ひざ掛け", at: "floor", w: 90, h: 40, cat: "敷きもの", order: 707, note: "実績「長い一日」で届く。たたんで置く。猫が上で寝る", art } satisfies ItemDef;
