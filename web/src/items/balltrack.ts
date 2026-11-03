// ボールのトラック。輪のレールの中を玉が回る。猫が前脚で叩くと、くるくる回って止まる
import { arc, ngon, poly, puff, tone } from "./lowpoly";
import { q, toy, type Live } from "./live";
import type { ItemDef } from "./types";

const CX = 46, CY = 16, RX = 35, RY = 8.6;
function art() {
  const T = tone("#6f9a86"), B = tone("#e0b24c"), K = tone("#b88d5a"), PI = Math.PI;
  return `${poly(T.lo, [...arc(CX, 19, 44, 14, 0, PI, 14), ...arc(CX, 16, 44, 13, PI, 0, 14)])}
    ${poly(T.mid, arc(CX, 16, 44, 13, 0, 2 * PI, 20))}${poly(T.hi, arc(CX, 15, 42, 11.5, PI * 1.05, PI * 1.6, 6).concat([[CX - 20, 12]]))}
    ${poly(T.deep, arc(CX, CY, 39, 10.4, 0, 2 * PI, 20))}${poly(T.mid, arc(CX, CY, 30.5, 6.8, 0, 2 * PI, 18))}
    ${poly(K.lo, arc(CX, 15.5, 24, 4.8, 0, 2 * PI, 14))}${poly(K.mid, arc(CX, 15, 22, 4, 0, 2 * PI, 14))}
    <g class="ball">${puff(B, ngon(0, 0, 4.4, 8), [-1.4, -1.6])}</g>
    <i data-cat-toy="spin" style="left:6%;width:88%;top:35%"></i>`;
}

const live: Live = svg => {
  const ball = q(svg, ".ball");
  let a = 1.9, v = 0, drawn = NaN;
  toy(svg, (dir, p) => { v += -dir * p * (5 + Math.random() * 4); }); // 手前の玉を叩くと、叩いた向きへ転がる
  return s => {
    a += v * s.dt; v *= Math.exp(-s.dt * .8);
    if (Math.abs(v) < .05) v = 0;
    if (a === drawn) return;
    drawn = a;
    ball?.setAttribute("transform", `translate(${(CX + Math.cos(a) * RX).toFixed(2)} ${(CY + Math.sin(a) * RY).toFixed(2)})`);
  };
};

export default { key: "balltrack", label: "ボールのトラック", at: "floor", w: 92, h: 34, x: .35, cat: "猫", order: 52, note: "★ 猫が叩くと、輪の中の玉がくるくる回る", art, live } satisfies ItemDef;
