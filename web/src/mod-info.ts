// アルバムの情報: 図書館の貸出カードのように、再生中のアルバムの書誌と、聴いた日付のスタンプを並べる

import { t, tp } from "./i18n";
import { locale } from "./i18n";
import { ctx, esc, fmt, fadeSwap, hist } from "./modctx";

export function mountInfo(body: HTMLElement) {
  body.innerHTML = `<div class="card"></div>`;
  const root = body.querySelector<HTMLElement>(".card")!;
  let shown: string | undefined, album: string | undefined;
  const P = ctx().player, H = hist(), { stat, log: playLog } = H;
  const render = () => {
    const p = P, a = p.album;
    const key = a ? `${a.key}|${a.tagged}|${stat(a.key).plays}` : "";
    if (key === shown || root.classList.contains("swap-out")) return;
    shown = key;
    // 別のアルバムになったときは、カードを薄く消してから差し替える
    if (album !== undefined && album !== (a?.key ?? "")) { album = a?.key ?? ""; fadeSwap(root, () => { shown = undefined; render(); }); return; }
    album = a?.key ?? "";
    if (!a) { root.innerHTML = ""; return; }
    const total = a.tracks.reduce((n, t) => n + (t.duration ?? 0), 0);
    const s = stat(a.key);
    const dates = playLog().filter(e => e.k === a.key).slice(-6).reverse()
      .map(e => new Date(e.t).toLocaleDateString(locale(), { year: "2-digit", month: "2-digit", day: "2-digit" }));
    const rows: [string, string][] = [
      [t("アーティスト"), a.artist || "—"],
      [t("年"), a.year ? String(a.year) : "—"],
      [t("ジャンル"), a.genre || "—"],
      [t("棚"), a.shelf === a.dir ? a.shelf : `${a.shelf} / ${a.dir}`],
      [t("曲数"), `${tp("{0} 曲", a.tracks.length)}${total ? `　${fmt(total)}` : ""}`],
      [t("形式"), a.tracks[0]?.format || "—"],
      [t("再生"), s.plays ? tp("{0} 回", s.plays) : "—"],
    ];
    root.innerHTML = `
      <header class="card-head"><b class="card-title">${esc(a.title)}</b><span class="card-no">No. ${String(Math.abs(hash(a.key)) % 100000).padStart(5, "0")}</span></header>
      <dl class="card-rows">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
      <div class="card-stamps" aria-label="${t("聴いた日")}">${dates.map((d, i) => `<span class="stamp" style="--r:${((hash(a.key + i) % 9) - 4)}deg">${d}</span>`).join("")}</div>`;
  };
  P.on(render);
  render();
  // 再生回数は再生の開始時に増えるので、少し遅れて描き直す
  setInterval(() => { if (root.isConnected) render(); }, 2000);
}

function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
