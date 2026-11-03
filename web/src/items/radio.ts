// 小さなラジオ。★ 再生中は目盛りの灯がともって、ゆっくり動く
import { box, poly, tone, ngon } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#a8714a");
  return `${poly("#2a2724", [[50, 0], [52, 0], [56, 14], [54, 14]])}
    ${box(T, 2, 14, 66, 34, 5, -3)}${poly("#e8dcc0", [[8, 20], [38, 20], [38, 42], [8, 42]])}
    ${[11, 15, 19, 23, 27, 31, 35].map(x => poly("#b8a888", [[x, 22], [x + 1.6, 22], [x + 1.6, 40], [x, 40]])).join("")}
    ${poly("#2a2724", [[42, 22], [62, 22], [62, 30], [42, 30]])}<g class="needle">${poly("#f0b060", [[50, 23], [52, 23], [52, 29], [50, 29]])}</g>
    ${poly("#3a2a20", ngon(48, 37, 3.4, 8))}${poly("#3a2a20", ngon(57, 37, 3.4, 8))}`;
}

const live: Live = svg => {
  const n = q(svg, ".needle")!;
  let x = 0, glow = 0;
  return s => {
    glow += ((s.playing ? 1 : .25) - glow) * Math.min(1, s.dt * 3);
    if (s.playing) x = 8 * Math.sin(s.t * (s.calm ? .05 : .15));
    n.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
    n.setAttribute("opacity", (glow * (.85 + .15 * s.loud)).toFixed(2));
  };
};

export default { key: "radio", label: "小さなラジオ", at: "shelf", w: 74, h: 48, cat: "音楽", order: 204, note: "★ 再生中は目盛りの灯がともって、ゆっくり動く", art, live } satisfies ItemDef;
