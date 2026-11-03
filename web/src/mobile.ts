// スマホ版の画面: 棚を縦に積んだ一覧、下のミニプレイヤー、全画面の「再生中」、アルバムのシート。
// タッチ端末の狭い画面だけで使い、PC のホーム（モジュールのグリッド）とは別に描く。
// データ（アルバム・再生・次に再生）は main.ts と共有し、ここでは表示と操作だけを持つ

import { tagsOf, setTabsHTML, onSetTabClick } from "./tags";
import "./mobile.css";
import "./header.css";
import { headerIcon } from "./header-icons";
import { openParty, partySupported } from "./party";
import { type Album, enrichTracks } from "./library";
import type { Player } from "./player";
import { stat } from "./store";
import { t } from "./i18n";
import { libGroup, groupAlbums } from "./libgroup";
import { modeButtonHTML } from "./modeui";
import { $, esc, fmt } from "./dom";

export interface MobileCtx {
  player: Player;
  albums: () => Album[];
  queue: string[];                       // 次に再生（main.ts と同じ配列）
  play: (a: Album, index?: number) => Promise<void>;
  queueChanged: () => void;              // 次に再生を変えたあと、PC 側の棚も描き直す
  colorOf: (a: Album) => string;
  art: (a: Album) => string;
  openSource: (kind: "local" | "drive") => void; // 読み込み元を開き直す（この端末のフォルダ / Google Drive）
  driveName: () => string | undefined;           // 前に開いた Drive のフォルダ名
  driveConfigured: () => boolean;               // 設定で Drive のクライアントIDを入れたか
  keepState?: (a: Album) => "none" | "keeping" | "kept" | undefined; // Drive のアルバムを端末に残しているか（Drive でなければ undefined）
  toggleKeep?: (a: Album) => void;
  toast: (text: string, action?: string, run?: () => void) => void;
  status: () => string;
}

const hashOf = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return Math.abs(h); };

const ICON = {
  prev: '<svg viewBox="0 0 16 16"><path d="M3 2h2v12H3zM14 2v12L6 8z"/></svg>',
  next: '<svg viewBox="0 0 16 16"><path d="M11 2h2v12h-2zM2 2v12l8-6z"/></svg>',
  play: '<svg viewBox="0 0 16 16"><path d="M4 2v12l10-6z"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><path d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>',
  close: '<svg viewBox="0 0 16 16"><path d="M3.5 2.1 8 6.6l4.5-4.5 1.4 1.4L9.4 8l4.5 4.5-1.4 1.4L8 9.4l-4.5 4.5-1.4-1.4L6.6 8 2.1 3.5z"/></svg>',
  down: '<svg viewBox="0 0 16 16"><path d="M2.6 5.2 8 10.6l5.4-5.4 1.2 1.2L8 13 1.4 6.4z"/></svg>',
  search: '<svg viewBox="0 0 16 16"><path d="M6.8 1.5a5.3 5.3 0 0 1 4.2 8.5l3.6 3.6-1.1 1.1-3.6-3.6A5.3 5.3 0 1 1 6.8 1.5zm0 1.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z"/></svg>',
  queue: '<svg viewBox="0 0 16 16"><path d="M2 3h9v1.5H2zM2 7h9v1.5H2zM2 11h6v1.5H2zM12 9v3H9v1.5h3v3h1.5v-3h3V12h-3V9z"/></svg>',
  unqueue: '<svg viewBox="0 0 16 16"><path d="M2 3h9v1.5H2zM2 7h9v1.5H2zM2 11h6v1.5H2zM9.4 10.1l1-1 1.8 1.8 1.8-1.8 1 1-1.8 1.8 1.8 1.8-1 1-1.8-1.8-1.8 1.8-1-1 1.8-1.8z"/></svg>',
};

// ---------- 使うかどうか: タッチ端末の狭い画面だけ。?mobile=1 / ?mobile=0 で切り替えて覚えられる ----------
const FORCE_KEY = "kona.mobile";
const mq = matchMedia("(pointer: coarse) and (max-width: 900px)");
function forced(): boolean | undefined {
  try {
    const q = new URLSearchParams(location.search).get("mobile");
    if (q === "1" || q === "0") localStorage.setItem(FORCE_KEY, q);
    if (q === "auto") localStorage.removeItem(FORCE_KEY);
    const v = localStorage.getItem(FORCE_KEY);
    return v === null ? undefined : v === "1";
  } catch { return undefined; }
}
let force = forced();
export const mobileActive = () => force ?? mq.matches;

