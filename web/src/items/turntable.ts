// レコードプレーヤー。★ 再生中は盤が回り、針が降りる。ラベルはいまのアルバムの色
import { box, poly, tone, ngon, BRASS } from "./lowpoly";
import { q, type Live } from "./live";
import type { ItemDef } from "./types";

function art() {
  const W = tone("#7a5638");
  const rec = ngon(0, 0, 30, 18).map(([x, y]) => [x, y] as [number, number]);
  let grooves = "";
  for (let k = 0; k < 18; k++) { const n = (k + 1) % 18; grooves += poly(k % 6 === 0 ? "#3a3632" : k % 2 ? "#1c1a19" : "#24211f", [[0, 0], rec[k], rec[n]]); }
  return `${box(W, 4, 22, 84, 16, 6, -4)}${poly("#2a2724", [[8, 18], [86, 18], [82, 22], [4, 22]])}
    <g transform="translate(40 15) scale(1 .3)"><g class="disc">${grooves}<g class="label">${poly("#c8553f", ngon(0, 0, 9, 10))}</g>${poly("#d8d0c0", ngon(0, 0, 1.6, 6))}</g></g>
    ${poly(BRASS.lo, ngon(78, 12, 3, 6))}<g class="arm">${poly(BRASS.hi, [[77, 11], [79, 11], [62, 22], [60, 21]])}${poly("#2a2724", [[58, 19], [62, 19], [62, 23], [58, 23]])}</g>
    ${poly("#d8d0c0", [[12, 30], [16, 30], [16, 33], [12, 33]])}`;
}

const live: Live = svg => {
  const disc = q(svg, ".disc")!, arm = q(svg, ".arm")!, label = q(svg, ".label polygon") as SVGElement | null;
  let a = 0, down = 0, shown: unknown = null;
  return s => {
    if (s.playing) a = (a + s.dt * (s.calm ? 60 : 200)) % 360;
    disc.setAttribute("transform", `rotate(${a.toFixed(1)})`);
    down += ((s.playing ? 1 : 0) - down) * Math.min(1, s.dt * 3);
    arm.setAttribute("transform", `rotate(${(-14 * (1 - down)).toFixed(2)} 78 12)`);
    if (label && s.album !== shown) { shown = s.album; const c = s.album ? s.colorOf(s.album) : "#c8553f"; label.style.fill = c; label.style.stroke = c; }
  };
};

export default { key: "turntable", label: "レコードプレーヤー", at: "shelf", w: 92, h: 38, cat: "音楽", order: 211, draft: true, note: "★ 再生中は盤が回り、針が降りる。ラベルはいまのアルバムの色", art, live } satisfies ItemDef;
