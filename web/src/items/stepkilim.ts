// 段々のキリム: のこぎりの歯のような段の三角を上下から噛み合わせる。橙と墨と生成り
import { trap, cell, tassel } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const at = trap(0, 220, 4, 36, 15);
  let s = cell(at, "#e2d2ad", 0, 0, 1, 1) + cell(at, "#2e2b28", .025, .08, .975, .92) + cell(at, "#c06a3a", .04, .16, .96, .84);
  const N = 7, du = .92 / N, steps = 4;
  for (let i = 0; i < N; i++) {
    const u = .04 + (i + .5) * du;
    for (let k = 0; k < steps; k++) {
      const w = du * .5 * (1 - k / steps), h = .34 / steps;
      s += cell(at, "#e2d2ad", u - w, .16 + k * h, u + w, .16 + (k + 1) * h); // 奥から下りる段
      const u2 = u + du / 2, w2 = Math.min(w, .96 - u2, u2 - .04);
      if (w2 > 0) s += cell(at, "#2e2b28", u2 - w2, .84 - (k + 1) * h, u2 + w2, .84 - k * h); // 手前から上る段
    }
    s += cell(at, "#c06a3a", u - .006, .2, u + .006, .3);
  }
  for (let i = 0; i <= 24; i++) s += tassel("#d9c6a0", at(i / 24, 1), 0, 3);
  return s;
}

export default { key: "stepkilim", label: "段々のキリム", at: "floor", w: 220, h: 0, flat: true, vh: 40, x: 0.35, cat: "敷きもの", order: 28, art } satisfies ItemDef;
