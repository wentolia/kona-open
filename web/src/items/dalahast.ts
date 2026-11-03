// 木の馬。スウェーデンで。赤い地に花の絵付け
import { poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const R = tone("#c42a28");
  return `${poly(R.lo, [[8, 28], [14, 28], [14, 44], [8, 44]])}${poly(R.lo, [[28, 28], [34, 28], [34, 44], [28, 44]])}
    ${poly(R.mid, [[4, 18], [34, 18], [36, 30], [6, 30]])}${poly(R.hi, [[30, 18], [34, 4], [42, 6], [44, 12], [38, 14], [36, 22]])}
    ${poly(R.deep, [[2, 16], [6, 18], [4, 28]])}
    ${poly("#2c4a7e", [[30, 6], [34, 2], [34, 16], [30, 18]])}${poly("#e8c86a", [[8, 22], [26, 22], [26, 24], [8, 24]])}
    ${poly("#e8e0cc", ngon(14, 26, 2, 5))}${poly("#5f8a4a", ngon(22, 26, 2, 5))}${poly("#2a2420", [[38, 8], [39.4, 8], [39.4, 9.4], [38, 9.4]])}`;
}

export default { key: "dalahast", label: "木の馬", at: "shelf", w: 44, h: 44, cat: "飾り", order: 673, region: "SE", note: "スウェーデンで。赤い地に花の絵付け", art } satisfies ItemDef;
