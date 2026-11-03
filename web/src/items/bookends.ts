// 本立て。実績「棚が埋まる」で届く。いま聴いているアルバムの色の本が並ぶ
import { poly, BRASS } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${poly(BRASS.lo, [[0, 10], [6, 10], [6, 44], [0, 44]])}${poly(BRASS.mid, [[0, 38], [14, 38], [14, 44], [0, 44]])}
    ${poly(BRASS.lo, [[64, 10], [70, 10], [70, 44], [64, 44]])}${poly(BRASS.mid, [[56, 38], [70, 38], [70, 44], [56, 44]])}
    ${["#3d6b8a", "#a85f4a", "#5f8a5a", "#c9a24a", "#6b5a8a", "#b46b52", "#4a6a6a", "#8a6b45"].map((c, i) => `<g class="bk">${poly(c, [[7 + i * 6.1, 6 + (i * 5 % 9)], [12.6 + i * 6.1, 6 + (i * 5 % 9)], [12.6 + i * 6.1, 44], [7 + i * 6.1, 44]])}</g>`).join("")}`;
}

const live: Live = svg => { const bk = qa(svg, ".bk polygon"); let n = -1; return s => { const all = s.albums(); if (all.length === n) return; n = all.length; bk.forEach((p, i) => { const a = all[i * 7 % Math.max(1, all.length)]; if (a) { const c = s.colorOf(a); p.style.fill = c; p.style.stroke = c; } }); }; };

export default { key: "bookends", label: "本立て", at: "shelf", w: 70, h: 44, cat: "小物", order: 720, note: "実績「棚が埋まる」で届く。いま聴いているアルバムの色の本が並ぶ", art, live } satisfies ItemDef;
