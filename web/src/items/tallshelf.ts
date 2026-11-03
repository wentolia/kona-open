// 背の高いレコード棚。実績「大きな棚」で届く。いまのライブラリの色が並ぶ。猫が上に乗る
import { poly, tone, box } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#6b4a30");
  let o = `${box(W, 4, 6, 96, 212, 8, -5)}${poly("#2a1d14", [[10, 12], [94, 12], [94, 212], [10, 212]])}`;
  for (let r = 0; r < 5; r++) {
    o += poly(W.mid, [[10, 50 + r * 40], [94, 50 + r * 40], [94, 54 + r * 40], [10, 54 + r * 40]]);
    for (let i = 0; i < 12; i++) o += `<g class="sp">${poly("#8a6b45", [[12 + i * 6.8, 18 + r * 40], [17.6 + i * 6.8, 18 + r * 40], [17.6 + i * 6.8, 50 + r * 40], [12 + i * 6.8, 50 + r * 40]])}</g>`;
  }
  return o + `<i data-cat-plat="perch" data-sink="1" style="left:6%;width:84%;top:1%"></i>`;
}

const live: Live = svg => { const sp = qa(svg, ".sp polygon"); let n = -1; return s => { const all = s.albums(); if (all.length === n) return; n = all.length; sp.forEach((p, i) => { const a = all[i % Math.max(1, all.length)]; if (a) { const c = s.colorOf(a); p.style.fill = c; p.style.stroke = c; } }); }; };

export default { key: "tallshelf", label: "背の高いレコード棚", at: "floor", w: 110, h: 220, cat: "音楽", order: 721, note: "実績「大きな棚」で届く。いまのライブラリの色が並ぶ。猫が上に乗る", art, live } satisfies ItemDef;
