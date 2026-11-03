// キャンドルの輪。冬。灯が揺れる
import { poly, tone, leaf, cylinder } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#efe6d2");
  let s = "";
  for (let i = 0; i < 14; i++) s += leaf(i % 2 ? "#3f6a3a" : "#567f48", i % 2 ? "#2e5030" : "#3f6a3a", 6 + i * 4.8, 40 + Math.sin(i) * 1.5, 9, 3, (i % 2 ? 60 : -60) + i * 3);
  [[18, "#c8553f"], [56, "#c8553f"]].forEach(([x]) => { s += poly("#c8553f", [[Number(x) - 2, 38], [Number(x) + 2, 38], [Number(x) + 2, 42], [Number(x) - 2, 42]]); });
  for (const x of [14, 30, 46, 62]) s += cylinder(C, x, 18, 38, 4.2, 4, false) + `<g class="fl" data-x="${x}">${poly("#f3b24a", [[x - 1.6, 17], [x, 9], [x + 1.6, 17]])}</g>` + poly("#2a2724", [[x - .3, 16], [x + .3, 16], [x + .3, 18], [x - .3, 18]]);
  return s;
}

const live: Live = svg => {
  const fl = qa(svg, ".fl");
  return s => fl.forEach((f, i) => {
    const a = s.calm ? .3 : 1, t = s.t * (s.calm ? .4 : 1);
    const y = 1 + a * (.12 * Math.sin(t * 8 + i * 2.1) + .06 * Math.sin(t * 13 + i)), k = a * 6 * Math.sin(t * 3 + i * 1.3);
    f.setAttribute("transform", `translate(${f.dataset.x} 17) skewX(${k.toFixed(2)}) scale(1 ${y.toFixed(3)}) translate(${-f.dataset.x!} -17)`);
  });
};

export default { key: "wreath", label: "キャンドルの輪", at: "shelf", w: 76, h: 46, cat: "季節", order: 303, note: "冬。灯が揺れる", art, live } satisfies ItemDef;
