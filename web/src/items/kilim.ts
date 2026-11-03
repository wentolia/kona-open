// キリム: 奥へ向かって少し細くなる長方形。赤の地に菱形を 5 つ、手前に房
import { poly, type Pt, type Pal } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const R: Pal = { hi: "#b4503a", mid: "#a1452f", lo: "#8a3a27", deep: "#6a2b1e" };
  const at = (u: number, v: number): Pt => { const y = 2 + 36 * v, inset = 22 * (1 - v); return [inset + (280 - 2 * inset) * u, y]; };
  const quad = (u0: number, v0: number, u1: number, v1: number) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  let s = poly("#e2cfa8", quad(0, 0, 1, 1)) + poly(R.deep, quad(.02, .1, .98, .9));
  // 地: 細長い三角の面で、わずかに濃淡
  for (let i = 0; i < 8; i++) {
    const u0 = .03 + i * .94 / 8, u1 = u0 + .94 / 8, c = [R.hi, R.mid, R.lo, R.mid][i % 4];
    s += poly(c, [at(u0, .16), at(u1, .16), at(u0, .84)]) + poly(i % 2 ? R.mid : R.lo, [at(u1, .16), at(u1, .84), at(u0, .84)]);
  }
  for (let i = 0; i < 5; i++) {
    const u = .14 + i * .18, w = .06, c = i % 2 ? "#d0953e" : "#2d3f5c";
    s += poly(c, [at(u, .2), at(u + w, .5), at(u, .8), at(u - w, .5)]);
    s += poly("#e7d5b1", [at(u, .38), at(u + w * .4, .5), at(u, .62), at(u - w * .4, .5)]);
  }
  for (let i = 0; i <= 34; i++) { const [x] = at(i / 34, 1); s += poly("#d9c6a0", [[x - .7, 38], [x + .7, 38], [x + .4, 40], [x - .4, 40]]); }
  return s;
}

export default { key: "kilim", label: "キリム", at: "floor", w: 280, h: 0, flat: true, vh: 40, x: 0.5, cat: "敷きもの", order: 20, art } satisfies ItemDef;