let ctx: MobileCtx;
let query = "";
let sheet: { key: string } | undefined;   // アルバムのシートを開いているか
let nowOpen = false;                      // 全画面の再生中を開いているか
const scrolls = new Map<string, number>(); // 棚ごとの横の送り量（描き直しても戻す）
let onModeChange: (() => void) | undefined;

export function initMobile(c: MobileCtx, modeChanged?: () => void, opts: { force?: boolean } = {}) {
  ctx = c;
  if (opts.force !== undefined) force = opts.force;
  onModeChange = modeChanged;
  const root = document.createElement("div");
  root.id = "m"; root.className = "m";
  root.innerHTML = `
    <header class="m-top">
      <div class="m-brand" role="img" aria-label="Kona">${headerIcon("logo")}</div>
      <label class="m-search">${ICON.search}<input type="search" placeholder="アルバム・アーティストを探す" aria-label="探す" enterkeyhint="search"></label>
      <button class="m-icon m-more" aria-label="メニュー">${headerIcon("more")}</button>
    </header>
    <nav class="m-sets sets" id="m-sets" aria-label="アルバムのセット" hidden></nav>
    <div class="m-shelves" id="m-shelves"></div>
    <div class="m-mini" id="m-mini" hidden></div>
    <div class="m-sheet-host" id="m-sheet" hidden></div>
    <div class="m-now" id="m-now" hidden role="dialog" aria-modal="true" aria-label="再生中"></div>`;
  document.body.append(root);
  const input = $<HTMLInputElement>(".m-search input", root);
  input.addEventListener("input", () => { query = input.value.trim(); renderShelves(); $("#m-shelves").scrollTop = 0; });
  $("#m-sets", root).addEventListener("click", onSetTabClick);
  $(".m-more", root).onclick = e => openMenu(e.currentTarget as HTMLElement);

  apply();
  mq.addEventListener("change", () => { apply(); onModeChange?.(); });
  ctx.player.on(() => { if (!mobileActive()) return; renderMini(); if (nowOpen) renderNow(); updatePlayingMarks(); });
  setInterval(tickMobile, 500);

  // Android の戻るボタン・ジェスチャで、開いているシートを閉じる
  addEventListener("popstate", () => {
    if (nowOpen) closeNow(false);
    else if (sheet) closeSheet(false);
  });
}

function apply() {
  const on = mobileActive();
  document.body.classList.toggle("mobile", on);
  if (on) renderMobile();
}

/** ライブラリや次に再生が変わったときに呼ぶ（スマホ画面でなければ何もしない） */
export function renderMobile() {
  if (!ctx || !mobileActive()) return;
  const sets = $("#m-sets"), html = setTabsHTML();
  sets.innerHTML = html; sets.hidden = !html;
  renderShelves(); renderMini();
  if (sheet) renderSheet();
  if (nowOpen) renderNow();
}

// ---------- 棚の一覧 ----------
interface MShelf { id: string; name: string; list: Album[]; face?: Album; faceLabel?: string; queue?: boolean }

function matches(a: Album, q: string) {
  const s = q.toLowerCase();
  return [a.title, a.artist, a.dir, a.shelf, a.genre, a.year ? String(a.year) : "", ...tagsOf(a)].some(x => x?.toLowerCase().includes(s))
    || a.tracks.some(t => t.title.toLowerCase().includes(s));
}

function shelvesOf(): MShelf[] {
  const all = ctx.albums();
  if (query) {
    const hit = all.filter(a => matches(a, query));
    return [{ id: "search", name: `「${query}」`, list: hit }];
  }
  const out: MShelf[] = [];
  const now = ctx.player.album;
  const q = ctx.queue.map(k => all.find(a => a.key === k)).filter((a): a is Album => !!a);
  if (q.length) out.push({ id: "queue", name: "次に再生", list: q, queue: true });
  const played = all.filter(a => stat(a.key).plays > 0);
  if (played.length) {
    const recent = [...played].sort((x, y) => stat(y.key).last - stat(x.key).last).slice(0, 30);
    out.push({ id: "recent", name: "最近聴いた", list: recent, face: recent[0], faceLabel: now === recent[0] ? "再生中" : "最近聴いた" });
    const top = [...played].sort((x, y) => stat(y.key).plays - stat(x.key).plays).slice(0, 30);
    if (top.length > 3) out.push({ id: "top", name: "よく聴く", list: top, face: top[0], faceLabel: `${stat(top[0].key).plays} 回` });
  }
  // ライブラリの棚: 選んだフォルダ直下のフォルダごとか、アーティストごと（設定の「括り方」）
  for (const [name, list] of groupAlbums(all)) {
    const last = [...list].sort((x, y) => stat(y.key).last - stat(x.key).last)[0];
    const face = stat(last.key).last ? last : list[0];
    out.push({ id: "shelf-" + (libGroup() === "artist" ? "a" : "") + hashOf(name), name: name || "ライブラリ", list, face, faceLabel: stat(last.key).last ? "最近聴いた" : "" });
  }
  return out;
}

