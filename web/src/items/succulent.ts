// 多肉植物の寄せ植え（棚）。浅い鉢に、ロゼットのエケベリアが 3 つ（先がほんのり赤い）
import { tone } from "./lowpoly";
import { blade, pot } from "./_greens";
import type { ItemDef } from "./types";

const fat = (t: number) => t >= 1 ? 0 : Math.pow(Math.sin(Math.PI * Math.pow(t, .75)), .8);

/** ロゼット（横から）: 奥の列から手前の列へ、扇に開いた肉厚の葉を重ねる */
function rosette(cx: number, cy: number, r: number, base: string, tip: string) {
  const B = tone(base), R = tone(tip), rows: [number, number, number, string[]][] = [[6, 80, 1, [R.lo, B.lo, R.deep, B.deep]], [5, 56, .78, [B.mid, B.lo, B.lo, B.deep]], [3, 26, .55, [B.hi, B.mid, B.mid, B.lo]]];
  let o = "";
  rows.forEach(([n, spread, k, C], j) => {
    for (let i = 0; i < n; i++) {
      const d = n > 1 ? -spread + 2 * spread * i / (n - 1) : 0, len = r * k;
      o += blade(C, cx + d * .03, cy + j * 1.2, len, len * .46, d, fat, 2);
    }
  });
  return o;
}

function art() {
  const P = tone("#8c8f96");
  return `${rosette(19, 31, 16, "#7fa892", "#b9727a")}${rosette(55, 32, 14, "#93a86a", "#b86450")}${rosette(37, 33, 19, "#93aeb0", "#c48a96")}${pot(P, 37, 34, 52, 30, 25, 4, "")}`;
}

export default { key: "succulent", label: "多肉の寄せ植え", at: "shelf", w: 74, h: 52, cat: "植物", order: 215, note: "浅い鉢にエケベリアのロゼットが 3 つ", art } satisfies ItemDef;
