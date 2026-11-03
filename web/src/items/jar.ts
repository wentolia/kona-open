// ガラス瓶（試作）。ビー玉入り
import { poly, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const marbles = [[10, 42, "#d9584a"], [18, 44, "#4a8ac0"], [25, 41, "#e3b766"], [14, 36, "#5aa070"], [22, 35, "#b06aa8"], [17, 29, "#e8e2d0"]] as const;
  return `${poly("rgba(170,205,210,.18)", [[4, 12], [30, 12], [30, 48], [26, 50], [8, 50], [4, 48]])}
    ${marbles.map(([x, y, c]) => poly(c, ngon(x, y, 4, 7))).join("")}
    ${poly("rgba(255,255,255,.22)", [[6, 14], [9, 14], [9, 46], [6, 46]])}
    ${poly("#a07a50", [[6, 4], [28, 4], [28, 12], [6, 12]])}${poly("#c09a68", [[6, 4], [28, 4], [27, 7], [7, 7]])}`;
}

export default { key: "jar", label: "ガラス瓶", at: "shelf", w: 34, h: 50, cat: "小物", order: 207, draft: true, note: "ビー玉入り", art } satisfies ItemDef;
