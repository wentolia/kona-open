// チャイのグラス。インドで。小さなグラスをふたつ
import { poly } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const glass = (x: number, h: number) => poly("rgba(220,220,220,.35)", [[x, 34 - h], [x + 12, 34 - h], [x + 10, 34], [x + 2, 34]]) +
    poly("#c8925a", [[x + .8, 34 - h + 3], [x + 11.2, 34 - h + 3], [x + 9.6, 33], [x + 2.4, 33]]) + poly("#e0b880", [[x + .8, 34 - h + 3], [x + 11.2, 34 - h + 3], [x + 11, 34 - h + 4.4], [x + 1, 34 - h + 4.4]]);
  return `${glass(4, 20)}${glass(22, 18)}`;
}
import { wisps, type Live } from "./live";
const live: Live = svg => { const steam = wisps(svg, 10, 14, 2); return s => steam(s, .5); };
export default { key: "chai", label: "チャイのグラス", at: "shelf", w: 40, h: 34, cat: "食べ物", order: 676, region: "IN", note: "インドで。小さなグラスをふたつ", art, live } satisfies ItemDef;
