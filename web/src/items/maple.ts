// メープルシロップ。カナダで。葉の形の瓶
import { poly, puff, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const A = tone("#b8641e");
  const pts: [number, number][] = [[17, 6], [20, 14], [27, 11], [25, 20], [32, 22], [26, 30], [28, 38], [17, 34], [6, 38], [8, 30], [2, 22], [9, 20], [7, 11], [14, 14]];
  return `${poly("#e8e0cc", [[15, 0], [19, 0], [19, 6], [15, 6]])}${poly("#b8302a", [[14, 3], [20, 3], [20, 6], [14, 6]])}
    ${puff(A, pts, [13, 16])}${poly("rgba(255,220,160,.35)", [[10, 18], [16, 14], [16, 26], [11, 28]])}
    ${poly(A.lo, [[8, 36], [26, 36], [26, 46], [8, 46]])}${poly(A.mid, [[8, 36], [17, 36], [17, 46], [8, 46]])}${poly("#e8e0cc", [[10, 39], [24, 39], [24, 43], [10, 43]])}`;
}

export default { key: "maple", label: "メープルシロップ", at: "shelf", w: 34, h: 48, cat: "食べ物", order: 662, region: "CA", note: "カナダで。葉の形の瓶", art } satisfies ItemDef;
