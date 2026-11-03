// オルゴール（試作）。押すと短い旋律が鳴る予定
import { box, poly, tone, BRASS } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#8a5a3e");
  return `${poly(T.hi, [[4, 12], [10, 4], [46, 4], [40, 12]])}${poly(T.lo, [[40, 12], [46, 4], [46, 30], [40, 38]])}
    ${box(T, 4, 12, 36, 26, 0, 0)}${poly(BRASS.mid, [[18, 22], [26, 22], [26, 28], [18, 28]])}${poly(BRASS.hi, [[46, 14], [50, 12], [50, 16], [46, 18]])}`;
}

export default { key: "musicbox", label: "オルゴール", at: "shelf", w: 50, h: 38, cat: "音楽", order: 210, draft: true, note: "押すと短い旋律が鳴る予定", art } satisfies ItemDef;
