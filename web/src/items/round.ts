// 丸いラグ: 楕円を同心の輪に分け、輪ごとに三角の面で
import { poly, type Pt } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const N = 18, cx = 120, cy = 20, rings = [[118, 19.5], [92, 15], [62, 10], [28, 4.6]];
  const cols = [["#d8c8a6", "#c6b48f"], ["#b8693f", "#a35a34"], ["#d8c8a6", "#c6b48f"], ["#8a6a48", "#755a3c"]];
  const pt = (r: number[], k: number): Pt => { const a = k / N * Math.PI * 2; return [cx + Math.cos(a) * r[0], cy + Math.sin(a) * r[1]]; };
  let s = "";
  rings.forEach((r, j) => {
    const inner = rings[j + 1];
    for (let k = 0; k < N; k++) {
      const [a, b] = cols[j], lit = Math.sin(k / N * Math.PI * 2) < 0; // 奥側が少し明るい
      if (inner) s += poly(lit ? a : b, [pt(r, k), pt(r, k + 1), pt(inner, k)]) + poly(lit ? b : a, [pt(r, k + 1), pt(inner, k + 1), pt(inner, k)]);
      else s += poly(k % 2 ? a : b, [[cx, cy], pt(r, k), pt(r, k + 1)]);
    }
  });
  return s;
}

export default { key: "round", label: "丸いラグ", at: "floor", w: 240, h: 0, flat: true, vh: 40, x: 0.3, cat: "敷きもの", order: 21, art } satisfies ItemDef;
