// 果物の鉢。りんご・みかん・バナナ
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#d9cdb4"), A = tone("#c0392b"), O = tone("#e8902e"), N = tone("#e8c84a");
  const ball = (p: ReturnType<typeof tone>, cx: number, cy: number, r: number) => puff(p, ngon(cx, cy, r, 8, .2), [cx - r * .3, cy - r * .3]);
  return `${puff(N, [[12, 22], [20, 12], [34, 8], [46, 10], [44, 14], [34, 13], [22, 18], [16, 24]], [30, 12])}${poly("#5a4a2a", [[44, 9], [48, 8], [48, 11], [45, 12]])}
    ${ball(O, 44, 22, 9)}${ball(A, 22, 22, 9)}${poly("#5a3a24", [[22, 12], [23, 12], [24, 15], [22.5, 15]])}${ball(A, 34, 24, 8)}
    ${poly(B.hi, [[2, 26], [62, 26], [54, 40], [10, 40]])}${poly(B.lo, [[32, 26], [62, 26], [54, 40], [32, 40]])}${poly(B.deep, [[22, 40], [42, 40], [40, 44], [24, 44]])}`;
}

export default { key: "fruitbowl", label: "果物の鉢", at: "shelf", w: 64, h: 44, cat: "食べ物", order: 400, draft: true, note: "りんご・みかん・バナナ", art } satisfies ItemDef;
