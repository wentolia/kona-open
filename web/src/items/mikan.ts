// みかん。冬。3 つ積んで
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const O = tone("#ec8a22");
  const m = (cx: number, cy: number, r: number) => puff(O, ngon(cx, cy, r, 9, .2).map(([x, y]) => [x, cy + (y - cy) * .85] as [number, number]), [cx - r * .35, cy - r * .35]) + poly("#4f6a3a", [[cx - 1.5, cy - r * .85], [cx + 1.5, cy - r * .85], [cx + 3, cy - r * .85 - 2], [cx, cy - r * .85 - 1]]);
  return `${m(16, 30, 11)}${m(38, 30, 11)}${m(27, 13, 10)}`;
}

export default { key: "mikan", label: "みかん", at: "shelf", w: 52, h: 40, cat: "食べ物", order: 404, draft: true, note: "冬。3 つ積んで", art } satisfies ItemDef;
