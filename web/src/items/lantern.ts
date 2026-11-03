// ランタン。実績「夜明け前」で届く。押すと灯る
import { poly, tone } from "./lowpoly";
import { lamp, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const M = tone("#3f4a46");
  return `${poly(M.mid, [[12, 0], [22, 0], [22, 3], [12, 3]])}${poly(M.lo, [[14, 3], [20, 3], [20, 8], [14, 8]])}
    ${poly(M.hi, [[4, 8], [30, 8], [26, 14], [8, 14]])}
    <g class="bulb">${poly("#f6d48a", [[8, 14], [26, 14], [26, 46], [8, 46]])}${poly("#fff1c4", [[14, 24], [20, 24], [19, 38], [15, 38]])}</g>
    ${poly(M.mid, [[6, 14], [9, 14], [9, 46], [6, 46]])}${poly(M.deep, [[25, 14], [28, 14], [28, 46], [25, 46]])}${poly(M.lo, [[16, 14], [18, 14], [18, 46], [16, 46]])}
    ${poly(M.lo, [[2, 46], [32, 46], [32, 52], [2, 52]])}${poly(M.deep, [[4, 52], [30, 52], [28, 56], [6, 56]])}`;
}

const live: Live = svg => lamp(svg, "lantern", 10);

export default { key: "lantern", label: "ランタン", at: "shelf", w: 34, h: 56, cat: "灯り", order: 730, note: "実績「夜明け前」で届く。押すと灯る", art, live } satisfies ItemDef;
