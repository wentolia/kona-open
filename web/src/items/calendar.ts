// 日めくり。今日の日付を出す（日曜は赤、土曜は青）
import { poly, slab, tone } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const T = tone("#efe8da");
  const txt = (cls: string, y: number, size: number, fill: string) =>
    `<text class="${cls}" x="25" y="${y}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="${size}" fill="${fill}"></text>`;
  return `${poly("#6b5a48", [[24, 0], [26, 0], [26, 8], [24, 8]])}${slab(T.hi, T.mid, [4, 8, 46, 70])}${poly("#b04a3b", [[4, 8], [46, 8], [46, 22], [4, 22]])}
    <g class="ph">${poly("#2c2a28", [[16, 32], [34, 32], [34, 35], [16, 35]])}${poly("#2c2a28", [[16, 40], [22, 40], [22, 58], [16, 58]])}${poly("#2c2a28", [[28, 40], [34, 40], [34, 58], [28, 58]])}</g>
    ${txt("mo", 19, 10, "#f6efe2")}${txt("dd", 56, 27, "#2c2a28")}${txt("wd", 66, 7, "#8a7a68")}
    ${poly(T.lo, [[4, 70], [46, 70], [44, 72], [6, 72]])}`;
}

const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const live: Live = svg => {
  const mo = q(svg, ".mo")!, dd = q(svg, ".dd")!, wd = q(svg, ".wd")!;
  q(svg, ".ph")?.remove();
  let shown = "";
  return () => {
    const d = new Date(), k = d.toDateString();
    if (k === shown) return;
    shown = k;
    mo.textContent = String(d.getMonth() + 1);
    dd.textContent = String(d.getDate());
    wd.textContent = WD[d.getDay()];
    dd.setAttribute("fill", d.getDay() === 0 ? "#b04a3b" : d.getDay() === 6 ? "#3d5a80" : "#2c2a28");
  };
};

export default { key: "calendar", label: "日めくり", at: "wall", w: 50, h: 72, cat: "小物", order: 112, note: "今日の日付を出す。日曜は赤、土曜は青", art, live } satisfies ItemDef;
