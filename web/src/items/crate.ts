// レコードの木箱。★ 差したジャケットの色が自分のアルバムの色になる。猫がレコードの間に入る
import { box, poly, tone } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#a0784e"), cols = ["#2c4a6e", "#d9b25a", "#b24a3b", "#3d6b55", "#e0d7c2", "#6b3d64", "#c77a3a"];
  let s = "";
  cols.forEach((c, i) => { const x = 10 + i * 10, y = 4 + (i % 3) * 3, t = (i - 3) * 1.5; s += `<g class="jk">${poly(c, [[x + t, y], [x + 22 + t, y], [x + 22, 40], [x, 40]])}</g>`; });
  return `${s}${box(W, 4, 30, 88, 34, 6, -5)}${poly(W.lo, [[8, 40], [88, 40], [88, 43], [8, 43]])}${poly(W.lo, [[8, 52], [88, 52], [88, 55], [8, 55]])}
    ${poly(W.deep, [[38, 44], [54, 44], [54, 49], [38, 49]])}
    <i data-cat-plat="box" data-sink="18" style="left:10%;width:80%;top:40%"></i>`;
}

const live: Live = svg => {
  const jk = qa(svg, ".jk > polygon");
  let n = -1;
  return s => {
    const al = s.albums();
    if (al.length === n) return;
    n = al.length;
    if (n) jk.forEach((p, i) => { const c = s.colorOf(al[(al.length - 1 - i % n + n) % n]); p.style.fill = c; p.style.stroke = c; });
  };
};

export default { key: "crate", label: "レコードの木箱", at: "floor", w: 98, h: 64, cat: "音楽", order: 38, note: "★ 差したジャケットの色が自分のアルバムの色になる。猫がレコードの間に入って顔を出す", art, live } satisfies ItemDef;
