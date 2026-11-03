// ジャケットの額。★ いま聴いている（止めているときは選んでいる）アルバムのジャケットを飾る
import { bevel, poly, INK } from "./lowpoly";
import { albumPic, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${bevel(92, 92, 6, INK)}${poly("#ece6d8", [[6, 6], [86, 6], [86, 86], [6, 86]])}
    <g class="ph">${poly("#2b3e5c", [[14, 14], [78, 14], [78, 78], [14, 78]])}${poly("#d9a441", [[30, 30], [62, 30], [62, 62], [30, 62]])}${poly("#e9d9b0", [[38, 38], [54, 38], [54, 54], [38, 54]])}</g>`;
}

const live: Live = svg => albumPic(svg, 14, 14, 64, 64);

export default { key: "cover", label: "ジャケットの額", at: "wall", w: 92, h: 92, cat: "音楽", order: 110, note: "★ いま聴いている（止めているときは選んでいる）アルバムのジャケットを飾る", art, live } satisfies ItemDef;
