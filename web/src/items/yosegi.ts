// 寄木細工の箱。神奈川で。木の色を組んだ模様
import { poly, box, WOOD } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const c = ["#d8b884", "#8a5a34", "#b8905a", "#5a3a24"];
  let tiles = "";
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
    const x = 4 + i * 6, y = 16 + r * 6;
    tiles += poly(c[(i + r) % 4], [[x, y], [x + 3, y], [x + 6, y + 3], [x + 3, y + 6], [x, y + 6]]) + poly(c[(i + r + 2) % 4], [[x + 3, y], [x + 6, y], [x + 6, y + 3]]) + poly(c[(i + r + 1) % 4], [[x + 3, y + 6], [x + 6, y + 3], [x + 6, y + 6]]);
  }
  return `${box(WOOD, 4, 16, 36, 18, 6, -6)}${tiles}${poly(c[1], [[4, 16], [40, 16], [46, 10], [10, 10]])}
    ${[0, 1, 2, 3, 4, 5].map(i => poly(c[i % 4], [[10 + i * 6, 10], [16 + i * 6, 10], [10 + i * 6 + 6 - 6, 16], [4 + i * 6, 16]])).join("")}`;
}

export default { key: "yosegi", label: "寄木細工の箱", at: "shelf", w: 46, h: 36, cat: "小物", order: 620, region: "JP-14", note: "神奈川で。木の色を組んだ模様", art } satisfies ItemDef;
