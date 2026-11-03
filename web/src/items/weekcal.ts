// 週めくりの暦。実績「一週間」で届く。いまの週を示す
import { poly, INK } from "./lowpoly";
import { q, qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${poly(INK.mid, [[25, 0], [29, 0], [29, 6], [25, 6]])}${poly("#d9584a", [[2, 6], [52, 6], [52, 20], [2, 20]])}
    ${poly("#efe6d2", [[2, 20], [52, 20], [52, 68], [2, 68]])}${poly("#d8cdb4", [[2, 66], [52, 66], [50, 70], [4, 70]])}
    ${Array.from({ length: 7 }, (_, i) => `<g class="d" data-i="${i}">${poly(i === 0 ? "#d9584a" : i === 6 ? "#3d6b8a" : "#8a7d6a", [[5 + i * 6.6, 26], [9.6 + i * 6.6, 26], [9.6 + i * 6.6, 30], [5 + i * 6.6, 30]])}</g>`).join("")}
    ${Array.from({ length: 4 }, (_, r) => poly("#d8cdb4", [[5, 38 + r * 7], [49, 38 + r * 7], [49, 39 + r * 7], [5, 39 + r * 7]])).join("")}
    <text class="wk" x="27" y="17" text-anchor="middle" font-size="9" fill="#efe6d2" font-family="system-ui">W1</text>`;
}

const live: Live = svg => { const t = q(svg, ".wk")!, ds = qa(svg, ".d"); let shown = ""; return () => { const n = new Date(), y0 = new Date(n.getFullYear(), 0, 1), w = Math.ceil(((+n - +y0) / 864e5 + y0.getDay() + 1) / 7), k = `${w}/${n.getDay()}`; if (k === shown) return; shown = k; t.textContent = `W${w}`; ds.forEach((d, i) => d.style.opacity = i === n.getDay() ? "1" : ".35"); }; };

export default { key: "weekcal", label: "週めくりの暦", at: "wall", w: 54, h: 70, cat: "小物", order: 746, note: "実績「一週間」で届く。いまの週を示す", art, live } satisfies ItemDef;
