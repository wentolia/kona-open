// 低い本棚。上に小物、猫が上で寝る
import { poly, slab, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#765338"), cols = ["#7a3b34", "#2f4f6b", "#4a6b3a", "#6b4f2a", "#583a63", "#2e5e5a", "#a07a3a", "#3e3e52"];
  let books = "";
  for (const [row, y] of [[0, 14], [1, 52]] as const) {
    let x = 12;
    for (let i = 0; x < 160; i++) {
      const w = 6 + (i * 7 + row * 3) % 6, h = 28 + (i * 5 + row) % 8, c = cols[(i + row * 3) % cols.length];
      if ((i + row) % 9 === 6) { x += 14; continue; }
      books += poly(c, [[x, y + 34 - h], [x + w, y + 34 - h], [x + w, y + 34], [x, y + 34]]) + poly("rgba(255,255,255,.12)", [[x, y + 34 - h], [x + 1.4, y + 34 - h], [x + 1.4, y + 34], [x, y + 34]]);
      x += w + .8;
    }
  }
  return `${slab(T.lo, T.deep, [4, 6, 176, 92])}${poly("#1d1714", [[10, 12], [170, 12], [170, 48], [10, 48]])}${poly("#1d1714", [[10, 52], [170, 52], [170, 86], [10, 86]])}
    ${books}
    ${poly(T.hi, [[2, 2], [178, 2], [178, 8], [2, 8]])}${poly(T.mid, [[10, 48], [170, 48], [170, 52], [10, 52]])}
    ${poly(T.mid, [[4, 8], [10, 12], [10, 88], [4, 92]])}${poly(T.lo, [[176, 8], [170, 12], [170, 88], [176, 92]])}
    <i data-cat-plat="bed" data-sink="1" style="left:4%;width:92%;top:2%"></i>`;
}

export default { key: "lowshelf", label: "低い本棚", at: "floor", w: 180, h: 92, cat: "家具", order: 33, note: "上に小物、猫が上で寝る", art } satisfies ItemDef;
