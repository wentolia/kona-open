// クッキーの缶。ふたを開けて
import { cylinder, poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#3d6b8a"), K = tone("#d9a45a");
  const ck = (cx: number, cy: number, c: string) => poly(c, ngon(cx, cy, 5, 8).map(([x, y]) => [x, cy + (y - cy) * .5] as [number, number]));
  return `${poly(T.lo, [[40, 2], [56, 8], [52, 30], [38, 26]])}${poly(T.hi, [[42, 4], [54, 9], [51, 27], [40, 24]])}
    ${cylinder(T, 24, 14, 34, 20, 8)}${poly("#e8dcc0", [[4, 22], [44, 22], [44, 26], [4, 26]])}
    ${ck(16, 13, K.hi)}${ck(28, 12, "#7a4a2a")}${ck(22, 15, K.mid)}${ck(33, 15, K.hi)}`;
}

export default { key: "cookies", label: "クッキーの缶", at: "shelf", w: 58, h: 34, cat: "食べ物", order: 406, draft: true, note: "ふたを開けて", art } satisfies ItemDef;
