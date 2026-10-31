// 最小表示: ジャケット・曲名・シーク・曲の操作だけの小さなプレイヤー。
// 本体のウィンドウの最小表示と、常に手前に出る小窓（Document Picture-in-Picture）の両方で同じものを使う

import type { Album } from "./library";
import type { Player } from "./player";

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
      <button class="b-prev" aria-label="前の曲">${I.prev}</button>
      <button class="b-play play" aria-label="再生">${I.play}</button>
      <button class="b-next" aria-label="次の曲">${I.next}</button>
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
    b.setAttribute("aria-label", player.playing ? "一時停止" : "再生");
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
