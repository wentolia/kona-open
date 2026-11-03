// 扇子。京都で。開いて台に立てる
import { poly, tone, WOOD } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const cx = 32, cy = 36, R = 30, r = 10, n = 9, Pp = tone("#c7a0a8"), Gd = "#d8b46a";
  let o = "";
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI * (1.08 + .84 * i / n), a1 = Math.PI * (1.08 + .84 * (i + 1) / n), am = (a0 + a1) / 2;
    const p = (a: number, rr: number) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as [number, number];
    o += poly(i % 2 ? Pp.mid : Pp.hi, [p(a0, r), p(a0, R), p(am, R + .6), p(am, r)]) + poly(i % 2 ? Pp.lo : Pp.mid, [p(am, r), p(am, R + .6), p(a1, R), p(a1, r)]);
    if (i === 3 || i === 4 || i === 5) o += poly(Gd, [p(am - .05, R * .7), p(am, R * .82), p(am + .05, R * .7), p(am, R * .6)]);
  }
  return `${o}${poly(WOOD.mid, [[cx - 1.2, cy - 2], [cx + 1.2, cy - 2], [cx + 1, cy + 2], [cx - 1, cy + 2]])}
    ${poly(WOOD.hi, [[18, 36], [46, 36], [44, 38], [20, 38]])}${poly(WOOD.lo, [[20, 38], [44, 38], [46, 40], [18, 40]])}`;
}

export default { key: "sensu", label: "扇子", at: "shelf", w: 64, h: 40, cat: "飾り", order: 608, region: "JP-26", note: "京都で。開いて台に立てる", art } satisfies ItemDef;
