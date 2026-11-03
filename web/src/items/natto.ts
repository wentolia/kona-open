// 納豆。茨城で。藁づとに包んで
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const S = tone("#cfae6a");
  let lines = "";
  for (let i = 0; i < 7; i++) lines += poly(S.lo, [[6 + i * 6.6, 16 + (i % 2)], [7 + i * 6.6, 16 + (i % 2)], [8 + i * 6.6, 30], [7 + i * 6.6, 30]]);
  return `${puff(S, [[2, 22], [10, 14], [46, 14], [54, 22], [46, 30], [10, 30]], [24, 18])}${lines}
    ${poly(S.deep, [[14, 13], [17, 13], [17, 31], [14, 31]])}${poly(S.deep, [[39, 13], [42, 13], [42, 31], [39, 31]])}
    ${poly("#8a6a3a", [[22, 14], [34, 14], [32, 18], [24, 18]])}${[24, 28, 31].map(x => poly("#a8743a", ngon(x, 15.4, 1.7, 6))).join("")}`;
}

export default { key: "natto", label: "納豆", at: "shelf", w: 56, h: 34, cat: "食べ物", order: 616, region: "JP-08", note: "茨城で。藁づとに包んで", art } satisfies ItemDef;
