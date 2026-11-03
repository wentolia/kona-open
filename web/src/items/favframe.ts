// 愛聴盤の額。実績「お気に入りの一枚」で届く。いまのアルバムのジャケットを飾る
import { poly, bevel, WOOD } from "./lowpoly";
import { albumPic, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${bevel(76, 84, 6, WOOD)}${poly("#ece3cf", [[6, 6], [70, 6], [70, 78], [6, 78]])}
    <g class="ph">${poly("#8a6b45", [[12, 12], [64, 12], [64, 64], [12, 64]])}${poly("#b99a6a", [[12, 12], [64, 12], [12, 64]])}</g>
    ${poly("#8a7d6a", [[24, 70], [52, 70], [52, 72], [24, 72]])}`;
}

const live: Live = svg => albumPic(svg, 12, 12, 52, 52);

export default { key: "favframe", label: "愛聴盤の額", at: "wall", w: 76, h: 84, cat: "音楽", order: 714, note: "実績「お気に入りの一枚」で届く。いまのアルバムのジャケットを飾る", art, live } satisfies ItemDef;
