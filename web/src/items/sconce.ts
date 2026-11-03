// 壁のランプ 44×48: 壁の座金と腕、布のかさ
import { poly, BRASS } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  return `${poly(BRASS.lo, [[3, 30], [9, 27], [9, 47], [3, 44]])}${poly(BRASS.mid, [[9, 36], [24, 30], [25, 33], [9, 39]])}
    ${poly(BRASS.deep, [[22, 30], [26, 30], [26, 22], [22, 22]])}
    ${poly("#e8d3a6", [[13, 4], [35, 4], [41, 26], [7, 26]])}${poly("#c9b281", [[24, 4], [35, 4], [41, 26], [24, 26]])}
    ${poly("#f6e2b0", [[9, 26], [39, 26], [37, 29], [11, 29]])}`;
}

export default { key: "sconce", label: "壁のランプ", at: "wall", w: 44, h: 48, x: 0.7, y: 0.2, cat: "灯り", order: 103, art } satisfies ItemDef;
