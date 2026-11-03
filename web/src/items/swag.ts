// ドライフラワー 50×96: 逆さに吊った束。紐・結び目・茎・花穂
import { P, poly } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  let s = poly("#9c8a6a", [[24.4, 0], [25.6, 0], [25.6, 14], [24.4, 14]]) + poly("#a7553f", [[18, 14], [32, 14], [29, 22], [21, 22]]) + poly("#8a4433", [[25, 14], [32, 14], [29, 22], [25, 22]]);
  const heads = ["#c9a46a", "#b9806c", "#d8cca8", "#9a8a5a", "#c27a5a", "#e0c79a", "#8f7a99"];
  for (let i = 0; i < 9; i++) {
    const a = (i - 4) * .13, x0 = 25 + (i - 4) * .8, len = 52 + (i % 3) * 8, x1 = 25 + Math.sin(a) * len, y1 = 20 + Math.cos(a) * len;
    s += poly(i % 2 ? "#7d7a4e" : "#6a6a42", [[x0 - .6, 20], [x0 + .6, 20], [x1 + .5, y1], [x1 - .5, y1]]);
    const c = heads[i % heads.length];
    s += poly(c, [[x1 - 4, y1 - 2], [x1, y1 - 5], [x1 + 4, y1 - 1], [x1 + 2, y1 + 6], [x1 - 2, y1 + 6]]) + `<polygon style="fill:${c};stroke:${c};filter:brightness(.8)" points="${P([[x1, y1 - 5], [x1 + 4, y1 - 1], [x1 + 2, y1 + 6]])}"/>`;
  }
  return s;
}

export default { key: "swag", label: "ドライフラワー", at: "wall", w: 50, h: 96, x: 0.15, y: 0.12, cat: "植物", order: 105, art } satisfies ItemDef;
