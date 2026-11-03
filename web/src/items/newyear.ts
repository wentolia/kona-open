// 新年の飾り（試作）。新年
import { poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const M = tone("#f1ece0");
  const disc = (cy: number, rx: number, ry: number) => { const g = ngon(25, cy, 1, 12).map(([x, y]) => [25 + (x - 25) * rx, cy + (y - cy) * ry] as [number, number]); let o = ""; for (let k = 0; k < 12; k++) { const t = Math.sin(k / 12 * Math.PI * 2 + 2.4); o += poly(t > .2 ? M.hi : t > -.4 ? M.mid : M.lo, [[25, cy], g[k], g[(k + 1) % 12]]); } return o; };
  return `${poly("#b88a4a", [[4, 50], [46, 50], [44, 58], [6, 58]])}${poly("#d0a45e", [[4, 50], [46, 50], [45, 52], [5, 52]])}
    ${disc(40, 18, 9)}${disc(27, 13, 7)}${poly("#e7932e", [[19, 16], [25, 12], [31, 16], [29, 22], [21, 22]])}${poly("#4f7a3e", [[24, 12], [27, 6], [29, 8], [26, 13]])}`;
}

export default { key: "newyear", label: "新年の飾り", at: "shelf", w: 50, h: 58, cat: "季節", order: 304, draft: true, note: "新年", art } satisfies ItemDef;
