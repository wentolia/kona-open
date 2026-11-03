// クロワッサン。フランスで。三日月に巻いた層
import { poly, tone, type Pt } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#c8843a"), G = tone("#e2aa5c");
  // 三日月: 弧に沿って 7 つの巻き。真ん中が太く、両端は細く内へ巻く。少し傾けて紙の上に
  const N = 7, at = (t: number): Pt => [27 + Math.sin(t * 1.5) * 20, 30 - Math.cos(t * 1.5) * 18];
  const thick = (t: number) => 15 * Math.pow(1 - Math.abs(t), .8) + 2.4;
  let o = "";
  for (let i = 0; i < N; i++) {
    const t0 = -1 + 2 * i / N, t1 = -1 + 2 * (i + 1) / N, tm = (t0 + t1) / 2;
    const n = (t: number) => { const a = t * 1.5; return [Math.sin(a), -Math.cos(a)] as Pt; };   // 外向き
    const pt = (t: number, k: number): Pt => { const [x, y] = at(t), [nx, ny] = n(t), h = thick(t); return [x + nx * h * k, y + ny * h * k]; };
    const P = i % 2 ? C : G;
    o += poly(P.hi, [pt(t0, .5), pt(tm, .62), pt(t1, .5), pt(t1, 0), pt(tm, 0), pt(t0, 0)]) +
      poly(P.lo, [pt(t0, 0), pt(tm, 0), pt(t1, 0), pt(t1, -.5), pt(tm, -.55), pt(t0, -.5)]);
    if (i) o += poly(C.deep, [pt(t0, .5), pt(t0 + .03, .5), pt(t0 + .03, -.5), pt(t0, -.5)]);
  }
  return `${poly("#e8e0cc", [[2, 34], [50, 32], [54, 38], [6, 40]])}${poly("#d8ccb0", [[6, 40], [54, 38], [53, 39], [7, 41]])}
    <g transform="translate(0 7) rotate(-8 27 24)">${o}</g>`;
}

export default { key: "croissant", label: "クロワッサン", at: "shelf", w: 56, h: 42, cat: "食べ物", order: 668, region: "FR", note: "フランスで。三日月に巻いた層", art } satisfies ItemDef;
