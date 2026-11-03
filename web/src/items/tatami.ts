// 置き畳: 縁のついた畳を 2 枚並べる。目は細い筋、縁は深い緑
import { trap, cell, cell2, type At } from "./_rug";
import type { ItemDef } from "./types";

function mat(all: At, ua: number, ub: number, warm: boolean) {
  const at: At = (u, v) => all(ua + (ub - ua) * u, v);
  let s = cell2(at, "#33433a", "#2a3830", 0, 0, 1, 1);
  const N = 14, a = warm ? ["#b9b26c", "#aea763"] : ["#aeab68", "#a29f5e"];
  for (let i = 0; i < N; i++) s += cell2(at, i % 2 ? a[0] : a[1], i % 2 ? a[1] : a[0], .02, .08 + i * .84 / N, .98, .08 + (i + 1) * .84 / N);
  // 縁の小さな柄
  for (let i = 0; i < 9; i++) { const u = .06 + i * .11; s += cell(at, "#4a5a46", u, .02, u + .04, .06) + cell(at, "#4a5a46", u, .94, u + .04, .98); }
  return s;
}
function art() {
  const at = trap(0, 270, 4, 38, 16);
  return mat(at, 0, .497, true) + mat(at, .503, 1, false);
}

export default { key: "tatami", label: "置き畳", at: "floor", w: 270, h: 0, flat: true, vh: 40, x: 0.5, cat: "敷きもの", order: 24.5, note: "2 枚並べた縁つきの畳", art } satisfies ItemDef;
