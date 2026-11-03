// 市松のラグ: 墨と麦色の市松。升目ごとに 2 枚の三角で、わずかに濃淡
import { trap, cell, cell2 } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const at = trap(0, 260, 3, 38, 18), C = 8, R = 4;
  let s = cell(at, "#2e2b28", 0, 0, 1, 1);
  for (let i = 0; i < C; i++) for (let j = 0; j < R; j++) {
    const u0 = .03 + i * .94 / C, v0 = .07 + j * .86 / R, d = (i + j) % 2;
    s += cell2(at, d ? "#3c3834" : "#d9c9a6", d ? "#34302d" : "#cbbb97", u0, v0, u0 + .94 / C, v0 + .86 / R);
  }
  return s;
}

export default { key: "checker", label: "市松のラグ", at: "floor", w: 260, h: 0, flat: true, vh: 40, x: 0.5, cat: "敷きもの", order: 25, art } satisfies ItemDef;
