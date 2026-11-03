// チーズの盛り合わせ。木の板に、穴あきのチーズ・白かびのチーズ・ぶどう
import { box, ngon, poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#8a6440"), Y = tone("#e6b84a"), B = tone("#efe8d8"), V = tone("#6a3a5a");
  const grapes: [number, number, number][] = [[44, 13, 0], [48, 13, 1], [42, 16.5, 1], [46, 16.5, 0], [50, 16.5, 2], [44, 20, 2], [48, 20, 0]];
  return `${poly(W.mid, [[0, 22], [7, 22], [7, 25], [0, 25]])}${poly(W.deep, ngon(2.5, 23.5, .8, 5))}${box(W, 6, 22, 46, 5, 4, -3)}
    ${poly(Y.hi, [[9, 20.5], [26, 11], [30, 9], [14, 18.5]])}${poly(Y.mid, [[9, 20.5], [26, 20.5], [26, 11]])}${poly(Y.lo, [[26, 11], [30, 9], [30, 18.5], [26, 20.5]])}
    ${poly(Y.deep, ngon(20, 17.5, 1.3, 6))}${poly(Y.deep, ngon(23.4, 15, .9, 6))}${poly(Y.deep, ngon(15.5, 19.4, .7, 5))}
    ${poly(B.mid, [[30, 20.5], [40, 20.5], [38.5, 14], [31.5, 14]])}${poly("#f3e4b6", [[31.8, 20.5], [38.2, 20.5], [37, 15.6], [33, 15.6]])}${poly(B.hi, [[31.5, 14], [38.5, 14], [37.5, 12.6], [32.5, 12.6]])}
    ${poly("#5f7a33", [[45.5, 12], [46.5, 12], [47.5, 8], [46.8, 8]])}
    ${grapes.map(([x, y, i]) => poly([V.hi, V.mid, V.lo][i], ngon(x, y, 2.3, 7))).join("")}`;
}

export default { key: "cheese", label: "チーズの盛り合わせ", at: "shelf", w: 56, h: 27, cat: "食べ物", order: 420, note: "穴あきのチーズ・白かびのチーズ・ぶどうを木の板に", art } satisfies ItemDef;