function renderShelves() {
  const host = $("#m-shelves");
  if (!host) return;
  host.querySelectorAll<HTMLElement>(".m-row").forEach(r => scrolls.set(r.dataset.id!, r.scrollLeft));
  const shelves = shelvesOf();
  host.innerHTML = "";
  if (!ctx.albums().length) { host.innerHTML = `<p class="m-empty">棚が空です</p>`; return; }
  for (const s of shelves) {
    const sec = document.createElement("section");
    sec.className = "m-shelf" + (s.queue ? " m-queue" : "");
    sec.innerHTML = `<h2 class="m-label"><b>${esc(s.name)}</b><span class="count">${s.list.length}</span></h2><div class="m-row" data-id="${s.id}"></div>`;
    const row = $(".m-row", sec);
    if (!s.list.length) row.innerHTML = `<span class="m-row-empty">見つかりませんでした</span>`;
    // 面陳の欄: 背表紙をタップして選んだアルバムがあればそれを、なければ棚の既定（最近聴いたものなど）を見せる。
    // 背表紙はすべて並べ、面陳中のものに印を付ける
    const picked = s.face && s.list.find(a => a.key === featured.get(s.id));
    const shown = picked ?? s.face;
    if (shown) row.append(faceEl(shown, shown === s.face ? s.faceLabel ?? "" : ""));
    for (const a of s.list) row.append(spineEl(a, shown ? s.id : undefined, a === shown));
    host.append(sec);
    row.scrollLeft = scrolls.get(s.id) ?? 0;
  }
  // 検索で曲名だけが当たったときに、どの曲かも出す
  if (query) {
    const ql = query.toLowerCase();
    const tracks = ctx.albums().flatMap(a => a.tracks.map((t, i) => ({ a, t, i }))).filter(x => x.t.title.toLowerCase().includes(ql)).slice(0, 40);
    if (tracks.length) {
      const sec = document.createElement("section");
      sec.className = "m-hits";
      sec.innerHTML = `<h2 class="m-label"><b>曲</b><span class="count">${tracks.length}</span></h2><ol class="m-tracks">${tracks.map((x, n) => `
        <li><button data-n="${n}"><span class="t">${esc(x.t.title)}</span><span class="sub">${esc(x.a.title)}</span></button></li>`).join("")}</ol>`;
      $(".m-tracks", sec).onclick = e => {
        const n = (e.target as HTMLElement).closest<HTMLElement>("[data-n]")?.dataset.n;
        if (n !== undefined) { const x = tracks[Number(n)]; ctx.play(x.a, x.i); }
      };
      host.append(sec);
    }
  }
}

function updatePlayingMarks() {
  const k = ctx.player.album?.key;
  document.querySelectorAll<HTMLElement>("#m-shelves .spine").forEach(el => el.classList.toggle("playing", el.dataset.key === k));
}

function spineEl(a: Album, shelfId?: string, isFeatured = false) {
  const b = document.createElement("button");
  const bg = ctx.colorOf(a), h = hashOf(a.key);
  b.className = "spine" + (a === ctx.player.album ? " playing" : "") + (isFeatured ? " featured" : "");
  b.dataset.key = a.key;
  b.style.cssText = `width:${20 + Math.min(12, Math.round(a.tracks.length * .7))}px;height:${68 + h % 22}%;background:${bg}`;
  b.setAttribute("aria-label", a.artist ? `${a.title} — ${a.artist}` : a.title);
  const tex = a.cover && !a.remote ? `<i class="spine-tex" style="background-image:url('${a.cover}');background-position:${h % 100}% 50%"></i>` : "";
  b.innerHTML = `${tex}<span>${esc(a.title)}</span>`;
  // 面陳のある棚では、背表紙のタップはジャケットの欄をこのアルバムに替えるだけ。シートはジャケットのタップで開く
  touchable(b, a, shelfId ? () => { if (!b.classList.contains("featured")) feature(b, shelfId, a); } : undefined);
  return b;
}

