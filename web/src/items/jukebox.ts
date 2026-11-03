// ジュークボックス。実績「千時間」で届く。再生中は灯りがめぐる
import { poly, tone } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#7a3d2c");
  return `${poly(W.mid, [[6, 40], [48, 0], [90, 40], [90, 150], [6, 150]])}${poly(W.hi, [[6, 40], [48, 0], [48, 8], [14, 42], [14, 150], [6, 150]])}
    ${[0, 1, 2, 3, 4, 5].map(i => `<g class="lt" data-i="${i}">${poly(["#e8c46a", "#d9584a", "#5f8a5a", "#3d6b8a", "#e58fa4", "#e8c46a"][i], [[16 + i * 2.4, 40 - i * 5], [20 + i * 2.4, 37 - i * 5], [80 - i * 2.4, 37 - i * 5], [84 - i * 2.4, 40 - i * 5]])}</g>`).join("")}
    ${poly("#2a221e", [[20, 46], [76, 46], [76, 80], [20, 80]])}${poly("#d8cdb4", [[24, 62], [72, 62], [72, 76], [24, 76]])}
    ${Array.from({ length: 6 }, (_, i) => poly(i % 2 ? "#b99a6a" : "#8a6b45", [[26 + i * 7.5, 50], [31 + i * 7.5, 50], [31 + i * 7.5, 60], [26 + i * 7.5, 60]])).join("")}
    ${poly("#3a2f2a", [[20, 88], [76, 88], [76, 136], [20, 136]])}
    ${Array.from({ length: 6 }, (_, i) => poly("#5a4b43", [[22, 92 + i * 7], [74, 92 + i * 7], [74, 94 + i * 7], [22, 94 + i * 7]])).join("")}
    ${poly(W.deep, [[6, 140], [90, 140], [90, 150], [6, 150]])}`;
}

const live: Live = svg => { const ls = qa(svg, ".lt"); return s => { ls.forEach((l, i) => { l.style.filter = s.playing ? `brightness(${(.8 + .5 * Math.max(0, Math.sin(s.t * 3 - i * .8))).toFixed(2)})` : "brightness(.8)"; }); }; };

export default { key: "jukebox", label: "ジュークボックス", at: "floor", w: 96, h: 150, cat: "音楽", order: 706, note: "実績「千時間」で届く。再生中は灯りがめぐる", art, live } satisfies ItemDef;
