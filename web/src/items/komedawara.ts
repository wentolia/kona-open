// 米俵。新潟で。新米を俵に
import { poly, tone, cylinder } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const S = tone("#d8b66a");
  return `${cylinder(S, 26, 10, 36, 22, 6, false)}
    ${poly(S.mid, oval(4, 23, 4, 13, 10))}${poly(S.lo, oval(48, 23, 4, 13, 10))}${poly(S.hi, oval(4, 23, 2.2, 9, 8))}
    ${[13, 26, 39].map(x => poly("#7a5a2a", [[x - 1.4, 9], [x + 1.4, 9], [x + 1.4, 37], [x - 1.4, 37]])).join("")}
    ${poly("#c44a3a", [[22, 18], [30, 18], [30, 28], [22, 28]])}${poly("#e8e0cc", [[23.4, 19.4], [28.6, 19.4], [28.6, 26.6], [23.4, 26.6]])}${poly("#2a2420", [[25.4, 20.4], [26.6, 20.4], [26.6, 25.6], [25.4, 25.6]])}`;
}

export default { key: "komedawara", label: "米俵", at: "shelf", w: 52, h: 40, cat: "食べ物", order: 621, region: "JP-15", note: "新潟で。新米を俵に", art } satisfies ItemDef;
