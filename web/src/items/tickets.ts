// チケットの半券。コルクの板に、行ったライブの半券をピンで留める
import { bevel, poly, tone } from "./lowpoly";
import type { ItemDef } from "./types";

function art() {
  const C = tone("#b98a5a");
  const stub = (x: number, y: number, w: number, deg: number, c: string, band: string) => {
    const r = deg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r), at = (dx: number, dy: number): [number, number] => [x + dx * cs - dy * sn, y + dx * sn + dy * cs];
    return poly(c, [at(0, 0), at(w, 0), at(w, 16), at(0, 16)]) + poly(band, [at(w - 7, 0), at(w, 0), at(w, 16), at(w - 7, 16)]) + poly("#2a2724", [at(4, 5), at(w - 11, 5), at(w - 11, 6.4), at(4, 6.4)]) + poly("#c8553f", [at(w / 2 - 1.2, -1.2), at(w / 2 + 1.2, -1.2), at(w / 2 + 1.2, 1.2), at(w / 2 - 1.2, 1.2)]);
  };
  return `${bevel(84, 62, 4, tone("#7a5638"))}${poly(C.mid, [[4, 4], [80, 4], [80, 58], [4, 58]])}${poly(C.hi, [[4, 4], [80, 4], [4, 40]])}
    ${stub(9, 9, 34, -4, "#efe6d2", "#3d6b55")}${stub(44, 11, 32, 5, "#f3d38a", "#b24a3b")}${stub(10, 34, 30, 3, "#cfe0e6", "#2c4a6e")}${stub(44, 36, 34, -3, "#efe6d2", "#6b3d64")}`;
}

export default { key: "tickets", label: "チケットの半券", at: "wall", w: 84, h: 62, cat: "音楽", order: 115, note: "コルクの板に、行ったライブの半券をピンで留める", art } satisfies ItemDef;
