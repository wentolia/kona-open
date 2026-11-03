// ねずみのおもちゃ。フェルトの胴に長いしっぽ。猫が叩くと床を滑っていく
import { INK, ngon, poly, puff, tone } from "./lowpoly";
import { q, toy, wobble, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const M = tone("#8f8f8a"), E = tone("#c99590");
  return `<g class="tail">${poly(M.lo, [[15, 17], [8, 14.5], [3, 16], [1.5, 19], [2.6, 19.3], [4, 17], [8, 16], [15, 18.6]])}</g>
    <g class="body">${puff(M, [[14, 19], [17, 11], [26, 6.5], [36, 7.5], [42, 12], [45, 18.5], [30, 20.5]], [29, 12])}
    ${poly(M.lo, ngon(34, 7, 4.2, 7))}${poly(E.mid, ngon(34.3, 7.3, 2.4, 7))}${poly(INK.deep, ngon(40, 13, 1.1, 5))}${poly(E.lo, ngon(45, 17.6, 1.3, 5))}</g>
    <i data-cat-toy="slide" style="left:20%;width:76%;top:30%"></i>`;
}

const live: Live = svg => {
  const tail = q(svg, ".tail"), body = q(svg, ".body"), w = wobble(90, 5);
  toy(svg, (dir, p) => { w.v += dir * p * 260; });
  return s => {
    const x = w.step(s.dt);
    if (Math.abs(x) < .01 && Math.abs(w.v) < .01) return;
    tail?.setAttribute("transform", `rotate(${(x * 2.2).toFixed(1)} 15 18)`);
    body?.setAttribute("transform", `translate(0 ${(-Math.abs(x) * .12).toFixed(2)}) rotate(${(-x * .25).toFixed(1)} 30 19)`);
  };
};

export default { key: "mousetoy", label: "ねずみのおもちゃ", at: "floor", w: 46, h: 22, x: .56, cat: "猫", order: 51, note: "★ 猫が叩くと床を滑っていき、しっぽが揺れる", art, live } satisfies ItemDef;
