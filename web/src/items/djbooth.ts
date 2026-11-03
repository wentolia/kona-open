// DJ ブース。実績「主催者」で届く。再生中は盤が回り、灯りがはねる
import { poly, tone, box, ngon } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const B = tone("#2f2a28");
  return `${box(B, 4, 30, 156, 78, 8, -6)}${poly(B.hi, [[0, 26], [164, 26], [168, 22], [6, 22]])}
    ${[34, 124].map(x => `<g class="pl">${poly("#1e1b19", ngon(x, 18, 22, 14).map(([a, b]) => [a, 18 + (b - 18) * .25] as [number, number]))}${poly("#d9584a", ngon(x, 18, 5, 10).map(([a, b]) => [a, 18 + (b - 18) * .25] as [number, number]))}</g>`).join("")}
    ${poly("#4a4440", [[70, 10], [98, 10], [100, 22], [68, 22]])}${[0, 1, 2].map(i => poly("#c9ccd2", [[74 + i * 8, 13], [77 + i * 8, 13], [77 + i * 8, 19], [74 + i * 8, 19]])).join("")}
    ${Array.from({ length: 10 }, (_, i) => `<g class="eq">${poly(["#5f8a5a", "#e8c46a", "#d9584a"][i % 3], [[20 + i * 13, 70], [28 + i * 13, 70], [28 + i * 13, 96], [20 + i * 13, 96]])}</g>`).join("")}
    ${poly("#e8dcc0", [[50, 44], [116, 44], [116, 56], [50, 56]])}`;
}

const live: Live = svg => { const eq = qa(svg, ".eq"); return s => { eq.forEach((e, i) => { const k = s.playing ? .25 + .75 * Math.abs(Math.sin(s.t * (2 + i * .37) + i)) * (.4 + .6 * s.loud) : .15; e.setAttribute("transform", `translate(0 ${(96 - 96 * k).toFixed(1)}) scale(1 ${k.toFixed(3)})`); }); }; };

export default { key: "djbooth", label: "DJ ブース", at: "floor", w: 170, h: 110, cat: "音楽", order: 761, note: "実績「主催者」で届く。再生中は盤が回り、灯りがはねる", art, live } satisfies ItemDef;
