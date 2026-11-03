// 梨。鳥取で。青い梨をふたつ
import { poly, ngon } from "./lowpoly";
import { fruit, stem } from "./_land";
import type { ItemDef } from "./types";

function art() {

  return `${fruit("#b8b860", 14, 22, 11, 10.4, 10)}${stem(14, 12, 30)}${fruit("#a8aa54", 33, 24, 10, 9.6, 10)}${stem(33, 14.6, 150)}
    ${[[10, 20], [17, 26], [12, 28], [30, 22], [36, 28]].map(([x, y]) => poly("#8a8a40", ngon(x, y, .7, 4))).join("")}`;
}

export default { key: "nashi", label: "梨", at: "shelf", w: 46, h: 36, cat: "食べ物", order: 634, region: "JP-31", note: "鳥取で。青い梨をふたつ", art } satisfies ItemDef;
