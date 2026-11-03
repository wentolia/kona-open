// 雪だるまの置物。冬
import { poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const S = tone("#e8ecef");
  const ball = (cx: number, cy: number, r: number) => { const g = ngon(cx, cy, r, 12); let o = ""; for (let k = 0; k < 12; k++) { const t = Math.sin(k / 12 * Math.PI * 2 + 2.4); o += poly(t > .3 ? S.hi : t > -.3 ? S.mid : S.lo, [[cx, cy], g[k], g[(k + 1) % 12]]); } return o; };
  return `${ball(21, 42, 16)}${ball(21, 18, 11)}${poly("#b04a3b", [[10, 26], [32, 26], [32, 30], [10, 30]])}${poly("#b04a3b", [[26, 30], [31, 30], [30, 40], [27, 40]])}
    ${poly("#2c2a28", [[16, 15], [18, 15], [18, 17], [16, 17]])}${poly("#2c2a28", [[24, 15], [26, 15], [26, 17], [24, 17]])}${poly("#e07a2e", [[20, 19], [23, 19], [28, 21], [21, 21]])}
    ${poly("#2c2a28", [[12, 8], [30, 8], [28, 6], [27, 0], [15, 0], [14, 6]])}`;
}

export default { key: "snowman", label: "雪だるまの置物", at: "shelf", w: 42, h: 58, cat: "季節", order: 302, note: "冬", art } satisfies ItemDef;
