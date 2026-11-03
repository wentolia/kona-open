// コーヒーミル。押すとハンドルが回って、豆を挽く音
import { box, poly, tone, BRASS, ngon } from "./lowpoly";
import { onPress, q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#7a5638");
  return `<g class="crank">${poly(BRASS.mid, [[19, 12], [21, 12], [21, 6], [36, 6], [36, 8], [19, 8]])}${poly("#3a2418", ngon(36, 5, 3, 6))}</g>
    ${poly(BRASS.lo, [[14, 12], [26, 12], [28, 22], [12, 22]])}${poly(BRASS.hi, [[18, 10], [22, 10], [22, 13], [18, 13]])}
    ${box(W, 6, 24, 30, 34, 4, -3)}${poly(W.deep, [[12, 40], [30, 40], [30, 48], [12, 48]])}${poly(BRASS.mid, [[19, 43], [23, 43], [23, 45], [19, 45]])}`;
}

const live: Live = svg => {
  const crank = q(svg, ".crank")!;
  let left = 0, a = 0;
  svg.style.overflow = "visible";
  onPress(svg, () => { left = 2.5; });
  return s => {
    if (left <= 0) return;
    left -= s.dt; a = (a + s.dt * 300) % 360;
    // 上から見た回転を、横の伸び縮みで見せる
    crank.setAttribute("transform", `translate(20 0) scale(${Math.cos(a * Math.PI / 180).toFixed(3)} 1) translate(-20 0)`);
    if (left <= 0) crank.removeAttribute("transform");
  };
};

export default { key: "coffeemill", label: "コーヒーミル", at: "shelf", w: 40, h: 58, cat: "食べ物", order: 405, note: "押すとハンドルが回る", art, live } satisfies ItemDef;
