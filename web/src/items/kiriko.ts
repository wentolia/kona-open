// 切子のグラス。鹿児島で。紅色を削った菱つなぎ
import { poly, tone } from "./lowpoly";
import { oval } from "./_land";
import type { ItemDef } from "./types";

function art() {

  const R = tone("#b82a3a");
  let cut = "";
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = 7 + c * 6 + (r % 2) * 3, y = 14 + r * 7; cut += poly("rgba(255,236,236,.75)", [[x, y - 3], [x + 3, y], [x, y + 3], [x - 3, y]]); }
  return `${poly(R.mid, [[4, 6], [30, 6], [28, 36], [6, 36]])}${poly(R.lo, [[17, 6], [30, 6], [28, 36], [17, 36]])}${cut}
    ${poly("rgba(255,255,255,.55)", oval(17, 6, 13, 2.4, 12, 0))}${poly("#e8dcdc", [[6, 36], [28, 36], [27, 39], [7, 39]])}`;
}

export default { key: "kiriko", label: "切子のグラス", at: "shelf", w: 34, h: 40, cat: "小物", order: 647, region: "JP-46", note: "鹿児島で。紅色を削った菱つなぎ", art } satisfies ItemDef;
