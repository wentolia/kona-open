// 薪ストーブ。炎が揺れる。猫が前で暖まる予定。焚き火の環境音と連動する予定
import { box, poly, tone, INK } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#2f2c2a");
  return `${poly(INK.lo, [[48, 0], [62, 0], [62, 60], [48, 60]])}${poly(INK.hi, [[48, 0], [53, 0], [53, 60], [48, 60]])}
    ${box(T, 12, 64, 84, 92, 8, -6)}
    ${poly("#141210", [[24, 80], [84, 80], [84, 134], [24, 134]])}
    <g class="glow">${poly("#3a1f12", [[24, 104], [84, 104], [84, 134], [24, 134]])}</g>
    <g class="fl1">${poly("#e07a2e", [[34, 134], [44, 104], [50, 120], [58, 96], [66, 118], [72, 108], [76, 134]])}</g><g class="fl2">${poly("#f5c060", [[44, 134], [52, 116], [58, 126], [64, 112], [68, 134]])}</g>
    ${poly("#5a3a24", [[30, 128], [80, 128], [80, 134], [30, 134]])}
    ${poly(T.hi, [[8, 58], [100, 58], [104, 64], [4, 64]])}
    ${poly(T.deep, [[16, 156], [24, 156], [22, 176], [18, 176]])}${poly(T.deep, [[84, 156], [92, 156], [90, 176], [86, 176]])}`;
}

const live: Live = svg => {
  const f1 = q(svg, ".fl1")!, f2 = q(svg, ".fl2")!, gl = q(svg, ".glow")!;
  return s => {
    const t = s.t * (s.calm ? .4 : 1), a = s.calm ? .4 : 1;
    const y1 = 1 + a * (.09 * Math.sin(t * 7.1) + .05 * Math.sin(t * 12.3)), y2 = 1 + a * (.14 * Math.sin(t * 9.4 + 1) + .06 * Math.sin(t * 15.7));
    const sk = a * 4 * Math.sin(t * 3.3);
    f1.setAttribute("transform", `translate(55 134) skewX(${sk.toFixed(2)}) scale(1 ${y1.toFixed(3)}) translate(-55 -134)`);
    f2.setAttribute("transform", `translate(56 134) skewX(${(-sk * 1.4).toFixed(2)}) scale(1 ${y2.toFixed(3)}) translate(-56 -134)`);
    gl.setAttribute("opacity", (.6 + .4 * Math.sin(t * 5.2) * Math.sin(t * 2.1)).toFixed(2));
  };
};

export default { key: "stove", label: "薪ストーブ", at: "floor", w: 112, h: 176, cat: "灯り", order: 40, note: "炎が揺れる。猫が前で暖まる予定。焚き火の環境音と連動する予定", art, live } satisfies ItemDef;
