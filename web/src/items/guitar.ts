// アコースティックギター。スタンドに立てる。押すとポロンと鳴る
import { poly, puff, tone, ngon } from "./lowpoly";
import { chimeNotes, onPress, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#c88a4a"), N = tone("#5a3a24");
  return `${poly("#2a2724", [[14, 150], [28, 108], [30, 108], [18, 150]])}${poly("#2a2724", [[46, 150], [32, 108], [30, 108], [42, 150]])}
    ${poly(N.mid, [[27, 8], [33, 8], [33, 70], [27, 70]])}${poly(N.deep, [[25, 0], [35, 0], [34, 10], [26, 10]])}
    ${puff(B, [[16, 70], [24, 62], [36, 62], [44, 70], [42, 84], [50, 100], [48, 126], [38, 136], [22, 136], [12, 126], [10, 100], [18, 84]], [24, 92])}
    ${poly("#3a2418", ngon(30, 88, 6, 10))}${poly(N.lo, [[22, 112], [38, 112], [38, 116], [22, 116]])}
    ${[28.6, 29.6, 30.6, 31.4].map(x => poly("rgba(240,230,210,.55)", [[x, 6], [x + .3, 6], [x + .3, 114], [x, 114]])).join("")}`;
}

const live: Live = svg => { onPress(svg, () => chimeNotes([196, 247, 294, 392, 494], .05, .05)); };

export default { key: "guitar", label: "ギター", at: "floor", w: 60, h: 150, cat: "音楽", order: 39, note: "スタンドに立てる。押すとポロンと鳴る", art, live } satisfies ItemDef;
