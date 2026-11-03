// バーのランプ。琥珀色のガラスの笠に真鍮の脚。押すと点く
import { poly, puff, tone, BRASS } from "./lowpoly";
import { lamp, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const A = tone("#a95c26");
  return `${poly(BRASS.mid, [[17, 21], [19, 21], [19, 38], [17, 38]])}${poly(BRASS.hi, [[17, 21], [17.8, 21], [17.8, 38], [17, 38]])}
    ${puff(BRASS, [[8, 44], [10, 40], [18, 37], [26, 40], [28, 44]], [16, 40])}
    ${puff(A, [[2, 20], [5, 12], [11, 7], [18, 5.5], [25, 7], [31, 12], [34, 20]], [13, 11])}${poly(BRASS.lo, [[16.5, 3], [19.5, 3], [19.5, 6], [16.5, 6]])}
    <g class="bulb">${poly("#f3c27a", [[3, 20], [33, 20], [30, 22.4], [6, 22.4]])}${poly("#f8dca8", [[14, 20], [22, 20], [21, 22.4], [15, 22.4]])}</g>`;
}

const live: Live = svg => lamp(svg, "barlamp", 10);

export default { key: "barlamp", label: "バーのランプ", at: "shelf", w: 36, h: 44, cat: "灯り", order: 116, note: "琥珀色のガラスの笠。押すと点く", art, live } satisfies ItemDef;
