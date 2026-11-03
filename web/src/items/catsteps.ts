// 猫の階段。3 段の木の踏み台（上はカーペット、正面に丸い穴）。猫が段から段へ跳び移る
import { ngon, poly, slab, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#a07c56"), C = tone("#6f6a70");
  let s = "", plats = "";
  for (let k = 0; k < 3; k++) {
    const x0 = k * 50, x1 = x0 + 50, y = 64 - k * 28;
    s += slab(W.mid, W.lo, [x0, y + 5, x1, 92]);
    s += poly(C.hi, [[x0 + 3, y - 4], [x1 + 3, y - 4], [x1, y], [x0, y]]) + poly(C.mid, [[x0, y], [x1, y], [x1, y + 5], [x0, y + 5]]);
    if (k) s += poly(W.deep, ngon(x0 + 25, y + 30, 10, 10, .3)) + poly(W.lo, ngon(x0 + 26.5, y + 31.5, 7, 10, .3));
    plats += `<i data-cat-plat="perch" data-sink="1" style="left:${(k * 33.3 + 1).toFixed(1)}%;width:31%;top:${((y - 2) / 92 * 100).toFixed(1)}%"></i>`;
  }
  return `${s}${poly(W.deep, [[0, 91], [150, 91], [150, 92], [0, 92]])}${plats}`;
}

export default { key: "catsteps", label: "猫の階段", at: "floor", w: 150, h: 92, x: .8, cat: "猫", order: 44, note: "3 段の踏み台。猫が段から段へ跳び移る", art } satisfies ItemDef;