const featured = new Map<string, string>(); // 棚ごとに面陳しているアルバム（背表紙のタップで替わる）
function feature(spine: HTMLElement, shelfId: string, a: Album) {
  featured.set(shelfId, a.key);
  const row = spine.closest<HTMLElement>(".m-row")!;
  row.querySelectorAll(".spine.featured").forEach(el => el.classList.remove("featured"));
  spine.classList.add("featured");
  const old = row.querySelector<HTMLElement>(".m-face");
  const next = faceEl(a, "");
  next.classList.add("m-swap-in");
  if (old) old.replaceWith(next); else row.prepend(next);
}

function faceEl(a: Album, label: string) {
  const b = document.createElement("button");
  b.className = "face m-face" + ((a.ratio ?? 1) < 1 ? " tall" : "");
  b.dataset.key = a.key;
  b.style.setProperty("--ar", String(a.ratio ?? 1));
  b.setAttribute("aria-label", a.artist ? `${a.title} — ${a.artist}` : a.title);
  b.innerHTML = ctx.art(a) + (label ? `<span class="tag${a === ctx.player.album ? " hot" : ""}">${esc(label)}</span>` : "");
  touchable(b, a);
  return b;
}

// タップでアルバムのシートを開き（tap を渡せばそれを呼ぶ）、長押しで「次に再生」に入れる（もう入っていれば外す）
function touchable(el: HTMLElement, a: Album, tap?: () => void) {
  let timer = 0, sx = 0, sy = 0, long = false;
  el.addEventListener("pointerdown", e => {
    long = false; sx = e.clientX; sy = e.clientY;
    clearTimeout(timer);
    timer = window.setTimeout(() => { long = true; toggleQueue(a); navigator.vibrate?.(12); }, 480);
  });
  const cancel = () => clearTimeout(timer);
  el.addEventListener("pointermove", e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) cancel(); });
  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointercancel", cancel);
  el.addEventListener("contextmenu", e => e.preventDefault());
  el.addEventListener("click", e => { if (long) { e.preventDefault(); long = false; return; } (tap ?? (() => openSheet(a)))(); });
}

function toggleQueue(a: Album) {
  const i = ctx.queue.indexOf(a.key);
  if (i >= 0) {
    ctx.queue.splice(i, 1);
    ctx.toast(`「${a.title}」を次に再生から外しました`, "元に戻す", () => { if (!ctx.queue.includes(a.key)) ctx.queue.splice(i, 0, a.key); ctx.queueChanged(); });
  } else {
    ctx.queue.push(a.key);
    ctx.toast(`「${a.title}」を次に再生に入れました`);
  }
  ctx.queueChanged();
}

// ---------- メニュー（フォルダを開き直すなど） ----------
function openMenu(anchor: HTMLElement) {
  document.getElementById("m-menu")?.remove();
  const el = document.createElement("div");
  el.id = "m-menu"; el.className = "m-menu"; el.setAttribute("role", "menu");
  el.innerHTML = `<p class="m-menu-status">${esc(ctx.status())}</p>
    <button role="menuitem" data-act="local">この端末のフォルダを開く</button>
    ${ctx.driveConfigured() ? `<button role="menuitem" data-act="drive">Google Drive から開く${ctx.driveName() ? `<span>${esc(ctx.driveName()!)}</span>` : ""}</button>` : ""}
    ${partySupported() ? `<button role="menuitem" data-act="party">リスニングパーティー<span>流している音をいっしょに聴く</span></button>` : ""}
    <button role="menuitem" data-act="settings">${t("設定")}</button>
    <button role="menuitem" data-act="pc">PC 向けの画面にする</button>`;
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  el.style.top = `${r.bottom + 6}px`;
  el.onclick = e => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-act]"), act = btn?.dataset.act;
    el.remove();
    if (act === "local" || act === "drive") ctx.openSource(act);
    if (act === "party") openParty();
    if (act === "settings") location.hash = "#settings";
    if (act === "pc") { try { localStorage.setItem(FORCE_KEY, "0"); } catch { /* ignore */ } location.search = "?mobile=0"; }
  };
  setTimeout(() => addEventListener("pointerdown", function off(e) {
    if (!(e.target as HTMLElement).closest("#m-menu")) { el.remove(); removeEventListener("pointerdown", off); }
  }), 0);
}

