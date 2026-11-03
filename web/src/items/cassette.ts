// カセットテープ（試作）。★ 再生中はリールが回る予定
import { poly, slab, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#e3dccb");
  return `${slab(T.hi, T.lo, [2, 2, 54, 36])}${poly("#c8553f", [[6, 6], [50, 6], [50, 14], [6, 14]])}
    ${poly("#2a2724", [[12, 17], [44, 17], [44, 27], [12, 27]])}${poly("#e9e2d1", ngon(19, 22, 3.6, 6))}${poly("#e9e2d1", ngon(37, 22, 3.6, 6))}
    ${poly(T.deep, [[14, 30], [42, 30], [44, 36], [12, 36]])}`;
}

export default { key: "cassette", label: "カセットテープ", at: "shelf", w: 56, h: 36, cat: "音楽", order: 202, draft: true, note: "★ 再生中はリールが回る予定", art } satisfies ItemDef;
