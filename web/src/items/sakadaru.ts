// 酒樽。兵庫で。菰を巻いた小さな樽
import { poly, tone, ngon, cylinder } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const S = tone("#e0d0a8");
  return `${cylinder(S, 22, 8, 40, 18, 6)}${[12, 34].map(y => poly("#6a4a2a", [[4, y], [40, y], [40, y + 2], [4, y + 2]])).join("")}
    ${poly("#e8e0cc", [[13, 17], [31, 17], [31, 31], [13, 31]])}${poly("#b8302a", ngon(22, 24, 5, 10))}${poly("#2a2420", [[15, 19], [29, 19], [29, 20], [15, 20]])}`;
}

export default { key: "sakadaru", label: "酒樽", at: "shelf", w: 44, h: 42, cat: "小物", order: 631, region: "JP-28", note: "兵庫で。菰を巻いた小さな樽", art } satisfies ItemDef;
