// フィドルリーフフィグ（床）。まっすぐな幹に、バイオリンの形の大きな葉
import { tone } from "./lowpoly";
import { blade, pot, stem } from "./_greens";
import type { ItemDef } from "./types";

// 付け根は細く、先の方で広がって丸く終わり、くびれがある
const f = (t: number) => t >= 1 ? 0 : Math.min(1, Math.pow(Math.sin(Math.PI * Math.pow(t, 2.2)), .6) * 1.05) * (1 - .14 * Math.exp(-Math.pow((t - .45) / .08, 2))) * (t < .08 ? .5 + t / .08 * .5 : 1);

function art() {
  const P = tone("#b9a68a"), C = ["#4f7d44", "#44723c", "#355f33", "#2f552e"], D = ["#5c8c4e", "#507f45", "#3f6a39", "#365f33"];
  let s = stem("#6a5240", 60, 196, 58, 40, 6, 3.4) + stem("#6a5240", 59, 110, 76, 80, 2.4, 1.4);
  const L: [number, number, number, number][] = [
    [58, 40, 34, -6], [58, 46, 34, -62], [59, 50, 34, 58], [58, 64, 36, -100], [59, 68, 35, 96], [58, 82, 34, -38], [60, 88, 32, 30],
    [76, 80, 30, 36], [75, 82, 28, 86], [58, 102, 32, -80], [59, 114, 30, 70], [58, 130, 28, -56],
  ];
  L.forEach(([x, y, len, d], i) => { s += blade(i % 3 ? C : D, x, y, len, len * .42, d, f, 3); });
  return s + pot(P, 60, 170, 210, 22, 17, 0);
}

export default { key: "ficus", label: "フィドルリーフフィグ", at: "floor", w: 120, h: 210, cat: "植物", order: 41, note: "バイオリンの形の大きな葉", art } satisfies ItemDef;
