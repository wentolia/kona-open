// カクテルグラス。オリーブを沈めたマティーニ。液面とオリーブがかすかに揺れる
import { ngon, poly } from "./lowpoly";
import { q, type Live } from "./live";
import { sway } from "./_cafe";
import type { ItemDef } from "./types";

const G = "rgba(210,230,235,.2)";
/** 液面の高さ y での、グラスの半分の幅 */
const hw = (y: number) => 1 + 12 * (20 - y) / 16;
const liq = (tilt: number) => `${15 - hw(7 + tilt)},${7 + tilt} ${15 + hw(7 - tilt)},${7 - tilt} 16,19.5 14,19.5`;

function art() {
  return `${poly(G, [[2, 4], [28, 4], [16, 20], [14, 20]])}
    <polygon class="liq" fill="rgba(228,214,160,.62)" points="${liq(0)}"/>
    ${poly("#c8a060", [[22, 0], [23, 0.4], [14, 15], [13.2, 14.6]])}
    <g class="olive">${poly("#6f8a3a", ngon(15, 13, 2.7, 7))}${poly("#8aa64a", [[13, 12], [15, 10.4], [15.2, 12.6]])}${poly("#c8323a", ngon(15.6, 12.6, .9, 5))}</g>
    ${poly("rgba(255,255,255,.35)", [[2, 4], [28, 4], [27.2, 5], [2.8, 5]])}${poly("rgba(255,255,255,.2)", [[4.5, 6], [6, 6], [13, 16], [12.6, 16.6]])}
    ${poly("rgba(210,230,235,.42)", [[14.3, 20], [15.7, 20], [15.7, 42], [14.3, 42]])}${poly("rgba(210,230,235,.42)", [[7, 42], [23, 42], [25, 45], [5, 45]])}`;
}

const live: Live = svg => {
  const l = q(svg, ".liq")!, o = q(svg, ".olive")!;
  return s => {
    l.setAttribute("points", liq(.35 * sway(s)));
    o.setAttribute("transform", `translate(0 ${(.4 * sway(s, .7, 1)).toFixed(2)})`);
  };
};

export default { key: "cocktail", label: "カクテルグラス", at: "shelf", w: 30, h: 45, cat: "食べ物", order: 416, draft: true, note: "オリーブのマティーニ。液面がかすかに揺れる", art, live } satisfies ItemDef;
