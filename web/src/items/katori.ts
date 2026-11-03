// 蚊やり豚。実績「夏の音」で届く。けむりがのぼる
import { poly, tone, ngon, puff } from "./lowpoly";
import { wisps, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const P = tone("#c9b8a0");
  return `${puff(P, [[6, 18], [16, 8], [34, 8], [44, 16], [46, 30], [36, 40], [14, 40], [4, 30]], [18, 16])}
    ${poly(P.deep, ngon(45, 23, 6, 8).map(([x, y]) => [45 + (x - 45) * .5, y] as [number, number]))}${poly("#2a221e", ngon(45, 23, 4, 8).map(([x, y]) => [45 + (x - 45) * .4, y] as [number, number]))}
    ${poly(P.lo, [[12, 9], [16, 3], [18, 9]])}${poly(P.lo, [[30, 8], [34, 2], [36, 9]])}${poly("#1e1b19", ngon(34, 18, 1.4, 6))}
    ${poly(P.lo, [[10, 38], [16, 38], [16, 42], [10, 42]])}${poly(P.lo, [[34, 38], [40, 38], [40, 42], [34, 42]])}`;
}

const live: Live = svg => { const w = wisps(svg, 46, 18, 3, "rgba(230,230,225,.55)"); return s => w(s, s.playing ? 1 : .6); };

export default { key: "katori", label: "蚊やり豚", at: "floor", w: 50, h: 42, cat: "季節", order: 741, note: "実績「夏の音」で届く。けむりがのぼる", art, live } satisfies ItemDef;
