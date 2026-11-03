// せんべい。埼玉で。醤油の焼き色と海苔
import { poly, puff, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {
  const S = tone("#b8783a"), N = "#1f2a22";
  const disk = (cx: number, cy: number) => poly(S.lo, oval(cx, cy + 2, 17, 6, 14, 0)) + puff(S, oval(cx, cy, 17, 6, 14, 0), [cx - 5, cy - 2]) +
    poly(S.deep, [[cx - 6, cy - 1], [cx - 4, cy - 2], [cx - 3, cy]]) + poly(S.deep, [[cx + 6, cy + 1], [cx + 8, cy], [cx + 8, cy + 2]]);
  return `${disk(24, 30)}${disk(26, 22)}${poly(N, [[18, 18], [30, 17], [34, 26], [22, 27]])}${poly("#2f3a30", [[18, 18], [30, 17], [31, 19], [19, 20]])}`;
}

export default { key: "senbei", label: "せんべい", at: "shelf", w: 50, h: 40, cat: "食べ物", order: 618, region: "JP-11", note: "埼玉で。醤油の焼き色と海苔", art } satisfies ItemDef;
