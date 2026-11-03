// 吊るしたシダ（壁）。籠の鉢から、細かい小葉の並ぶ葉が弓なりに垂れる
import { leaf, poly, tone, type Pt } from "./lowpoly";
import { cords, pot, stem } from "./_greens";
import type { ItemDef } from "./types";

/** 弓なりの葉: 付け根 → 頂 → 先 の 2 次曲線に沿って、左右に小葉を並べる */
function frond(p0: Pt, p1: Pt, p2: Pt, lit: boolean) {
  const at = (t: number): Pt => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
  const c = lit ? ["#7fb05e", "#5e8f47"] : ["#679a4e", "#4c7c3e"];
  let o = "";
  for (let i = 0; i < 12; i++) { const t0 = i / 12, a = at(t0), b = at(t0 + 1 / 12); o += stem("#5a7f3e", a[0], a[1], b[0], b[1], 1.2 - t0 * .7); }
  for (let i = 1; i < 18; i++) {
    const t = i / 18, a = at(t), b = at(Math.min(1, t + .02)), dir = Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180 / Math.PI, len = 8 * (1 - t * .7);
    o += leaf(c[0], c[1], a[0], a[1], len, 1.6, dir - 62) + leaf(c[1], c[0], a[0], a[1], len, 1.6, dir + 62);
  }
  return o;
}

function art() {
  const P = tone("#a8875c");
  let s = cords("#c9b89a", 60, 0, [[38, 64], [60, 66], [82, 64]]) + poly("#8a7a60", [[57, 0], [63, 0], [61, 4], [59, 4]]);
  const F: [Pt, Pt, Pt, boolean][] = [
    [[56, 64], [30, 40], [8, 92], true], [[64, 64], [92, 40], [112, 94], false], [[58, 64], [40, 52], [22, 118], false], [[62, 64], [82, 54], [98, 120], true],
    [[60, 64], [52, 50], [44, 132], true], [[60, 64], [70, 52], [74, 136], false], [[58, 66], [20, 60], [4, 70], false], [[62, 66], [100, 60], [116, 72], true],
  ];
  F.forEach(([a, b, c, l]) => { s += frond(a, b, c, l); });
  s += pot(P, 60, 64, 84, 22, 14, 3, "");
  for (let y = 70; y < 84; y += 4) s += poly(P.deep, [[60 - 21 + (y - 67) * .5, y], [60 + 21 - (y - 67) * .5, y], [60 + 21 - (y - 66) * .5, y + .8], [60 - 21 + (y - 66) * .5, y + .8]]);
  return s + frond([60, 66], [44, 70], [34, 140], true) + frond([60, 66], [76, 70], [86, 138], false);
}

export default { key: "fern", label: "吊るしたシダ", at: "wall", w: 120, h: 145, x: 0.82, y: 0.04, cat: "植物", order: 106, draft: true, note: "籠の鉢から細かい葉が弓なりに垂れる", art } satisfies ItemDef;
