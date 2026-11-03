// フロアランプ。押すと点く（部屋の明かりとの連動は予定）
import { poly, tone, BRASS } from "./lowpoly";
import { lamp, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const L = tone("#e6d2a4");
  return `${poly(BRASS.deep, [[34, 60], [38, 60], [38, 222], [34, 222]])}${poly(BRASS.mid, [[33, 60], [35, 60], [35, 222], [33, 222]])}
    ${poly(BRASS.lo, [[16, 232], [36, 222], [56, 232]])}${poly(BRASS.hi, [[16, 232], [36, 222], [36, 232]])}
    ${poly(L.hi, [[22, 6], [50, 6], [64, 60], [8, 60]])}${poly(L.lo, [[36, 6], [50, 6], [64, 60], [36, 60]])}
    <g class="bulb">${poly("#fff1c8", [[10, 60], [62, 60], [58, 64], [14, 64]])}</g>${poly(BRASS.lo, [[20, 4], [52, 4], [52, 7], [20, 7]])}`;
}

const live: Live = svg => lamp(svg, "floorlamp", 14);

export default { key: "floorlamp", label: "フロアランプ", at: "floor", w: 72, h: 232, cat: "灯り", order: 36, note: "押すと点く（部屋の明かりとの連動は予定）", art, live } satisfies ItemDef;
