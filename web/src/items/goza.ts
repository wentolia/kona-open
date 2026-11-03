// ござ: い草を細い筋に織った敷物。左右の端に布の縁、薄く色の筋を 2 本
import { trap, cell, cell2 } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const at = trap(0, 260, 3, 38, 18);
  let s = cell(at, "#b9a568", 0, 0, 1, 1);
  const N = 22;
  for (let i = 0; i < N; i++) {
    const v0 = i / N, v1 = (i + 1) / N, c = i === 6 || i === 15 ? ["#a8584a", "#984d40"] : i % 2 ? ["#c9b77a", "#bfac6f"] : ["#bba869", "#b19e5f"];
    s += cell2(at, c[0], c[1], .045, v0, .955, v1);
  }
  // 縁の布
  for (const [u0, u1] of [[0, .045], [.955, 1]]) s += cell2(at, "#33435c", "#2a384e", u0, 0, u1, 1);
  return s;
}

export default { key: "goza", label: "ござ", at: "floor", w: 260, h: 0, flat: true, vh: 40, x: 0.4, cat: "敷きもの", order: 24, note: "い草の匂い。夏の床に", art } satisfies ItemDef;
