// 小さなラジオ（試作）。★ 再生中に目盛りの灯が動く予定
import { box, poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#a8714a");
  return `${poly("#2a2724", [[50, 0], [52, 0], [56, 14], [54, 14]])}
    ${box(T, 2, 14, 66, 34, 5, -3)}${poly("#e8dcc0", [[8, 20], [38, 20], [38, 42], [8, 42]])}
    ${[11, 15, 19, 23, 27, 31, 35].map(x => poly("#b8a888", [[x, 22], [x + 1.6, 22], [x + 1.6, 40], [x, 40]])).join("")}
    ${poly("#2a2724", [[42, 22], [62, 22], [62, 30], [42, 30]])}${poly("#f0b060", [[50, 23], [52, 23], [52, 29], [50, 29]])}
    ${poly("#3a2a20", ngon(48, 37, 3.4, 8))}${poly("#3a2a20", ngon(57, 37, 3.4, 8))}`;
}

export default { key: "radio", label: "小さなラジオ", at: "shelf", w: 74, h: 48, cat: "音楽", order: 204, draft: true, note: "★ 再生中に目盛りの灯が動く予定", art } satisfies ItemDef;
