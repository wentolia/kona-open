// 青磁の壺。韓国で。翡翠色に鶴の象嵌
import { poly, puff, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const C = tone("#8ab4a0");
  return `${puff(C, [[10, 10], [26, 10], [34, 22], [28, 40], [8, 40], [2, 22]], [10, 18])}${poly(C.mid, [[12, 4], [24, 4], [26, 10], [10, 10]])}${poly(C.hi, oval(18, 4, 6, 1.4, 10, 0))}
    ${poly(C.deep, [[10, 40], [26, 40], [25, 44], [11, 44]])}
    ${poly("#f0ece4", [[10, 26], [16, 21], [18, 25]])}${poly("#f0ece4", [[18, 25], [24, 20], [22, 26]])}${poly("#f0ece4", [[16, 24], [20, 24], [22, 27], [17, 27]])}
    ${poly("#f0ece4", [[22, 26], [27, 24], [27.6, 25]])}${poly("#2a2420", [[26.6, 24], [28, 23.6], [27.6, 25]])}`;
}

export default { key: "celadon", label: "青磁の壺", at: "shelf", w: 36, h: 48, cat: "飾り", order: 678, region: "KR", note: "韓国で。翡翠色に鶴の象嵌", art } satisfies ItemDef;
