// サボテン（棚）。稜の立った柱に腕が 2 本、白いとげと小さな花
import { P, ngon, poly, tone, type Pt } from "./lowpoly";
import { pot } from "./_greens";
import type { ItemDef } from "./types";

/** 柱: 縦の帯（稜）を左から明るく塗り、上を丸める。とげは稜の上に */
function column(x0: number, x1: number, y0: number, y1: number) {
  const C = ["#7aa860", "#64924e", "#507d41", "#3f6735", "#33582d"], n = 5, w = x1 - x0;
  let o = "";
  for (let i = 0; i < n; i++) {
    const a = x0 + w * i / n, b = x0 + w * (i + 1) / n, ca = Math.sin(Math.PI * i / n), cb = Math.sin(Math.PI * (i + 1) / n);
    o += poly(C[i], [[a, y1], [a, y0 + w * .5 * (1 - ca * .9)], [(a + b) / 2, y0 - w * .04], [b, y0 + w * .5 * (1 - cb * .9)], [b, y1]]);
  }
  for (let i = 1; i < n; i++) for (let y = y0 + w * .5 + (i % 2) * 3; y < y1 - 2; y += 6) { const x = x0 + w * i / n; o += `<polygon style="fill:#e8e0cc" points="${P([[x - .6, y], [x + .6, y], [x, y - 1.6]])}"/>`; }
  return o;
}

function art() {
  const T = tone("#b8714f");
  let s = column(14, 26, 30, 58) + poly("#64924e", [[14, 50], [26, 50], [26, 58], [14, 58]]) + poly("#507d41", [[14, 56], [28, 56], [28, 62], [20, 62]]) + column(40, 51, 38, 62) + poly("#3f6735", [[38, 58], [51, 58], [46, 66], [38, 66]]);
  s += column(24, 42, 8, 86);
  const fl: Pt[] = ngon(33, 9, 3.4, 6, .3);
  s += poly("#e98aa4", fl) + poly("#f7c0cf", ngon(33, 8.4, 1.6, 5));
  return s + pot(T, 33, 80, 104, 16, 12, 5, "#c9b38a");
}

export default { key: "cactus", label: "サボテン", at: "shelf", w: 66, h: 104, cat: "植物", order: 214, draft: true, note: "稜の立った柱に腕、白いとげと小さな花", art } satisfies ItemDef;
