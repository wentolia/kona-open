// 裂き織りのマット: 古布を緯（よこ）に打ち込んだ小さな敷物。色はばらばらの筋、経（たて）の糸が両端に
import { poly } from "./lowpoly";
import { trap, cell2, jit } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const at = trap(8, 164, 6, 34, 10);
  const C = [["#5d7186", "#4e6074"], ["#c79a4a", "#ac833c"], ["#d8c9a8", "#c3b38f"], ["#a0583a", "#88492f"], ["#8a9b84", "#748670"], ["#7b5a74", "#664a60"], ["#d8c9a8", "#c3b38f"]];
  let s = "";
  // 縦の筋（左右に流れる経の向きに直交する、緯の帯）。帯ごとに色と幅がまちまち
  let u = 0, i = 0;
  while (u < 1) {
    const w = Math.min(1 - u, .025 + jit(i) * .05), c = C[Math.floor(jit(i + 50) * C.length)];
    s += cell2(at, c[0], c[1], u, 0, u + w, 1); u += w; i++;
  }
  for (let k = 0; k <= 8; k++) {
    const v = .06 + k * .11;
    for (const [uu, dx] of [[0, -6], [1, 6]] as const) { const [x, y] = at(uu, v); s += poly("#e2d5b6", [[x, y - .45], [x, y + .45], [x + dx, y + .25], [x + dx, y - .25]]); }
  }
  return s;
}

export default { key: "ragmat", label: "裂き織りのマット", at: "floor", w: 180, h: 0, flat: true, vh: 40, x: 0.25, cat: "敷きもの", order: 28.5, note: "古布の色がまちまちに出る小さな敷物", art } satisfies ItemDef;
