// オリーブ（床）。細くねじれた幹と、銀色がかった細い葉。実がいくつか
import { ngon, poly, tone } from "./lowpoly";
import { bush, pot, stem } from "./_greens";
import { leaf } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const P = tone("#b0684a"), T = "#7a6a58", B = ["#a9b394", "#8c9a78", "#6f7f60", "#56664c"];
  let s = stem(T, 64, 172, 58, 120, 5, 4) + stem(T, 58, 122, 66, 84, 4, 3) + stem(T, 66, 86, 56, 54, 3, 2) + stem(T, 62, 98, 86, 70, 2.2, 1.2) + stem(T, 60, 110, 36, 82, 2.2, 1.2);
  s += bush(B.slice(1).concat(B[3]), 60, 50, 17, 11, 9, .3) + bush(B.slice(1).concat(B[3]), 88, 66, 11, 8, 7, .5) + bush(B.slice(1).concat(B[3]), 34, 78, 11, 8, 7, .1);
  // 細い葉を茂みの縁に散らす（銀の裏と緑の表）
  const seeds: [number, number, number, number][] = [[60, 50, 26, 18], [88, 66, 18, 13], [34, 78, 18, 13]];
  let n = 0;
  seeds.forEach(([cx, cy, rx, ry]) => { for (let i = 0; i < 40; i++) {
    const a = i * 2.39996 + n * .37, r = .35 + .6 * ((i * 7) % 10) / 10, x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r, d = Math.atan2(Math.sin(a), Math.cos(a)) * 180 / Math.PI + 90 + (i % 3 - 1) * 14;
    s += leaf(i % 2 ? "#b8c1a3" : "#7f8e6c", i % 2 ? "#95a283" : "#66765a", x, y, 9 + (i % 3) * 1.5, 1.3, d); n++;
  } });
  [[52, 60], [70, 56], [92, 72], [38, 84], [64, 42]].forEach(([x, y]) => { s += poly("#3a3044", ngon(x, y, 2.4, 7)) + poly("#5a4e66", ngon(x - .7, y - .7, .8, 5)); });
  return s + pot(P, 64, 168, 210, 22, 16, 6);
}

export default { key: "olive", label: "オリーブ", at: "floor", w: 120, h: 210, cat: "植物", order: 42, draft: true, note: "銀色がかった細い葉と小さな実", art } satisfies ItemDef;
