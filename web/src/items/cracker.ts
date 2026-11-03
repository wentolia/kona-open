// クラッカー。はじめてパーティーに参加すると届く。押すと紙吹雪
import { poly, tone } from "./lowpoly";
import { onPress, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#d9584a");
  return `${poly(C.hi, [[4, 46], [22, 6], [30, 10]])}${poly(C.lo, [[4, 46], [30, 10], [34, 18]])}
    ${poly("#e8c46a", [[13, 26], [26, 12], [28, 13], [15, 28]])}${poly("#e8c46a", [[8, 37], [30, 16], [31, 18], [10, 39]])}
    ${poly("#efe6d2", [[22, 6], [30, 10], [34, 18], [28, 14]])}
    ${poly("#5f8a5a", [[30, 4], [33, 2], [34, 5]])}${poly("#3d6b8a", [[37, 9], [40, 8], [39, 12]])}${poly("#e8c46a", [[25, 1], [28, 0], [27, 3]])}`;
}

const COLORS = ["#d9584a", "#e8c46a", "#5f8a5a", "#3d6b8a", "#e58fa4", "#efe6d2"];
const live: Live = svg => {
  svg.style.overflow = "visible";
  const NS = "http://www.w3.org/2000/svg";
  let bits: { el: SVGPolygonElement; x: number; y: number; vx: number; vy: number; r: number; vr: number }[] = [];
  onPress(svg, () => {
    for (let i = 0; i < 26; i++) {
      const el = document.createElementNS(NS, "polygon");
      el.setAttribute("points", "-1.4,-.8 1.4,-.8 1.4,.8 -1.4,.8");
      el.setAttribute("fill", COLORS[i % COLORS.length]);
      svg.append(el);
      const a = -Math.PI / 4 + (Math.random() - .5) * 1.2, v = 40 + Math.random() * 50;
      bits.push({ el, x: 30, y: 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 360, vr: (Math.random() - .5) * 720 });
    }
  });
  return s => {
    if (!bits.length) return;
    bits = bits.filter(b => {
      b.vy += 90 * s.dt; b.vx *= 1 - s.dt * 1.5; b.x += b.vx * s.dt; b.y += b.vy * s.dt; b.r += b.vr * s.dt;
      b.el.setAttribute("transform", `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.r.toFixed(0)})`);
      if (b.y > 60) { b.el.remove(); return false; }
      return true;
    });
  };
};

export default { key: "cracker", label: "クラッカー", at: "shelf", w: 42, h: 48, cat: "飾り", order: 500, note: "実績「はじめてのパーティー参加」で届く。押すと紙吹雪", art, live } satisfies ItemDef;
