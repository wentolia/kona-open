// レコード棚。★ 背の色が自分のアルバムのジャケットの色になる
import { poly, slab, tone } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#5d4a3a"), cols = ["#b24a3b", "#2c4a6e", "#d9b25a", "#3d6b55", "#e0d7c2", "#6b3d64", "#1f2a33", "#c77a3a", "#7c8f9a"];
  let s = `${slab(T.lo, T.deep, [2, 4, 158, 100])}`;
  for (const [x0, x1] of [[8, 78], [82, 152]]) for (const [y0, y1] of [[10, 52], [56, 96]]) {
    s += poly("#18130f", [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    for (let x = x0 + 1, i = 0; x < x1 - 2; x += 2.4, i++) { const c = cols[(i * 7 + x0 + y0) % cols.length]; s += `<g class="sp">${poly(c, [[x, y0 + 3 + (i % 3)], [x + 2, y0 + 3 + (i % 3)], [x + 2, y1], [x, y1]])}</g>`; }
  }
  return s + `${poly(T.hi, [[0, 0], [160, 0], [160, 5], [0, 5]])}${poly(T.mid, [[8, 52], [152, 52], [152, 56], [8, 56]])}${poly(T.mid, [[78, 5], [82, 5], [82, 100], [78, 100]])}
    <i data-cat-plat="perch" data-sink="1" style="left:3%;width:94%;top:1%"></i>`;
}

const live: Live = svg => {
  const sp = qa(svg, ".sp > polygon");
  let n = -1;
  return s => {
    const al = s.albums();
    if (al.length === n) return;
    n = al.length;
    if (!n) return;
    // 並びは毎回同じ（アルバムの順のまま、棚の数より少なければくり返す）
    sp.forEach((p, i) => { const c = s.colorOf(al[i % n]); p.style.fill = c; p.style.stroke = c; });
  };
};

export default { key: "recordshelf", label: "レコード棚", at: "floor", w: 160, h: 100, cat: "音楽", order: 34, note: "★ 背の色が自分のアルバムのジャケットの色になる", art, live } satisfies ItemDef;
