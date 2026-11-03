// 細長いランナー: 藍の地に、小さな段の菱と十字を交互に。両端に房
import { poly } from "./lowpoly";
import { trap, cell, cell2, diamond } from "./_rug";
import type { ItemDef } from "./types";

function art() {
  const at = trap(10, 360, 11, 31, 5);
  let s = cell(at, "#d8c6a0", 0, 0, 1, 1) + cell(at, "#8d3f2f", .012, .1, .988, .9);
  s += cell(at, "#2f4560", .02, .2, .98, .8);
  for (let i = 0; i < 20; i++) s += cell2(at, "#34506e", "#2a3e56", .02 + i * .048, .2, .02 + (i + 1) * .048, .8);
  for (let i = 0; i < 9; i++) {
    const u = .07 + i * .107;
    if (i % 2) {
      s += cell(at, "#e2d2ad", u - .006, .3, u + .006, .7) + cell(at, "#e2d2ad", u - .025, .45, u + .025, .55);
      s += cell(at, "#c58b4a", u - .006, .45, u + .006, .55);
    } else {
      s += diamond(at, "#c58b4a", u, .5, .03, .27) + diamond(at, "#2f4560", u, .5, .018, .16) + diamond(at, "#e2d2ad", u, .5, .007, .07);
    }
  }
  // 両端の房
  for (let j = 0; j <= 10; j++) {
    const v = .08 + j * .084;
    for (const [u, dx] of [[0, -6], [1, 6]] as const) {
      const [x, y] = at(u, v);
      s += poly("#d3c09a", [[x, y - .5], [x, y + .5], [x + dx, y + .3], [x + dx, y - .3]]);
    }
  }
  return s;
}

export default { key: "runner", label: "細長いランナー", at: "floor", w: 380, h: 0, flat: true, vh: 40, x: 0.5, cat: "敷きもの", order: 23.5, note: "廊下に敷く細長い織物。猫が端から端まで歩く", art } satisfies ItemDef;
