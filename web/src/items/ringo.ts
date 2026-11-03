// りんご。青森で。木箱の端に 2 つ
import { poly, puff, tone, ngon, box, WOOD } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const R = tone("#b8352e"), Y = tone("#c9a23c");
  const apple = (P: typeof R, cx: number, cy: number, r: number) =>
    puff(P, ngon(cx, cy, r, 9, .3).map(([x, y]) => [x, cy + (y - cy) * .9] as [number, number]), [cx - r * .35, cy - r * .4]) +
    poly(P.deep, [[cx - 2, cy - r * .85], [cx + 2, cy - r * .85], [cx, cy - r * .6]]) +
    poly("#5a4030", [[cx - .6, cy - r * .7], [cx + .6, cy - r * .7], [cx + 1.6, cy - r - 4], [cx + .6, cy - r - 4]]);
  return `${box(WOOD, 2, 28, 42, 12, 4, -3)}${poly(WOOD.deep, [[2, 33], [44, 33], [44, 34], [2, 34]])}
    ${apple(R, 15, 18, 10)}${apple(Y, 33, 19, 9)}
    ${poly("#4f7a3e", [[17, 7], [24, 3], [22, 8]])}${poly("#3f6a35", [[17, 7], [22, 8], [19, 9]])}`;
}

export default { key: "ringo", label: "りんご", at: "shelf", w: 48, h: 40, cat: "食べ物", order: 602, region: "JP-02", note: "青森で。木箱の端に 2 つ", art } satisfies ItemDef;
