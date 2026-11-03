// 香炉。煙が揺れる予定
import { cylinder, poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#6a6f6a");
  return `${poly("rgba(220,220,220,.35)", [[17, 4], [19, 12], [16, 20], [19, 28], [18, 34], [17, 34], [17, 28], [15, 20], [18, 12], [16, 4]])}
    ${poly("#7a5a3a", [[17.4, 30], [18.6, 30], [18.6, 42], [17.4, 42]])}${poly("#e07a2e", [[17.2, 29], [18.8, 29], [18.8, 31], [17.2, 31]])}
    ${cylinder(T, 18, 42, 54, 15, 6)}`;
}

export default { key: "incense", label: "香炉", at: "shelf", w: 36, h: 54, cat: "小物", order: 209, note: "煙が揺れる予定", art } satisfies ItemDef;
