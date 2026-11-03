// 真鍮の燭台。実績「五十時間」で届く。押すと灯る
import { poly, tone, cylinder, ngon, BRASS } from "./lowpoly";
import { lamp, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${poly(BRASS.lo, ngon(17, 61, 13, 10).map(([x, y]) => [x, 61 + (y - 61) * .25] as [number, number]))}
    ${cylinder(BRASS, 17, 30, 59, 3, 4, false)}${poly(BRASS.hi, [[8, 28], [26, 28], [22, 32], [12, 32]])}
    ${cylinder(tone("#efe6d2"), 17, 12, 28, 4.5, 5)}
    <g class="bulb">${poly("#f6c66a", [[17, 1], [20, 7], [17, 11], [14, 7]])}${poly("#fff1c4", [[17, 5], [18.5, 8], [17, 10], [15.5, 8]])}</g>`;
}

const live: Live = svg => lamp(svg, "candlestick", 9);

export default { key: "candlestick", label: "真鍮の燭台", at: "shelf", w: 34, h: 64, cat: "灯り", order: 702, note: "実績「五十時間」で届く。押すと灯る", art, live } satisfies ItemDef;
