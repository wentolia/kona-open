// メトロノーム。再生中は振り子が刻む
import { poly, tone, BRASS } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#8a4e32");
  return `${poly(W.hi, [[12, 4], [20, 4], [30, 60], [17, 60]])}${poly(W.lo, [[20, 4], [24, 4], [34, 60], [30, 60]])}${poly(W.mid, [[2, 60], [12, 4], [17, 60]])}
    ${poly("#e9dfc8", [[12, 14], [20, 14], [24, 44], [10, 44]])}
    <g class="rod">${poly(BRASS.mid, [[16.4, 8], [17.6, 8], [17.6, 50], [16.4, 50]])}${poly(BRASS.hi, [[14, 20], [20, 20], [20, 25], [14, 25]])}</g>
    ${poly(W.deep, [[0, 58], [34, 58], [34, 62], [0, 62]])}`;
}

const live: Live = svg => {
  const rod = q(svg, ".rod")!;
  let ph = 0, amp = 0;
  return s => {
    amp += ((s.playing ? 1 : 0) - amp) * Math.min(1, s.dt * 2);
    ph += s.dt * Math.PI * (s.calm ? .5 : 1.6);
    rod.setAttribute("transform", `rotate(${(amp * 18 * Math.sin(ph)).toFixed(2)} 17 50)`);
  };
};

export default { key: "metronome", label: "メトロノーム", at: "shelf", w: 34, h: 62, cat: "音楽", order: 212, draft: true, note: "再生中は振り子が刻む", art, live } satisfies ItemDef;
