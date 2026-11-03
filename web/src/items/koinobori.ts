// こいのぼり。実績「春の音」で届く。風に泳ぐ
import { poly, tone, ngon, WOOD } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const fish = (c: string, y: number, l: number) => { const T = tone(c); return poly(T.mid, [[8, y], [8 + l, y + 2], [8 + l - 6, y + 7], [8 + l, y + 12], [8, y + 14]]) + poly(T.hi, [[8, y], [8 + l, y + 2], [8 + l * .6, y + 5], [8, y + 5]]) + poly("#efe6d2", ngon(14, y + 6, 3, 8)) + poly("#1e1b19", ngon(14, y + 6, 1.4, 6)); };
  return `${poly(WOOD.mid, [[4, 0], [7, 0], [7, 100], [4, 100]])}${poly("#e8c46a", ngon(5.5, 2, 3, 8))}
    <g class="f">${fish("#2f3a4a", 8, 52)}</g><g class="f">${fish("#c4523e", 28, 44)}</g><g class="f">${fish("#3d6b8a", 46, 36)}</g>`;
}

const live: Live = svg => { const fs = qa(svg, ".f"); return s => { fs.forEach((f, i) => { const k = Math.sin(s.t * 2 + i) * (s.calm ? .03 : .08); f.setAttribute("transform", `translate(8 0) scale(${(1 + k).toFixed(3)} 1) translate(-8 0)`); }); }; };

export default { key: "koinobori", label: "こいのぼり", at: "wall", w: 64, h: 100, cat: "季節", order: 740, note: "実績「春の音」で届く。風に泳ぐ", art, live } satisfies ItemDef;
