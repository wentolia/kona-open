// マトリョーシカ。ロシアで。大小ふたつ並べて
import { poly, puff, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const doll = (cx: number, by: number, s: number, c: string) => {
    const R = tone(c), F = tone("#f0dcc4"), Y = "#d8b46a", K = "#2a1e18";
    const body = ([[-9, 0], [-10, -10], [-8, -18], [-6, -22], [6, -22], [8, -18], [10, -10], [9, 0]] as [number, number][]).map(([x, y]) => [cx + x * s, by + y * s] as [number, number]);
    const head = ngon(cx, by - 27 * s, 7.4 * s, 10, .3);
    const p = (pts: [number, number][]) => pts.map(([x, y]) => [cx + x * s, by + y * s] as [number, number]);
    return puff(R, body, [cx - 4 * s, by - 14 * s]) + puff(R, head, [cx - 2 * s, by - 30 * s]) +
      puff(F, ngon(cx, by - 26.4 * s, 4.6 * s, 9, .3), [cx - 1.4 * s, by - 28 * s]) +
      poly(K, p([[-4.6, -27.4], [0, -31], [4.6, -27.4], [0, -29]])) +
      poly("#e8a0a8", p([[-3.4, -25], [-2, -25], [-2, -24], [-3.4, -24]])) + poly("#e8a0a8", p([[2, -25], [3.4, -25], [3.4, -24], [2, -24]])) +
      poly(K, p([[-2, -26.6], [-1.2, -26.6], [-1.2, -26], [-2, -26]])) + poly(K, p([[1.2, -26.6], [2, -26.6], [2, -26], [1.2, -26]])) +
      poly("#f0e6d4", p([[-6, -14], [6, -14], [7, -2], [-7, -2]])) +
      poly(R.mid, p([[-3, -10], [0, -12], [3, -10], [0, -7]])) + poly(Y, p([[-1, -10], [1, -10], [1, -9], [-1, -9]])) +
      poly("#3f6a35", p([[-5, -6], [-2, -8], [-2, -6]])) + poly("#3f6a35", p([[2, -8], [5, -6], [2, -6]]));
  };
  return `${doll(14, 52, 1.25, "#b8302a")}${doll(36, 52, .9, "#2f5a8a")}`;
}

export default { key: "matryoshka", label: "マトリョーシカ", at: "shelf", w: 46, h: 52, cat: "飾り", order: 654, region: "RU", note: "ロシアで。大小ふたつ並べて", art } satisfies ItemDef;
