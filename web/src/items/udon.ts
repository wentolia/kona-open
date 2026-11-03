// うどん。香川で。ねぎとちくわ天、湯気
import { poly, tone, ngon } from "./lowpoly";
import { wisps, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const Bw = tone("#3a3532"), Ns = "#efe6d0", Ns2 = "#d8ccb0", Br = "#b8925a";
  const top = ngon(26, 18, 24, 14).map(([x, y]) => [x, 18 + (y - 18) * .26] as [number, number]);
  return `${poly(Bw.mid, [[2, 18], [50, 18], [44, 34], [8, 34]])}${poly(Bw.lo, [[26, 18], [50, 18], [44, 34], [26, 34]])}
    ${poly("#7a2a22", [[6, 26], [46, 26], [45, 28], [7, 28]])}${poly(Bw.deep, [[14, 34], [38, 34], [36, 37], [16, 37]])}
    ${poly(Br, top)}${poly(Ns, [[6, 18], [20, 15], [30, 17], [16, 20]])}${poly(Ns2, [[16, 20], [30, 17], [40, 19], [28, 21]])}
    ${poly(Ns, [[24, 15], [40, 15], [44, 18], [34, 17]])}
    ${poly("#c88a48", [[30, 13], [44, 9], [46, 13], [32, 17]])}${poly("#e8c890", [[33, 13.4], [43, 10.4], [44, 12], [34, 15]])}
    ${poly("#7aa04a", [[12, 16], [14, 15.6], [14.6, 17], [12.6, 17.4]])}${poly("#9ac060", [[18, 18], [20, 17.4], [20.4, 18.8], [18.4, 19.2]])}${poly("#7aa04a", [[24, 16.6], [26, 16.2], [26.4, 17.6], [24.4, 18]])}`;
}

const live: Live = svg => { const steam = wisps(svg, 22, 12, 2); return s => steam(s, .6); };

export default { key: "udon", label: "うどん", at: "shelf", w: 52, h: 38, cat: "食べ物", order: 610, region: "JP-37", note: "香川で。ねぎとちくわ天、湯気", art, live } satisfies ItemDef;
