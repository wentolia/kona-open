// ミラーボール。はじめてパーティーを主催すると届く。再生中はゆっくり回り、光のかけらがきらめく
import { poly } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

const R = 22, CX = 26, CY = 40;
function tiles(off: number) {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const b0 = -Math.PI / 2 + i * Math.PI / 6, b1 = b0 + Math.PI / 6;
    for (let j = 0; j < 8; j++) {
      const a0 = -Math.PI / 2 + (j + off) * Math.PI / 8, a1 = a0 + Math.PI / 8;
      if (a0 > Math.PI / 2 || a1 < -Math.PI / 2) continue;
      const A0 = Math.max(a0, -Math.PI / 2), A1 = Math.min(a1, Math.PI / 2);
      const P = (a: number, b: number): [number, number] => [CX + R * Math.cos(b) * Math.sin(a), CY + R * Math.sin(b)];
      const lit = Math.sin(A0 + .5) * .5 - Math.sin(b0) * .5 + ((i * 3 + j * 5) % 7) / 14;
      const c = lit > .6 ? "#f4f1ea" : lit > .3 ? "#c9ccd2" : lit > 0 ? "#9aa0a8" : "#6f747c";
      s += poly(c, [P(A0, b0), P(A1, b0), P(A1, b1), P(A0, b1)]);
    }
  }
  return s;
}
function art() {
  return `${poly("#8a8f96", [[25.4, 0], [26.6, 0], [26.6, 18], [25.4, 18]])}${poly("#4a4f56", [[23, 16], [29, 16], [29, 19], [23, 19]])}
    <g class="ball">${tiles(0)}</g>`;
}

const live: Live = svg => {
  const g = q(svg, ".ball")!;
  let off = 0, shown = -1;
  svg.style.overflow = "visible";
  return s => {
    if (!s.playing) return;
    off = (off + s.dt * (s.calm ? .3 : 1)) % 1;
    const k = Math.round(off * 4) / 4;
    if (k !== shown) { shown = k; g.innerHTML = tiles(k); }
    svg.style.filter = `drop-shadow(0 0 ${(4 + 6 * s.loud).toFixed(1)}px rgba(255,255,255,${(.25 + .35 * s.loud).toFixed(2)}))`;
  };
};

export default { key: "mirrorball", label: "ミラーボール", at: "wall", w: 52, h: 64, y: 0, cat: "飾り", order: 140, note: "実績「はじめてのパーティー主催」で届く。再生中はゆっくり回ってきらめく", art, live } satisfies ItemDef;