// ---------- アルバムのシート（下からせり上がる） ----------
function openSheet(a: Album) {
  const was = !!sheet;
  sheet = { key: a.key };
  if (!was) history.pushState({ kona: "sheet" }, "");
  renderSheet();
  enrichTracks(a).then(() => { if (sheet?.key === a.key) renderSheet(); });
}

function closeSheet(viaUi = true) {
  if (!sheet) return;
  sheet = undefined;
  const host = $("#m-sheet");
  host.classList.add("closing");
  setTimeout(() => { if (!sheet) { host.hidden = true; host.innerHTML = ""; host.classList.remove("closing"); } }, 220);
  if (viaUi && history.state?.kona === "sheet") history.back();
}

function renderSheet() {
  const host = $("#m-sheet");
  const a = sheet && ctx.albums().find(x => x.key === sheet!.key);
  if (!a) { closeSheet(); return; }
  const isNow = a === ctx.player.album, queued = ctx.queue.includes(a.key);
  const keep = ctx.keepState?.(a);
  const total = a.tracks.reduce((n, t) => n + (t.duration ?? 0), 0);
  const meta = [a.artist || a.dir, a.year, `${a.tracks.length} 曲${total ? " · " + fmt(total) : ""}`].filter(Boolean).map(x => esc(String(x))).join(" · ");
  const keepScroll = $(".m-sheet-body", host)?.scrollTop ?? 0;
  host.hidden = false;
  host.innerHTML = `<div class="m-backdrop"></div>
    <div class="m-sheet" role="dialog" aria-modal="true" aria-label="${esc(a.title)}">
      <div class="m-grab" aria-hidden="true"></div>
      <div class="m-sheet-body">
        <div class="m-sheet-head">
          <div class="m-sheet-art">${ctx.art(a)}</div>
          <div class="m-sheet-meta">
            <b>${esc(a.title)}</b>
            <span>${meta}</span>
            <div class="m-sheet-actions">
              <button class="m-btn primary" data-act="play">${isNow && ctx.player.playing ? ICON.pause + "一時停止" : ICON.play + (isNow ? "続きから" : "再生")}</button>
              <button class="m-btn" data-act="queue" aria-pressed="${queued}">${queued ? ICON.unqueue + "次に再生から外す" : ICON.queue + "次に再生"}</button>
              ${keep ? `<button class="m-btn m-keep" data-act="keep"${keep === "keeping" ? " disabled" : ""}>${keep === "keeping" ? "残しています…" : keep === "kept" ? "端末から消す" : "端末に残す"}</button>` : ""}
            </div>
          </div>
        </div>
        <ol class="m-tracks">${a.tracks.map((t, i) => `
          <li class="${isNow && i === ctx.player.index ? "current" : ""}"><button data-i="${i}">
            <span class="no">${String(t.no).padStart(2, "0")}</span><span class="t">${esc(t.title)}</span><span class="dur">${t.duration ? fmt(t.duration) : ""}</span>
          </button></li>`).join("")}</ol>
      </div>
    </div>`;
  $(".m-sheet-body", host).scrollTop = keepScroll;
  $(".m-backdrop", host).onclick = () => closeSheet();
  $(".m-sheet", host).onclick = e => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act === "play") { if (isNow) ctx.player.toggle(); else ctx.play(a); }
    if (act === "queue") toggleQueue(a);
    if (act === "keep") ctx.toggleKeep?.(a);
    const i = t.closest<HTMLElement>("[data-i]")?.dataset.i;
    if (i !== undefined) ctx.play(a, Number(i));
  };
  swipeToClose($(".m-sheet", host), $(".m-sheet-body", host), () => closeSheet());
}

