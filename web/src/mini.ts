// 小窓のプレイヤー: ジャケット・曲名・シーク・曲の操作だけ。常に手前に出る小窓（Document Picture-in-Picture）に描く

import { t, t as tr } from "./i18n";
import type { Album } from "./library";
import type { Player } from "./player";
import { $, esc, fmt } from "./dom";

const I = {
  prev: '<svg viewBox="0 0 16 16"><path d="M3 2h2v12H3zM14 2v12L6 8z"/></svg>',
  next: '<svg viewBox="0 0 16 16"><path d="M11 2h2v12h-2zM2 2v12l8-6z"/></svg>',
  play: '<svg viewBox="0 0 16 16"><path d="M4 2v12l10-6z"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><path d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>',
};

export interface MiniAction { cls: string; label: string; icon: string; run: () => void }
export interface MiniDeps {
  player: Player;
  art: (a: Album) => string;
  esc: (s: string) => string;
  fmt: (s: number) => string;
  actions: MiniAction[];
}

/** root の中にミニプレイヤーを描き、再生の変化に合わせて更新する。戻り値で片付ける */
export function mountMini(root: HTMLElement, d: MiniDeps): () => void {
  const { player, esc } = d;
  const doc = root.ownerDocument;
  root.classList.add("mini-host");
  root.innerHTML = `<div class="mini">
    <div class="mini-art"></div>
    <div class="mini-main">
      <div class="mini-title"></div>
      <div class="mini-sub"></div>
      <div class="mini-bar"><span class="mini-pos">0:00</span><div class="mini-track"><div class="mini-fill"></div></div><span class="mini-dur">0:00</span></div>
    </div>
    <div class="mini-ctrl">
      <button class="b-prev" aria-label="${t("前の曲")}">${I.prev}</button>
      <button class="b-play play" aria-label="${t("再生")}">${I.play}</button>
      <button class="b-next" aria-label="${t("次の曲")}">${I.next}</button>
    </div>
    ${d.actions.length ? `<div class="mini-acts">${d.actions.map((a, i) => `<button class="mini-act ${a.cls}" data-i="${i}" aria-label="${esc(a.label)}" title="${esc(a.label)}">${a.icon}</button>`).join("")}</div>` : ""}
  </div>`;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  q(".b-prev").onclick = () => player.prev();
  q(".b-play").onclick = () => player.toggle();
  q(".b-next").onclick = () => player.next();
  root.querySelectorAll<HTMLElement>(".mini-act").forEach(b => b.onclick = () => d.actions[Number(b.dataset.i)].run());
  q(".mini-track").onclick = e => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    player.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
    tick();
  };

  let key = "";
  const render = () => {
    const a = player.album, t = player.track;
    root.classList.toggle("mini-empty", !a);
    const k = a && t ? `${a.key}#${player.index}` : "";
    if (k !== key) {
      key = k;
      q(".mini-art").innerHTML = a ? d.art(a) : "";
      q(".mini-art").classList.toggle("tall", (a?.ratio ?? 1) < 1);
      q(".mini-art").style.setProperty("--ar", String(a?.ratio ?? 1));
      q(".mini-title").textContent = t?.title ?? "";
      q(".mini-sub").textContent = a ? [a.artist, a.title].filter(Boolean).join(" — ") : "";
    }
    const b = q(".b-play");
    b.innerHTML = player.playing ? I.pause : I.play;
    b.setAttribute("aria-label", player.playing ? tr("一時停止") : tr("再生"));
    tick();
  };
  const tick = () => {
    q(".mini-pos").textContent = d.fmt(player.position);
    q(".mini-dur").textContent = d.fmt(player.duration);
    q(".mini-fill").style.width = player.duration ? `${player.position / player.duration * 100}%` : "0";
  };
  // 小窓の中でもスペースで再生・一時停止
  const onKey = (e: KeyboardEvent) => {
    if (e.code !== "Space" || e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;
    e.preventDefault(); player.toggle();
  };
  if (doc !== document) doc.addEventListener("keydown", onKey);
  const off = player.on(render);
  const timer = setInterval(tick, 500);
  render();
  return () => { off(); clearInterval(timer); doc.removeEventListener("keydown", onKey); };
}

// ---------- 小窓: 常に手前に出るミニプレイヤー（Document Picture-in-Picture。Chrome / Edge のみ） ----------
const PIP_SIZE = { width: 420, height: 132 };
const W = {
  back: '<svg viewBox="0 0 16 16"><path d="M1.5 2.5h13v11h-13zM3 4v8h10V4z"/><path d="M5 6h4.5v1.5H7.6l3 3-1 1-3-3v1.9H5z"/></svg>',
};
// @ts-expect-error documentPictureInPicture は DOM 型定義に未収録
const dpip: { requestWindow(o: { width: number; height: number }): Promise<Window>; window: Window | null } | undefined = window.documentPictureInPicture;
let base: Omit<MiniDeps, "actions"> | undefined;
const miniDeps = (actions: MiniAction[]): MiniDeps => ({ ...base!, actions });

async function openPip() {
  if (!dpip) return;
  if (dpip.window) { dpip.window.focus(); return; }
  const w = await dpip.requestWindow(PIP_SIZE).catch(() => undefined);
  if (!w) return;
  // 本体のスタイルを小窓に写す（読めない外部のスタイルシートはリンクで）
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = w.document.createElement("style");
      style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join("\n");
      w.document.head.append(style);
    } catch {
      if (!sheet.href) continue;
      const link = w.document.createElement("link");
      link.rel = "stylesheet"; link.href = sheet.href;
      w.document.head.append(link);
    }
  }
  w.document.title = "Kona";
  w.document.body.classList.add("pip");
  const root = w.document.createElement("section");
  w.document.body.append(root);
  const off = mountMini(root, miniDeps([{ cls: "act-back", label: t("元のウィンドウに戻る"), icon: W.back, run: () => { window.focus(); w.close(); } }]));
  w.addEventListener("pagehide", off, { once: true });
}


/** 小窓のボタンをつなぐ（起動時に一度だけ） */
export function initMini(player: Player, art: (a: Album) => string) {
  base = { player, art, esc, fmt };
  $("#to-pip").hidden = !dpip;
  $("#to-pip").onclick = () => { openPip(); };
  try { localStorage.removeItem("kona.mini"); } catch { /* ignore */ } // もう使わない最小表示の記憶
  // 対応ブラウザでは、再生中にタブを離れたとき自動で小窓に出せる（ブラウザの設定で許可したとき）
  if (dpip && "mediaSession" in navigator) {
    try { navigator.mediaSession.setActionHandler("enterpictureinpicture" as MediaSessionAction, () => { openPip(); }); } catch { /* 対応していない */ }
  }
}
