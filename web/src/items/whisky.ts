// ウイスキーのロック。琥珀色に、大きな氷がひとつ浮かんでゆらりと揺れる
import { poly } from "./lowpoly";
import { q, type Live } from "./live";
import { sway } from "./_cafe";
import type { ItemDef } from "./types";

function art() {
  const G = "rgba(210,230,235,.18)";
  return `${poly(G, [[3, 6], [29, 6], [28, 30], [4, 30]])}
    ${poly("rgba(184,115,42,.85)", [[3.5, 15], [28.5, 15], [28.1, 26], [3.9, 26]])}${poly("rgba(214,150,70,.8)", [[3.5, 15], [9, 15], [8.6, 26], [3.9, 26]])}
    ${poly("rgba(150,85,30,.85)", [[22, 15], [28.5, 15], [28.1, 26], [22, 26]])}
    <g class="ice">${poly("rgba(236,244,248,.5)", [[9, 11], [17, 9], [22, 12], [14, 14]])}${poly("rgba(220,234,240,.42)", [[9, 11], [14, 14], [14, 22], [9, 19]])}
      ${poly("rgba(200,220,230,.36)", [[14, 14], [22, 12], [22, 20], [14, 22]])}${poly("rgba(255,255,255,.4)", [[10, 11.4], [14, 10.3], [15, 11]])}</g>
    ${poly("rgba(214,150,70,.35)", [[3.5, 15], [28.5, 15], [28.4, 16], [3.6, 16]])}
    ${poly("rgba(210,230,235,.34)", [[3.9, 26], [28.1, 26], [28, 30], [4, 30]])}
    ${poly("rgba(255,255,255,.32)", [[3, 6], [29, 6], [28.9, 7], [3.1, 7]])}${poly("rgba(255,255,255,.18)", [[5, 8], [6.6, 8], [6.3, 28], [5, 28]])}`;
}

const live: Live = svg => {
  const ice = q(svg, ".ice")!;
  return s => ice.setAttribute("transform", `translate(${(.5 * sway(s, .6)).toFixed(2)} ${(.45 * sway(s, .9, 2)).toFixed(2)}) rotate(${(2.5 * sway(s, .5, 1)).toFixed(2)} 15 16)`);
};

export default { key: "whisky", label: "ウイスキーのロック", at: "shelf", w: 32, h: 30, cat: "食べ物", order: 417, draft: true, note: "大きな氷がゆらりと揺れる", art, live } satisfies ItemDef;
