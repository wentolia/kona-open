// レコードの壁掛け。実績「十枚」で届く。いま聴いているアルバムの色を映す
import { poly, ngon, WOOD } from "./lowpoly";
import { qa, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  return `${poly(WOOD.mid, [[0, 40], [120, 40], [120, 46], [0, 46]])}${poly(WOOD.lo, [[0, 46], [120, 46], [118, 48], [2, 48]])}
    ${[0, 1, 2].map(i => `<g class="sl">${poly(["#3d6b8a", "#a85f4a", "#5f8a5a"][i], [[6 + i * 38, 2], [40 + i * 38, 2], [40 + i * 38, 40], [6 + i * 38, 40]])}</g>${poly("#1e1b19", ngon(23 + i * 38, 21, 12, 12))}${poly("#d8cdb4", ngon(23 + i * 38, 21, 3.5, 8))}`).join("")}`;
}

const live: Live = svg => { const sl = qa(svg, ".sl polygon"); let shown: unknown = null; return s => { if (s.album === shown) return; shown = s.album; const all = s.albums(); const pick = [s.album, ...all.slice(0, 2)]; sl.forEach((p, i) => { const a = pick[i]; if (a) { const c = s.colorOf(a); p.style.fill = c; p.style.stroke = c; } }); }; };

export default { key: "recordwall", label: "レコードの壁掛け", at: "wall", w: 120, h: 48, cat: "音楽", order: 711, note: "実績「十枚」で届く。いま聴いているアルバムの色を映す", art, live } satisfies ItemDef;
