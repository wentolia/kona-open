// ジャケット立て。★ いま聴いているアルバムを 1 枚立てて飾る
import { poly, tone } from "./lowpoly";
import { albumPic, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#7a5638");
  return `<g class="ph">${poly("#1f2a33", [[6, 2], [54, 4], [52, 56], [8, 54]])}${poly("#c77a3a", [[14, 14], [44, 16], [42, 44], [16, 42]])}${poly("#e0d7c2", [[22, 22], [36, 23], [35, 36], [23, 35]])}</g>
    ${poly(W.mid, [[2, 58], [58, 58], [58, 66], [2, 66]])}${poly(W.hi, [[2, 56], [58, 56], [58, 58], [2, 58]])}`;
}

const live: Live = svg => albumPic(svg, 8, 4, 45, 51, 2);

export default { key: "coverstand", label: "ジャケット立て", at: "shelf", w: 60, h: 66, cat: "音楽", order: 205, note: "★ いま聴いているアルバムを 1 枚立てて飾る", art, live } satisfies ItemDef;
