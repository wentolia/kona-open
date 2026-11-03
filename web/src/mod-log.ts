// 聴いた記録: 週ごとに1段。その週に聴いたアルバムを小さな背表紙で並べる（よく聴いたものほど太い）

import { ctx, esc, hist } from "./modctx";
import type { Album } from "./library";

const WEEKS = 8;

function weekStart(t: number) {
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // 月曜はじまり
  return d.getTime();
}

export function mountLog(body: HTMLElement) {
  body.innerHTML = `<div class="log"></div>`;
  const root = body.querySelector<HTMLElement>(".log")!;
  let shown = -1;
  const C = ctx(), H = hist();
  const render = () => {
    const log = H.log();
    if (log.length === shown) return;
    shown = log.length;
    const c = C, now = weekStart(Date.now());
    const weeks = Array.from({ length: WEEKS }, (_, i) => now - i * 7 * 864e5);
    const rows = weeks.map(start => {
      const counts = new Map<string, number>();
      for (const e of log) if (e.t >= start && e.t < start + 7 * 864e5) counts.set(e.k, (counts.get(e.k) ?? 0) + 1);
      const list = [...counts].map(([k, n]) => [c.byKey(k), n] as const).filter((x): x is readonly [Album, number] => !!x[0]);
      return { start, list, total: [...counts.values()].reduce((a, b) => a + b, 0) };
    });
    if (!log.length) { root.innerHTML = ""; return; }
    root.innerHTML = rows.map((r, i) => `
      <div class="log-row">
        <span class="log-week">${i === 0 ? "今週" : i === 1 ? "先週" : new Date(r.start).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) + "〜"}</span>
        <span class="log-spines">${r.list.map(([a, n]) => `<button class="log-spine" data-key="${esc(a.key)}" title="${esc(a.title)}${a.artist ? " — " + esc(a.artist) : ""}（${n} 回）" style="--c:${c.colorOf(a)};--n:${Math.min(4, n)}"></button>`).join("")}</span>
        <span class="log-count">${r.total ? `${r.total} 回` : ""}</span>
      </div>`).join("");
  };
  root.addEventListener("dblclick", e => {
    const key = (e.target as HTMLElement).closest<HTMLElement>(".log-spine")?.dataset.key;
    const a = key ? C.byKey(key) : undefined;
    if (a) C.play(a);
  });
  C.player.on(render);
  render();
  setInterval(() => { if (root.isConnected) render(); }, 3000);
}
