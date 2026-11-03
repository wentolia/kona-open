// 猫じゃらし。実績「はじめてなでる」で届く。押すとゆれる
import { poly, leaf } from "./lowpoly";
import { onPress, q, wobble, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${poly("#a8824e", [[2, 54], [28, 54], [26, 70], [4, 70]])}${poly("#c9a26a", [[2, 52], [28, 52], [28, 55], [2, 55]])}
    <g class="st">${poly("#8a6b45", [[14, 54], [16, 54], [18, 10], [17, 10]])}
    ${[0, 1, 2, 3, 4, 5].map(i => leaf("#d8c7a4", "#b99a6a", 17.5, 12, 9, 2.4, -40 + i * 16)).join("")}</g>`;
}

const live: Live = svg => { const g = q(svg, ".st")!, w = wobble(40, 3); onPress(svg, () => { w.v += 60; }); return s => { const a = w.step(s.dt) + Math.sin(s.t * 1.3) * (s.playing ? 2 : .5); g.setAttribute("transform", `rotate(${a.toFixed(2)} 15 54)`); }; };

export default { key: "teaser", label: "猫じゃらし", at: "shelf", w: 30, h: 70, cat: "猫", order: 750, note: "実績「はじめてなでる」で届く。押すとゆれる", art, live } satisfies ItemDef;
