// 足あとのラグ。実績「猫の選曲家」で届く
import { poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const R = tone("#c9b8a0"), P = "#8a6a58";
  const paw = (x: number, y: number) => poly(P, ngon(x, y, 3, 7).map(([a, b]) => [a, y + (b - y) * .55] as [number, number])) + [-3.4, -1.2, 1.2, 3.4].map((d, i) => poly(P, ngon(x + d, y - 2.6 - (i % 3 ? .6 : 0), 1.1, 6).map(([a, b]) => [a, y - 2.8 + (b - y + 2.8) * .55] as [number, number]))).join("");
  return `${poly(R.lo, [[10, 6], [190, 6], [200, 34], [0, 34]])}${poly(R.mid, [[14, 8], [186, 8], [194, 31], [6, 31]])}
    ${[[30, 26], [48, 20], [70, 26], [90, 18], [112, 25], [132, 17], [154, 24], [172, 16]].map(([x, y]) => paw(x, y)).join("")}`;
}

export default { key: "pawrug", label: "足あとのラグ", at: "floor", w: 200, h: 0, flat: true, vh: 40, cat: "猫", order: 753, note: "実績「猫の選曲家」で届く", art } satisfies ItemDef;
