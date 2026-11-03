// 地球儀。
import { poly, tone, ngon, BRASS } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const sea = tone("#3f6f8a");
  const g = ngon(23, 26, 18, 14);
  let s = "";
  for (let k = 0; k < 14; k++) { const n = (k + 1) % 14, t = Math.sin(k / 14 * Math.PI * 2 + 2.4); s += poly(t > .3 ? sea.hi : t > -.3 ? sea.mid : sea.lo, [[23, 26], g[k], g[n]]); }
  return `${s}${poly("#7f9a5a", [[14, 18], [22, 14], [26, 20], [20, 28], [14, 26]])}${poly("#6b8a4a", [[28, 28], [34, 30], [32, 38], [26, 36]])}
    ${poly(BRASS.mid, [[4, 26], [6, 26], [8, 14], [16, 6], [23, 4], [23, 6], [17, 8], [10, 15]])}
    ${poly(BRASS.lo, [[22, 44], [24, 44], [24, 58], [22, 58]])}${poly(BRASS.hi, [[12, 62], [34, 62], [30, 58], [16, 58]])}${poly(BRASS.deep, [[10, 62], [36, 62], [36, 68], [10, 68]])}`;
}

export default { key: "globe", label: "地球儀", at: "shelf", w: 46, h: 68, cat: "小物", order: 206, note: "", art } satisfies ItemDef;
