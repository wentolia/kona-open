// 香炉。煙がゆらゆら立ちのぼる
import { cylinder, poly, tone } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#6a6f6a");
  return `<polygon class="smoke" fill="rgba(220,220,220,.35)" points="17,4 19,12 16,20 19,28 18,34 17,34 17,28 15,20 18,12 16,4"/>
    ${poly("#7a5a3a", [[17.4, 30], [18.6, 30], [18.6, 42], [17.4, 42]])}${poly("#e07a2e", [[17.2, 29], [18.8, 29], [18.8, 31], [17.2, 31]])}
    ${cylinder(T, 18, 42, 54, 15, 6)}`;
}

const live: Live = svg => {
  const sm = q(svg, ".smoke")!;
  svg.style.overflow = "visible";
  return s => {
    const t = s.t * (s.calm ? .3 : .8), L: string[] = [], R: string[] = [];
    for (let i = 0; i <= 8; i++) {
      const y = 30 - i * 4.4, k = i / 8, x = 18 + Math.sin(t * 1.3 - i * .7) * 3 * k, w = .5 + k * 1.6;
      L.push(`${(x - w).toFixed(2)},${y.toFixed(1)}`); R.unshift(`${(x + w).toFixed(2)},${y.toFixed(1)}`);
    }
    sm.setAttribute("points", [...L, ...R].join(" "));
  };
};

export default { key: "incense", label: "香炉", at: "shelf", w: 36, h: 54, cat: "小物", order: 209, note: "煙がゆらゆら立ちのぼる", art, live } satisfies ItemDef;
