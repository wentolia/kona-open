// スピーカー（試作）。★ ふたつ並べて置く。再生中、音に合わせてコーンがわずかに揺れる予定
import { box, poly, tone, ngon } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#4a3a2e");
  const cone = (cx: number, cy: number, r: number) => {
    const o = ngon(cx, cy, r, 12), m = ngon(cx, cy, r * .62, 12), c = ngon(cx, cy, r * .22, 8);
    let s = "";
    for (let k = 0; k < 12; k++) { const n = (k + 1) % 12, t = Math.sin(k / 12 * Math.PI * 2 + 2.4); s += poly(t > .3 ? "#3a3734" : t > -.3 ? "#2c2a28" : "#1f1d1c", [o[k], o[n], m[n], m[k]]); }
    return poly("#141312", m) + s + poly("#4a4643", c);
  };
  return `${box(T, 4, 10, 52, 108, 6, -6)}${poly("#22201e", [[9, 16], [51, 16], [51, 112], [9, 112]])}
    ${cone(30, 42, 17)}${cone(30, 86, 13)}${poly("#7a6a55", [[24, 64], [36, 64], [36, 66], [24, 66]])}
    ${poly(T.deep, [[8, 118], [14, 118], [14, 124], [8, 124]])}${poly(T.deep, [[46, 118], [52, 118], [52, 124], [46, 124]])}`;
}

export default { key: "speaker", label: "スピーカー", at: "floor", w: 64, h: 124, cat: "音楽", order: 35, draft: true, note: "★ ふたつ並べて置く。再生中、音に合わせてコーンがわずかに揺れる予定", art } satisfies ItemDef;
