// 蓄音機。実績「年代をめぐる」で届く。再生中は盤が回る
import { poly, tone, box, puff, BRASS } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#6b4a30");
  return `${box(W, 4, 54, 56, 26, 6, -4)}${poly(BRASS.mid, [[30, 52], [34, 52], [36, 30], [32, 30]])}
    <g class="disc">${poly("#1e1b19", [[8, 52], [56, 52], [60, 54], [4, 54]])}${poly("#d9584a", [[28, 52], [36, 52], [37, 53], [27, 53]])}</g>
    ${puff(BRASS, [[34, 32], [40, 6], [50, 0], [66, 4], [70, 16], [62, 30], [44, 34]], [52, 14])}${poly(BRASS.deep, [[54, 8], [62, 8], [64, 16], [58, 22], [52, 16]])}`;
}

const live: Live = svg => { const d = q(svg, ".disc")!; return s => { d.style.opacity = s.playing ? String(.85 + .15 * Math.sin(s.t * 8)) : "1"; }; };

export default { key: "gramophone", label: "蓄音機", at: "shelf", w: 70, h: 84, cat: "音楽", order: 723, note: "実績「年代をめぐる」で届く。再生中は盤が回る", art, live } satisfies ItemDef;
