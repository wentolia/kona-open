// キャンドルの輪（試作）。冬。灯が揺れる予定
import { poly, tone, leaf, cylinder } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#efe6d2");
  let s = "";
  for (let i = 0; i < 14; i++) s += leaf(i % 2 ? "#3f6a3a" : "#567f48", i % 2 ? "#2e5030" : "#3f6a3a", 6 + i * 4.8, 40 + Math.sin(i) * 1.5, 9, 3, (i % 2 ? 60 : -60) + i * 3);
  [[18, "#c8553f"], [56, "#c8553f"]].forEach(([x]) => { s += poly("#c8553f", [[Number(x) - 2, 38], [Number(x) + 2, 38], [Number(x) + 2, 42], [Number(x) - 2, 42]]); });
  for (const x of [14, 30, 46, 62]) s += cylinder(C, x, 18, 38, 4.2, 4, false) + poly("#f3b24a", [[x - 1.6, 17], [x, 9], [x + 1.6, 17]]) + poly("#2a2724", [[x - .3, 16], [x + .3, 16], [x + .3, 18], [x - .3, 18]]);
  return s;
}

export default { key: "wreath", label: "キャンドルの輪", at: "shelf", w: 76, h: 46, cat: "季節", order: 303, draft: true, note: "冬。灯が揺れる予定", art } satisfies ItemDef;
