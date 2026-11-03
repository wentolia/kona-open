// 天灯。台湾で。願いを書いた紙の灯り
import { poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const R = tone("#d8503a"), Y = tone("#e8b84a");
  return `    ${poly(R.hi, [[6, 4], [18, 2], [16, 40], [8, 40]])}${poly(R.mid, [[18, 2], [30, 4], [28, 40], [16, 40]])}
    ${poly(Y.mid, [[8, 40], [28, 40], [28, 44], [8, 44]])}${poly(Y.lo, [[18, 40], [28, 40], [28, 44], [18, 44]])}
    ${poly("rgba(255,214,140,.35)", [[10, 20], [26, 20], [26, 38], [10, 38]])}${poly(R.lo, [[17.4, 3], [18.6, 3], [17.6, 40], [16.4, 40]])}
    ${poly(Y.hi, [[7, 10], [29, 10], [29, 11.6], [7, 11.6]])}
    ${poly("#5a4030", [[8, 44], [28, 44], [28, 45], [8, 45]])}${poly("#ffd27a", [[15, 45], [21, 45], [19, 49], [17, 49]])}`;
}

export default { key: "tenggeng", label: "天灯", at: "shelf", w: 36, h: 50, cat: "灯り", order: 683, region: "TW", note: "台湾で。願いを書いた紙の灯り", art } satisfies ItemDef;
