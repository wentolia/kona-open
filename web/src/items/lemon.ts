// レモンの木（床）。まっすぐな幹に丸い茂み、黄色い実
import { ngon, poly, puff, tone, leaf } from "./lowpoly";
import { bush, pot, stem } from "./_greens";
import type { ItemDef } from "./types";

function art() {
  const P = tone("#e2ddd2"), B = ["#6f9c4f", "#5a8842", "#477236", "#38602e"], Y = tone("#e9c63a");
  let s = stem("#6e5a46", 50, 140, 50, 70, 4, 3) + stem("#6e5a46", 50, 92, 40, 74, 1.8, 1.2) + stem("#6e5a46", 50, 86, 62, 70, 1.8, 1.2);
  s += bush(B, 50, 52, 40, 34, 11, .2) + bush(B, 34, 58, 18, 15, 7) + bush(B, 64, 40, 20, 15, 7, .4);
  for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, r = i % 2 ? .95 : .78; s += leaf(i % 3 ? "#7aa858" : "#5f8d45", "#466f37", 50 + Math.cos(a) * 38 * r, 52 + Math.sin(a) * 32 * r, 8, 2.6, a * 180 / Math.PI + 90); }
  [[30, 60], [58, 74], [72, 50], [42, 36], [60, 30], [24, 44]].forEach(([x, y]) => {
    s += poly(Y.lo, [[x - 6.4, y], [x - 4.6, y - 1], [x - 4.6, y + 1]]) + poly(Y.lo, [[x + 6.4, y + .4], [x + 4.6, y - 1], [x + 4.6, y + 1.2]]) + puff(Y, ngon(x, y, 5, 10).map(([px, py]) => [px, y + (py - y) * .78] as [number, number]), [x - 1.4, y - 1.6]);
  });
  return s + pot(P, 50, 132, 170, 20, 15, 4);
}

export default { key: "lemon", label: "レモンの木", at: "floor", w: 100, h: 170, cat: "植物", order: 44, draft: true, note: "丸い茂みに黄色い実", art } satisfies ItemDef;
