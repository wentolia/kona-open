// しゃもじ。広島で。もみじを一枚添えて
import { poly, tone, ngon, puff } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#c9a676"), M = "#b8402e", M2 = "#9a3224";
  const head = ngon(0, 0, 11, 12, .2).map(([x, y]) => [x * 1.05, y * 1.35] as [number, number]);
  const momiji = (cx: number, cy: number) => [0, 1, 2, 3, 4].map(i => {
    const a = Math.PI * (-.9 + i * .45), x = cx + Math.cos(a) * 7, y = cy + Math.sin(a) * 7;
    return poly(i % 2 ? M2 : M, [[cx, cy], [cx + Math.cos(a - .25) * 3, cy + Math.sin(a - .25) * 3], [x, y], [cx + Math.cos(a + .25) * 3, cy + Math.sin(a + .25) * 3]]);
  }).join("") + poly(M2, [[cx - .5, cy], [cx + .5, cy], [cx + 1, cy + 5], [cx, cy + 5]]);
  // 少し傾けて棚に立てかける
  return `<g transform="translate(15 17) rotate(-6)">
      ${poly(W.lo, [[-3, 12], [3, 12], [3.4, 38], [-3.4, 38]])}${poly(W.hi, [[-3, 12], [0, 12], [0, 38], [-3.4, 38]])}
      ${puff(W, head, [-4, -6])}
    </g>${momiji(30, 48)}`;
}

export default { key: "shamoji", label: "しゃもじ", at: "shelf", w: 38, h: 56, cat: "小物", order: 611, region: "JP-34", note: "広島で。もみじを一枚添えて", art } satisfies ItemDef;
