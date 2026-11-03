// ばねのおもちゃ。重しの台からばねが伸び、先にぽんぽん。猫が叩くとびよんと揺れる。曲に合わせて小さく揺れる
import { poly, puff, ngon, tone } from "./lowpoly";
import { q, toy, wobble, type Live } from "./live";
import type { ItemDef } from "./types";

const BX = 18, BY = 52, TOP = 16, COILS = 11;
/** ばねの線: 曲がり x（先の横のずれ）に合わせて、根元からしなる */
const coil = (x: number) => Array.from({ length: COILS * 2 + 1 }, (_, i) => {
  const f = i / (COILS * 2), y = BY - (BY - TOP) * f, bend = x * f * f, side = i === 0 || i === COILS * 2 ? 0 : i % 2 ? 4.2 : -4.2;
  return `${(BX + bend + side).toFixed(1)},${(y + Math.abs(x) * .06 * f * f * 10).toFixed(1)}`;
}).join(" ");

function art() {
  const B = tone("#5f6f86"), P = tone("#e08a6a");
  return `${puff(B, [[3, 63], [5, 56], [12, 51.5], [24, 51.5], [31, 56], [33, 63], [18, 64.5]], [16, 55])}
    <polyline class="spr" points="${coil(0)}" fill="none" stroke="#c9c4b8" stroke-width="1.3" stroke-linejoin="round"/>
    <g class="pom" transform="translate(${BX} ${TOP - 4})">${puff(P, ngon(0, 0, 8.5, 9, .2), [-2.5, -2.5])}${poly(P.deep, [[-1, 5], [2, 4.4], [1, 7.4]])}</g>
    <i data-cat-toy="sway" style="left:8%;width:84%;top:12%"></i>`;
}

const live: Live = svg => {
  const spr = q(svg, ".spr"), pom = q(svg, ".pom"), w = wobble(70, 2.2);
  toy(svg, (dir, p) => { w.v += dir * p * 260; });
  return s => {
    const goal = s.playing && !s.calm ? s.loud * 2.4 * Math.sin(s.t * 2.6) : 0, x = w.step(s.dt, goal);
    spr?.setAttribute("points", coil(x));
    pom?.setAttribute("transform", `translate(${(BX + x).toFixed(2)} ${(TOP - 4 + Math.abs(x) * .6).toFixed(2)}) rotate(${(x * 2).toFixed(1)})`);
  };
};

export default { key: "springtoy", label: "ばねのおもちゃ", at: "floor", w: 36, h: 66, x: .74, cat: "猫", order: 53, note: "★ 猫が叩くとびよんと揺れる。曲に合わせて小さく揺れる", art, live } satisfies ItemDef;