// シートを下へなぞって閉じる。中身が先頭までスクロールしているときだけ効く
function swipeToClose(panel: HTMLElement, body: HTMLElement | null, close: () => void) {
  let y0 = 0, dy = 0, active = false;
  panel.addEventListener("touchstart", e => {
    const inBody = body && body.contains(e.target as Node);
    active = !(inBody && body!.scrollTop > 0) && !(e.target as HTMLElement).closest("input");
    y0 = e.touches[0].clientY; dy = 0;
  }, { passive: true });
  panel.addEventListener("touchmove", e => {
    if (!active) return;
    dy = e.touches[0].clientY - y0;
    if (dy < 0) { dy = 0; active = false; panel.style.transform = ""; return; }
    if (dy > 6 && e.cancelable) e.preventDefault();
    panel.style.transition = "none";
    panel.style.transform = `translateY(${dy}px)`;
  }, { passive: false });
  panel.addEventListener("touchend", () => {
    if (!active) return;
    active = false;
    panel.style.transition = "";
    if (dy > Math.min(140, panel.offsetHeight * .25)) close();
    else panel.style.transform = "";
  });
}

// ---------- ミニプレイヤー ----------
function renderMini() {
  const el = $("#m-mini");
  if (!el) return;
  const p = ctx.player, a = p.album, t = p.track;
  el.hidden = !a || !t;
  document.body.classList.toggle("m-has-mini", !el.hidden);
  if (!a || !t) return;
  const k = `${a.key}#${p.index}#${p.playing}`;
  if (el.dataset.k === k) return;
  el.dataset.k = k;
  el.innerHTML = `<div class="m-mini-fill"></div>
    <button class="m-mini-open" aria-label="再生中を開く">
      <span class="m-mini-art">${ctx.art(a)}</span>
      <span class="m-mini-meta"><b>${esc(t.title)}</b><span>${esc(a.title)}${a.artist ? " · " + esc(a.artist) : ""}</span></span>
    </button>
    <button class="m-icon m-mini-play" aria-label="${p.playing ? "一時停止" : "再生"}">${p.playing ? ICON.pause : ICON.play}</button>
    <button class="m-icon m-mini-next" aria-label="次の曲">${ICON.next}</button>`;
  $(".m-mini-open", el).onclick = openNow;
  $(".m-mini-play", el).onclick = () => p.toggle();
  $(".m-mini-next", el).onclick = () => p.next();
  // ミニプレイヤーを上になぞっても開く
  let y0 = 0;
  el.ontouchstart = e => { y0 = e.touches[0].clientY; };
  el.ontouchend = e => { if (y0 - e.changedTouches[0].clientY > 40) openNow(); };
  tickMobile();
}

// ---------- 全画面の再生中 ----------
let seeking = false;
function openNow() {
  if (nowOpen) return;
  nowOpen = true;
  history.pushState({ kona: "now" }, "");
  const el = $("#m-now");
  el.hidden = false;
  el.classList.remove("closing");
  renderNow();
}

function closeNow(viaUi = true) {
  if (!nowOpen) return;
  nowOpen = false;
  const el = $("#m-now");
  el.classList.add("closing");
  el.style.transform = "";
  setTimeout(() => { if (!nowOpen) { el.hidden = true; el.innerHTML = ""; delete el.dataset.k; el.classList.remove("closing"); } }, 260);
  if (viaUi && history.state?.kona === "now") history.back();
}

