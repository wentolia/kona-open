// 吊るしたポトス（壁）。マクラメの吊り紐と、ハートの形の斑入りの葉が蔓で垂れる
import { poly, tone, type Pt } from "./lowpoly";
import { blade, cords, pot, stem } from "./_greens";
import type { ItemDef } from "./types";

const heart = (t: number) => t >= 1 ? 0 : Math.sin(Math.PI * Math.pow(t, .7)) * (t < .12 ? .7 + t / .12 * .3 : 1);

function vine(x0: number, y0: number, pts: Pt[], seed: number) {
  let o = "", px = x0, py = y0;
  const L: string[] = [];
  pts.forEach(([x, y], i) => {
    o += stem("#5f7a3c", px, py, x, y, 1.1, .9);
    const side = (i + seed) % 2 ? 1 : -1, len = 11 - i * .6;
    const C = (i + seed) % 3 ? ["#7aab55", "#68984a", "#4f7d3c", "#46723a"] : ["#a8c46c", "#86a85a", "#6a9248", "#5a8240"];
    L.push(blade(C, x, y, len, len * .55, 180 + side * 55 + (i % 2) * 10, heart, 2));
    px = x; py = y;
  });
  return o + L.join("");
}

function art() {
  const P = tone("#d9d3c6"), K = "#d8c7a6";
  let s = cords(K, 45, 0, [[26, 54], [45, 56], [64, 54]]);
  s += poly(K, [[43, 0], [47, 0], [46, 6], [44, 6]]) + poly(K, [[31, 34], [37, 34], [36, 38], [32, 38]]) + poly(K, [[53, 34], [59, 34], [58, 38], [54, 38]]);
  s += pot(P, 45, 52, 72, 18, 13, 3);
  s += vine(30, 56, [[24, 66], [20, 80], [18, 96], [20, 112], [18, 128], [20, 144]], 0);
  s += vine(40, 58, [[36, 72], [34, 88], [36, 104], [34, 118]], 1);
  s += vine(60, 56, [[66, 68], [70, 84], [72, 100], [70, 116], [72, 132], [70, 150], [72, 164]], 2);
  s += vine(52, 60, [[54, 76], [56, 92], [54, 106]], 0);
  return s + vine(28, 54, [[16, 58], [8, 66]], 1) + vine(62, 54, [[74, 58], [82, 64]], 0);
}

export default { key: "pothos", label: "吊るしたポトス", at: "wall", w: 90, h: 170, x: 0.9, y: 0.04, cat: "植物", order: 107, draft: true, note: "マクラメの吊り紐と、斑入りの葉の蔓", art } satisfies ItemDef;
