// 金のレコード。実績「百枚」で届く
import { poly, ngon, puff, bevel, BRASS, INK } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  return `${bevel(64, 80, 5, INK)}${poly("#2b2724", [[5, 5], [59, 5], [59, 75], [5, 75]])}
    ${puff(BRASS, ngon(32, 34, 22, 16), [26, 28])}${poly(BRASS.lo, ngon(32, 34, 14, 16))}${poly(BRASS.mid, ngon(32, 34, 13, 16))}
    ${poly("#d9584a", ngon(32, 34, 5, 10))}${poly("#1e1b19", ngon(32, 34, 1.2, 6))}
    ${poly("#d8cdb4", [[16, 62], [48, 62], [48, 68], [16, 68]])}`;
}

export default { key: "goldrecord", label: "金のレコード", at: "wall", w: 64, h: 80, cat: "音楽", order: 713, note: "実績「百枚」で届く", art } satisfies ItemDef;