function renderNow() {
  const el = $("#m-now");
  const p = ctx.player, a = p.album, t = p.track;
  if (!a || !t) { closeNow(); return; }
  const k = `${a.key}#${p.index}#${ctx.queue.join("|")}`;
  if (el.dataset.k === k) { // 曲が同じなら、再生ボタンだけ直す
    const b = $(".m-now-play", el);
    if (b) { b.innerHTML = p.playing ? ICON.pause : ICON.play; b.setAttribute("aria-label", p.playing ? "一時停止" : "再生"); }
    return;
  }
  el.dataset.k = k;
  const keep = $(".m-now-scroll", el)?.scrollTop ?? 0;
  const all = ctx.albums();
  const upNext = ctx.queue.map(q => all.find(x => x.key === q)).filter((x): x is Album => !!x && x !== a);
  el.innerHTML = `
    <div class="m-now-bg" style="background:${ctx.colorOf(a)}"></div>
    <header class="m-now-top">
      <button class="m-icon m-now-close" aria-label="閉じる">${ICON.down}</button>
      <span class="m-now-from">再生中</span>
      <span class="m-now-acts">${modeButtonHTML(p.mode, "m-icon m-now-mode")}</span>
    </header>
    <div class="m-now-scroll">
      <div class="m-now-art${(a.ratio ?? 1) < 1 ? " tall" : ""}" style="--ar:${a.ratio ?? 1}">${ctx.art(a)}</div>
      <div class="m-now-meta">
        <b class="m-now-title">${esc(t.title)}</b>
        <span class="m-now-album">${esc(a.title)}${a.artist ? " · " + esc(a.artist) : ""}</span>
      </div>
      <div class="m-seek">
        <input type="range" class="m-seek-range" min="0" max="1000" step="1" value="0" aria-label="再生位置">
        <div class="m-seek-time"><span class="m-pos">0:00</span><span class="m-no">${String(t.no).padStart(2, "0")} / ${a.tracks.length}</span><span class="m-dur">0:00</span></div>
      </div>
      <div class="m-ctrl">
        <button class="m-icon m-now-prev" aria-label="前の曲">${ICON.prev}</button>
        <button class="m-now-play" aria-label="${p.playing ? "一時停止" : "再生"}">${p.playing ? ICON.pause : ICON.play}</button>
        <button class="m-icon m-now-next" aria-label="次の曲">${ICON.next}</button>
      </div>
      <h2 class="m-label"><b>曲目</b><span class="count">${a.tracks.length}</span></h2>
      <ol class="m-tracks m-now-tracks">${a.tracks.map((tr, i) => `
        <li class="${i === p.index ? "current" : ""}"><button data-i="${i}">
          <span class="no">${String(tr.no).padStart(2, "0")}</span><span class="t">${esc(tr.title)}</span><span class="dur">${tr.duration ? fmt(tr.duration) : ""}</span>
        </button></li>`).join("")}</ol>
      ${upNext.length ? `<h2 class="m-label"><b>次に再生</b><span class="count">${upNext.length}</span></h2>
      <ol class="m-up">${upNext.map(x => `
        <li><button class="m-up-open" data-k="${esc(x.key)}"><span class="m-up-art">${ctx.art(x)}</span><span class="m-up-meta"><b>${esc(x.title)}</b><span>${esc(x.artist || x.dir)}</span></span></button>
        <button class="m-icon m-up-rm" data-rm="${esc(x.key)}" aria-label="${esc(x.title)} を次に再生から外す">${ICON.close}</button></li>`).join("")}</ol>` : ""}
    </div>`;
  $(".m-now-scroll", el).scrollTop = keep;
  $(".m-now-close", el).onclick = () => closeNow();
  $(".m-now-prev", el).onclick = () => p.prev();
  $(".m-now-play", el).onclick = () => p.toggle();
  $(".m-now-next", el).onclick = () => p.next();
  $(".m-now-mode", el).onclick = () => p.cycleMode();
  const range = $<HTMLInputElement>(".m-seek-range", el);
  range.addEventListener("input", () => { seeking = true; paintSeek(Number(range.value) / 1000 * p.duration); });
  range.addEventListener("change", () => { p.seek(Number(range.value) / 1000); seeking = false; });
  $(".m-now-tracks", el).onclick = e => {
    const i = (e.target as HTMLElement).closest<HTMLElement>("[data-i]")?.dataset.i;
    if (i !== undefined) p.playAlbum(a, Number(i));
  };
  const up = el.querySelector<HTMLElement>(".m-up");
  if (up) up.onclick = e => {
    const t = e.target as HTMLElement;
    const rm = t.closest<HTMLElement>("[data-rm]")?.dataset.rm;
    if (rm) { const i = ctx.queue.indexOf(rm); if (i >= 0) ctx.queue.splice(i, 1); ctx.queueChanged(); return; }
    const k = t.closest<HTMLElement>("[data-k]")?.dataset.k;
    const x = k && all.find(y => y.key === k);
    if (x) openSheet(x);
  };
  swipeToClose(el, $(".m-now-scroll", el), () => closeNow());
  tickMobile();
}

function paintSeek(pos: number) {
  const el = $("#m-now");
  const d = ctx.player.duration;
  const r = d ? pos / d : 0;
  const range = el.querySelector<HTMLInputElement>(".m-seek-range");
  if (!range) return;
  if (!seeking) range.value = String(Math.round(r * 1000));
  range.style.setProperty("--fill", `${r * 100}%`);
  $(".m-pos", el).textContent = fmt(pos);
  $(".m-dur", el).textContent = fmt(d);
}

function tickMobile() {
  if (!ctx || !mobileActive()) return;
  const p = ctx.player;
  const fill = document.querySelector<HTMLElement>("#m-mini .m-mini-fill");
  if (fill) fill.style.width = p.duration ? `${p.position / p.duration * 100}%` : "0";
  if (nowOpen && !seeking) paintSeek(p.position);
}
