// 有田焼の壺。佐賀で。白地に藍と朱
import { poly, puff, tone, ngon, leaf } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const W = tone("#f0ece4");
  return `${puff(W, [[8, 14], [28, 14], [34, 26], [30, 44], [6, 44], [2, 26]], [12, 22])}${poly(W.lo, [[12, 6], [24, 6], [26, 14], [10, 14]])}${poly(W.hi, oval(18, 6, 6, 1.6, 10, 0))}
    ${poly(W.deep, [[10, 44], [26, 44], [25, 47], [11, 47]])}
    ${poly("#2c4a7e", [[4, 22], [32, 22], [32.6, 24], [3.4, 24]])}${poly("#2c4a7e", [[6, 38], [30, 38], [29.6, 40], [6.4, 40]])}
    ${poly("#c44a3a", ngon(14, 30, 4, 5, .3))}${poly("#e8c86a", ngon(14, 30, 1.4, 5))}${leaf("#2c4a7e", "#24406e", 20, 34, 9, 2.2, 40)}`;
}

export default { key: "aritayaki", label: "有田焼の壺", at: "shelf", w: 36, h: 50, cat: "飾り", order: 642, region: "JP-41", note: "佐賀で。白地に藍と朱", art } satisfies ItemDef;
