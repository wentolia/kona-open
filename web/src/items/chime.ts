// 風鈴。夏。風でゆれる。押すと小さく鳴る
import { poly, tone } from "./lowpoly";
import { chimeNotes, onPress, q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const G = tone("#8fc2c8");
  return `${poly("#8a7a68", [[14.5, 0], [15.5, 0], [15.5, 14], [14.5, 14]])}<g class="bell">
    ${poly(G.hi, [[6, 30], [8, 18], [15, 14], [22, 18], [24, 30]])}${poly(G.lo, [[15, 14], [22, 18], [24, 30], [15, 30]])}
    ${poly("#d9584a", [[9, 22], [12, 20], [13, 24]])}${poly("#d9584a", [[18, 21], [21, 23], [18, 25]])}<g class="tail">
    ${poly("#8a7a68", [[14.6, 30], [15.4, 30], [15.4, 48], [14.6, 48]])}
    ${poly("#efe6d2", [[9, 48], [21, 48], [21, 82], [9, 82]])}${poly("#d8ccb4", [[15, 48], [21, 48], [21, 82], [15, 82]])}</g></g>`;
}

const live: Live = svg => {
  const bell = q(svg, ".bell")!, tail = q(svg, ".tail")!;
  let kick = 0;
  onPress(svg, () => { kick = 1; chimeNotes([2093, 2637], .09, .035); });
  return s => {
    kick = Math.max(0, kick - s.dt * .5);
    const a = (s.calm ? .4 : 1) * (1.5 * Math.sin(s.t * .9) * Math.sin(s.t * .31) + kick * 6 * Math.sin(s.t * 9));
    bell.setAttribute("transform", `rotate(${a.toFixed(2)} 15 14)`);
    tail.setAttribute("transform", `rotate(${(a * 2.2 + (s.calm ? 0 : 3 * Math.sin(s.t * 1.7))).toFixed(2)} 15 30)`);
  };
};

export default { key: "chime", label: "風鈴", at: "wall", w: 30, h: 84, cat: "季節", order: 114, note: "夏。風でゆれる。押すと小さく鳴る", art, live } satisfies ItemDef;
