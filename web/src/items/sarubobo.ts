// さるぼぼ。岐阜で。赤い顔のない人形
import { poly, puff, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const R = tone("#c42a28"), K = tone("#2a2420");
  return `${puff(R, oval(17, 12, 8, 8, 10), [14, 8])}
    ${puff(R, [[9, 22], [25, 22], [27, 38], [7, 38]], [15, 28])}
    ${puff(K, [[6, 20], [17, 16], [28, 20], [26, 26], [17, 23], [8, 26]], [14, 19])}
    ${puff(R, [[3, 24], [9, 22], [9, 30], [2, 30]], [5, 25])}${puff(R, [[25, 22], [31, 24], [32, 30], [25, 30]], [27, 25])}
    ${puff(R, [[9, 38], [16, 38], [15, 48], [8, 48]], [11, 41])}${puff(R, [[18, 38], [25, 38], [26, 48], [19, 48]], [20, 41])}
    ${poly(K.mid, [[14, 3], [20, 3], [17, 6]])}`;
}

export default { key: "sarubobo", label: "さるぼぼ", at: "shelf", w: 34, h: 50, cat: "飾り", order: 627, region: "JP-21", note: "岐阜で。赤い顔のない人形", art } satisfies ItemDef;
