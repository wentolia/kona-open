// シャンデリア。実績「にぎやかな部屋」で届く。押すと灯る
import { poly, ngon, puff, BRASS } from "./lowpoly";
import { lamp, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${poly(BRASS.lo, [[54, 0], [56, 0], [56, 40], [54, 40]])}${puff(BRASS, ngon(55, 46, 8, 10), [52, 43])}
    ${poly(BRASS.mid, [[10, 60], [100, 60], [96, 64], [14, 64]])}${poly(BRASS.lo, [[30, 70], [80, 70], [78, 73], [32, 73]])}
    ${[14, 34, 55, 76, 96].map((x, i) => poly(BRASS.hi, [[x - 3, 56], [x + 3, 56], [x + 2, 60], [x - 2, 60]]) + poly("#efe6d2", [[x - 1.5, 46], [x + 1.5, 46], [x + 1.5, 56], [x - 1.5, 56]]) + `<g class="bulb">${poly("#f6c66a", [[x, 38 - (i % 2) * 2], [x + 2.4, 43], [x, 46], [x - 2.4, 43]])}</g>`).join("")}
    ${[22, 44, 66, 88].map(x => poly("rgba(220,235,245,.7)", [[x, 64], [x + 2.5, 70], [x, 78], [x - 2.5, 70]])).join("")}
    ${poly("rgba(220,235,245,.7)", [[55, 74], [58, 84], [55, 96], [52, 84]])}`;
}

const live: Live = svg => lamp(svg, "chandelier", 14);

export default { key: "chandelier", label: "シャンデリア", at: "wall", w: 110, h: 100, cat: "灯り", order: 772, note: "実績「にぎやかな部屋」で届く。押すと灯る", art, live } satisfies ItemDef;
