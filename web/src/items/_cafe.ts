// カフェ・バーの飲み物を描く道具（default がないので一覧には出ない）
import { ngon } from "./lowpoly";
import type { LiveState } from "./live";

const NS = "http://www.w3.org/2000/svg";
/** 泡: x0〜x1 の幅で、y0（底）から y1（上）へのぼって消える小さな粒。ゆっくり・まばらに */
export function bubbles(svg: SVGSVGElement, x0: number, x1: number, y0: number, y1: number, n = 5, color = "rgba(255,255,255,.65)", r = .9) {
  const g = document.createElementNS(NS, "g");
  g.setAttribute("pointer-events", "none");
  const bs = Array.from({ length: n }, (_, i) => {
    const p = document.createElementNS(NS, "polygon");
    p.setAttribute("points", ngon(0, 0, r * (.7 + (i * 37 % 10) / 20), 5).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "));
    p.setAttribute("fill", color); g.append(p);
    return { p, ph: (i * .618) % 1, x: x0 + (x1 - x0) * ((i * .382 + .15) % 1), sp: .7 + (i * 53 % 10) / 20 };
  });
  svg.append(g);
  return (s: LiveState) => {
    const k0 = s.calm ? .05 : .16;
    for (const b of bs) {
      const k = (s.t * k0 * b.sp + b.ph) % 1, y = y0 + (y1 - y0) * k, x = b.x + Math.sin(k * 9 + b.ph * 7) * .6;
      b.p.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      b.p.setAttribute("opacity", (Math.min(1, k * 6) * (1 - k * k)).toFixed(2));
    }
  };
}
/** ゆらぎ（0 を中心に ±1）。グラスの中の氷・液面のわずかな揺れに */
export const sway = (s: LiveState, f = 1, ph = 0) => Math.sin(s.t * (s.calm ? .3 : .8) * f + ph);
/** 横長の楕円（上から少し見下ろした円）。n 角で */
export const ell = (cx: number, cy: number, rx: number, ry: number, n = 12): [number, number][] =>
  ngon(cx, 0, rx, n).map(([x, y]) => [x, cy + y * ry / rx]);
