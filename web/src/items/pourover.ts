// ハンドドリップ。陶器のドリッパーとガラスのサーバー。ぽたぽたと落ちて、湯気が立つ
import { poly, tone } from "./lowpoly";
import { q, wisps, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const D = tone("#e6e0d6"), W = tone("#7a5638");
  return `${poly("rgba(190,215,220,.2)", [[6, 34], [30, 34], [33, 46], [31, 57], [5, 57], [3, 46]])}
    ${poly("#3e2416", [[3.6, 47], [32.4, 47], [31, 56.6], [5, 56.6]])}${poly("#5a3622", [[3.6, 47], [32.4, 47], [32, 48.5], [4, 48.5]])}
    ${poly("rgba(255,255,255,.22)", [[6, 36], [8, 36], [7, 55], [6, 55]])}
    <polygon class="drop" fill="#3e2416" points="-0.8,0 0,-1.8 0.8,0 0,1"/>
    ${poly(W.mid, [[8, 31], [28, 31], [29, 35], [7, 35]])}${poly(W.hi, [[8, 31], [28, 31], [28, 32], [8, 32]])}
    ${poly(D.lo, [[9, 27], [27, 27], [27, 31], [9, 31]])}
    ${poly(D.hi, [[2, 12], [18, 12], [18, 28], [12, 28]])}${poly(D.lo, [[18, 12], [34, 12], [24, 28], [18, 28]])}
    ${poly("#efe6d4", [[7, 11], [29, 11], [26, 5], [10, 5]])}${poly("#d9cdb6", [[18, 5], [26, 5], [29, 11], [18, 11]])}
    ${poly(D.mid, [[1, 10], [35, 10], [34, 13], [2, 13]])}${poly(D.deep, [[34, 13], [38, 15], [36, 22], [31, 17]])}`;
}

const live: Live = svg => {
  const drop = q(svg, ".drop")!, steam = wisps(svg, 18, 4, 2);
  return s => {
    const per = s.calm ? 3 : 1.4, k = (s.t % per) / per, y = 31 + 16 * k * k;
    drop.setAttribute("transform", `translate(18 ${y.toFixed(2)})`);
    drop.setAttribute("opacity", k < .92 ? "1" : "0");
    steam(s, .45);
  };
};

export default { key: "pourover", label: "ハンドドリップ", at: "shelf", w: 40, h: 57, cat: "食べ物", order: 411, note: "ドリッパーからぽたぽた落ちる。湯気が立つ", art, live } satisfies ItemDef;
