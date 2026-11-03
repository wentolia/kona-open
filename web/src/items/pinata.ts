// ピニャータ。メキシコで。房の付いた星
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const cs = ["#d84a8a", "#e8b83a", "#3aa8a0", "#e86a3a", "#7a5ab8"];
  const cx = 23, cy = 22;
  let o = "";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5, tip: [number, number] = [cx + Math.cos(a) * 21, cy + Math.sin(a) * 21];
    o += poly(cs[i], [[cx + Math.cos(a - .5) * 8, cy + Math.sin(a - .5) * 8], tip, [cx + Math.cos(a + .5) * 8, cy + Math.sin(a + .5) * 8]]);
    o += poly(cs[(i + 2) % 5], [tip, [tip[0] - 2, tip[1] + 6], [tip[0] + 2, tip[1] + 6]]);
  }
  return `${puff(tone("#e8dcc8"), ngon(cx, cy, 10, 10), [cx - 3, cy - 3])}${o}${poly("#e8c86a", ngon(cx, cy, 4, 5, -1.57))}`;
}

export default { key: "pinata", label: "ピニャータ", at: "shelf", w: 46, h: 46, cat: "飾り", order: 663, region: "MX", note: "メキシコで。房の付いた星", art } satisfies ItemDef;
