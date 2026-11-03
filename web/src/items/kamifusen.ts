// 紙風船。富山で。薬売りのおまけ
import { poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {

  const cs = ["#c44a3a", "#e8c86a", "#4a7aa8", "#e8e0cc", "#5f8a4a", "#d87a9a"];
  const cx = 20, cy = 22, r = 16;
  let o = "";
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI * (.5 + i / 6), a1 = Math.PI * (.5 + (i + 1) / 6);
    o += poly(cs[i], [[cx, cy - r * .9], [cx + Math.cos(a0) * r * -1, cy], [cx + Math.cos(a1) * r * -1, cy], [cx, cy + r * .9]].map(([x, y]) => [x, y] as [number, number]));
  }
  const W = 32 / 6;
  let seg = "";
  for (let i = 0; i < 6; i++) seg += poly(cs[i], [[cx, 6], [4 + i * W, 22], [4 + (i + 1) * W, 22]]) + poly(tone(cs[i]).lo, [[4 + i * W, 22], [4 + (i + 1) * W, 22], [cx, 38]]);
  return `${seg}${poly("#e8e0cc", ngon(cx, 6, 1.6, 6))}`;
}

export default { key: "kamifusen", label: "紙風船", at: "shelf", w: 40, h: 40, cat: "飾り", order: 622, region: "JP-16", note: "富山で。薬売りのおまけ", art } satisfies ItemDef;
