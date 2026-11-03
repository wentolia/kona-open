// 毛糸玉。猫が叩くと床を転がり、止まった所に残る。押しても転がる
import { ngon, poly, puff, tone } from "./lowpoly";
import { q, toy, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const Y = tone("#c06a5e");
  const band = (c: string, a: number, r0: number) => { // 巻いた糸: 玉の中心から少しずれた細い弧
    const pts: [number, number][] = [];
    for (let i = 0; i <= 6; i++) { const t = -1.2 + i * .4; pts.push([16 + Math.cos(t + a) * r0, 17 + Math.sin(t + a) * r0]); }
    for (let i = 6; i >= 0; i--) { const t = -1.2 + i * .4; pts.push([16 + Math.cos(t + a) * (r0 - 1.3), 17 + Math.sin(t + a) * (r0 - 1.3)]); }
    return poly(c, pts);
  };
  return `${poly(Y.lo, [[22, 28], [29, 30.2], [35, 30.4], [35, 31.6], [29, 31.4], [21, 29.6]])}
    <g class="ball">${puff(Y, ngon(16, 17, 14, 11, .2), [11, 12])}${band(Y.lo, 0, 11)}${band(Y.hi, 2.1, 9)}${band(Y.deep, 4.2, 12)}${band(Y.lo, 1.2, 6)}</g>
    <i data-cat-toy="roll" style="left:5%;width:80%;top:25%"></i>`;
}

const live: Live = svg => {
  const ball = q(svg, ".ball");
  let a = 0, v = 0;
  toy(svg, (dir, p) => { v += dir * p * 900; });
  return s => {
    if (!v) return;
    a += v * s.dt; v *= Math.exp(-s.dt * 2.2);
    if (Math.abs(v) < 4) v = 0;
    ball?.setAttribute("transform", `rotate(${a.toFixed(1)} 16 17)`);
  };
};

export default { key: "yarn", label: "毛糸玉", at: "floor", w: 36, h: 32, x: .44, cat: "猫", order: 50, note: "★ 猫が叩くと床を転がる。押しても転がる", art, live } satisfies ItemDef;
