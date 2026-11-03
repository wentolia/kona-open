// 丸い鏡 72×72: 真鍮の縁、映り込みの斜めの帯
import { poly, BRASS, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const o = ngon(36, 36, 35, 12, Math.PI / 12), i = ngon(36, 36, 29, 12, Math.PI / 12);
  let s = "";
  for (let k = 0; k < 12; k++) { const n = (k + 1) % 12, t = Math.sin(k / 12 * Math.PI * 2 + 2.4); s += poly(t > .4 ? BRASS.hi : t > -.2 ? BRASS.mid : t > -.7 ? BRASS.lo : BRASS.deep, [o[k], o[n], i[n], i[k]]); }
  s += poly("#56606a", i) + poly("#6b7680", [i[6], i[7], i[8], [20, 46], [12, 40]]);
  s += poly("#8a96a0", [[22, 14], [30, 11], [12, 40], [9, 33]]) + poly("#7a868f", [[36, 9], [40, 10], [16, 50], [13, 46]]);
  return s;
}

export default { key: "mirror", label: "丸い鏡", at: "wall", w: 72, h: 72, x: 0.6, y: 0.15, cat: "飾り", order: 102, art } satisfies ItemDef;
