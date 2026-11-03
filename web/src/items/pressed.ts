// 押し花の額。実績「ひと月」で届く
import { poly, tone, ngon, bevel, leaf } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  return `${bevel(60, 76, 4, tone("#c9b8a0"))}${poly("#f1ead8", [[4, 4], [56, 4], [56, 72], [4, 72]])}
    ${poly("#6a7a4a", [[29, 66], [31, 66], [31, 20], [29, 20]])}${leaf("#7a8a5a", "#5a6a3a", 30, 50, 12, 4, -55)}${leaf("#7a8a5a", "#5a6a3a", 30, 40, 12, 4, 55)}
    ${[0, 1, 2, 3, 4].map(i => leaf("#c98d9a", "#a96d7a", 30, 20, 9, 4, i * 72)).join("")}${poly("#e8c46a", ngon(30, 20, 2.4, 6))}
    ${[0, 1, 2, 3, 4].map(i => leaf("#9a8ac0", "#7a6aa0", 18, 34, 6, 3, i * 72 + 20)).join("")}`;
}

export default { key: "pressed", label: "押し花の額", at: "wall", w: 60, h: 76, cat: "飾り", order: 747, note: "実績「ひと月」で届く", art } satisfies ItemDef;
