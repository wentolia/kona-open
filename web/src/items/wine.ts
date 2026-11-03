// 赤ワインのボトルとグラス。グラスの中でワインがゆっくり揺れる
import { cylinder, poly, tone } from "./lowpoly";
import { q, type Live } from "./live";
import { sway } from "./_cafe";
import type { ItemDef } from "./types";

/** グラスの中のワイン（tilt で液面を傾ける） */
const wine = (tilt: number) => `${27.4 + Math.max(0, tilt) * .3},${36 + tilt} ${44.6 - Math.max(0, -tilt) * .3},${36 - tilt} 42,42 36,45.4 30,42`;

function art() {
  const B = tone("#2f4a32"), F = tone("#7a1e2a"), G = "rgba(210,230,235,.2)";
  return `${cylinder(B, 12, 26, 66, 8, 6, false)}${poly(B.mid, [[4, 26], [9.5, 17], [14.5, 17], [20, 26]])}${poly(B.hi, [[4, 26], [9.5, 17], [11, 17], [7, 26]])}
    ${cylinder(B, 12, 6, 18, 2.6, 4, false)}${cylinder(F, 12, 2, 10, 2.9, 4, false)}${poly(F.hi, [[9.1, 2], [14.9, 2], [14.5, 1], [9.5, 1]])}
    ${poly("#e9dfc8", [[4.4, 38], [19.6, 38], [19.6, 54], [4.4, 54]])}${poly("#d2c6aa", [[14, 38], [19.6, 38], [19.6, 54], [14, 54]])}
    ${poly(F.mid, [[7, 42], [17, 42], [17, 43.4], [7, 43.4]])}${poly("#8a7e66", [[8, 47], [16, 47], [16, 48], [8, 48]])}${poly("#8a7e66", [[9, 50], [15, 50], [15, 50.8], [9, 50.8]])}
    ${poly(G, [[28, 26], [44, 26], [45, 34], [42, 42], [36, 46], [30, 42], [27, 34]])}
    <polygon class="wine" fill="rgba(120,20,36,.85)" points="${wine(0)}"/>
    ${poly("rgba(255,255,255,.3)", [[28, 26], [44, 26], [43.9, 27], [28.1, 27]])}${poly("rgba(255,255,255,.2)", [[29, 29], [30.4, 29], [30, 40], [29, 39]])}
    ${poly("rgba(210,230,235,.42)", [[35.3, 46], [36.7, 46], [36.7, 63], [35.3, 63]])}${poly("rgba(210,230,235,.42)", [[29, 63], [43, 63], [45, 66], [27, 66]])}`;
}

const live: Live = svg => {
  const w = q(svg, ".wine")!;
  return s => w.setAttribute("points", wine(.6 * sway(s, .6)));
};

export default { key: "wine", label: "ワイン", at: "shelf", w: 48, h: 66, cat: "食べ物", order: 418, note: "ボトルとグラス。グラスの中でゆっくり揺れる", art, live } satisfies ItemDef;
