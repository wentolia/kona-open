// 無地のラグ（苔色）: 毛並みの向きでわずかに色が変わるだけの、柄のない一枚
import { tone } from "./lowpoly";
import { trap, cell, cell2 } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const p = tone("#6f7d5a"), at = trap(0, 280, 3, 38, 20);
  let s = cell(at, p.deep, 0, 0, 1, 1);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
    const u0 = .02 + i * .96 / 6, v0 = .06 + j * .44;
    s += cell2(at, (i + j) % 2 ? p.mid : p.hi, (i + j) % 2 ? p.lo : p.mid, u0, v0, u0 + .96 / 6, v0 + .44);
  }
  return s;
}

export default { key: "plainmoss", label: "無地のラグ（苔）", at: "floor", w: 280, h: 0, flat: true, vh: 40, x: 0.5, cat: "敷きもの", order: 25.5, note: "柄のない苔色。何の下にも合う", art } satisfies ItemDef;
