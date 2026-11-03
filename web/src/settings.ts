// 設定（#settings）: 部屋の右に開く細い板。部屋はそのまま見えているので、変えたものはその場で部屋に映る（スマホでは全画面）。
// 部屋・猫・音・その他の 4 つのタブに分け、よく触るものを上に、残りは「もっと見る」に畳む。説明文はなるべく置かない。

import "./settings.css";
import { PALETTES, CUSTOM, themePrefs, setThemePrefs, paletteColors, toHex, type ThemePrefs } from "./theme";
import { roomLightOn, setRoomLight } from "./mod-window";
import { SHELF_SKINS, shelfSkin, setShelfSkin } from "./shelf-skin";
import { WALLS, FLOORS, roomSurface, setRoomSurface } from "./room-surface";
import { prefs, setPrefs, type Prefs } from "./prefs";
import { BANDS, BUILTIN_PRESETS, userPresets, savePreset, deletePreset, presetMatching } from "./eq";
import { BREEDS, type Coat } from "./cat";
import { ACTIONS, keyFor, keyLabel } from "./shortcuts";
import { SORTS } from "./shelves";
import { t } from "./i18n";
import type { Player, Normalize } from "./player";
import { spotifySettingsHTML, wireSpotifySettings } from "./spotify-ui";
import { openDrive } from "./drive-ui";
import { saveDriveConfig, signOut as driveSignOut } from "./drive";
import pkg from "../package.json";
import { esc } from "./dom";

export interface KeptAlbum { key: string; title: string; bytes: number; forget(): Promise<void> }
export interface ModItem { id: string; title: string; label: string }
export interface ModuleHooks {
  /** ホームの配置どおり: 段 → 列（2 つ以上重ねた列は「ボックス」）→ 中の段 */
  tree(): ModItem[][][];
  addable(): { type: string; label: string; disabled: boolean }[];
  /** ホームに足して、その id を返す */
  add(type: string): string;
  /** そのモジュールの設定の欄（名前・中身・形など） */
  form(id: string): string;
  wire(el: HTMLElement, id: string, again: () => void): void;
  /** ホームのそのモジュールを目立たせる（undefined で戻す） */
  focus(id: string | undefined, scroll?: boolean): void;
}
export interface SettingsHooks {
  player: Player;
  modules: ModuleHooks;
  /** 猫と遊ぶ（ホームの「＋」にあったもの） */
  play: { canPick(): boolean; pick(): void; wandOn(): boolean; toggleWand(): void };
  cats(): Coat[];
  addCat(): void;
  removeCat(i: number): void;
  changeCat(i: number, change: { name?: string; breed?: string }): void;
  /** いま開いているもの */
  source(): { name: string; kind: "local" | "drive" | "spotify" | "files" | "none"; canRescan: boolean };
  rescan(): void;
  openSource(anchor: HTMLElement): void;
  /** 覚えているフォルダ・Drive のフォルダを忘れる */
  forgetSource(): Promise<void>;
  drive(): { configured: boolean; folder?: string; signedIn: boolean };
  driveSignOut(): void;
  keptAlbums(): KeptAlbum[];
  exportSettings(records: boolean): void;
  importSettings(): void;
  toast(text: string): void;
  /** 棚・ライブラリを描き直す（並び順やジャケットの見せ方が変わったとき） */
  redraw(): void;
}

const opt = (v: string, label: string, sel: boolean) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
const seg = (name: string, items: { v: string; label: string }[], cur: string) =>
  `<div class="set-seg" role="radiogroup" data-seg="${name}">${items.map(i => `<button type="button" role="radio" data-v="${esc(i.v)}" aria-checked="${i.v === cur}">${esc(i.label)}</button>`).join("")}</div>`;
const check = (id: string, on: boolean, label: string) => `<label class="set-check"><input type="checkbox" id="${id}"${on ? " checked" : ""}>${esc(label)}</label>`;
const row = (label: string, body: string, cls = "") => `<div class="set-row${cls ? " " + cls : ""}"><span>${esc(label)}</span>${body}</div>`;
const mb = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.max(.1, n / 1e6).toFixed(1)} MB`;

/** 色の見本: 地の色の上に灯りの色の点 */
function swatch(key: string, label: string, cur: boolean, p: ThemePrefs) {
  const c = paletteColors(key, p);
  return `<button type="button" class="set-sw" data-pal="${key}" aria-pressed="${cur}" title="${esc(label)}" aria-label="${esc(label)}"
    style="--sw-bg:${toHex(c.bg)};--sw-ink:${toHex(c.ink)};--sw-acc:${toHex(c.accent)}"><i></i><span>${esc(label)}</span></button>`;
}
const allPalettes = () => [...PALETTES.map(p => ({ key: p.key, label: t(p.label) })), { key: CUSTOM, label: t("自分で選ぶ") }];

// ---------- 5 つのタブ: 部屋・モジュール・猫・音・その他。よく触るものを上に、残りは「もっと見る」に畳む ----------
type Tab = "room" | "modules" | "cats" | "sound" | "other";
const TABS: { id: Tab; label: string }[] = [{ id: "room", label: "部屋" }, { id: "modules", label: "モジュール" }, { id: "cats", label: "猫" }, { id: "sound", label: "音" }, { id: "other", label: "その他" }];
let tab: Tab = "room";
/** モジュールのタブで設定を開いているモジュール（ひとつだけ） */
let openMod: string | undefined;
/** 開いている畳み（描き直しても開いたまま） */
const opened = new Set<string>();

const sec = (title: string, body: string) => `<section class="set-sec"><h3>${esc(title)}</h3>${body}</section>`;
const fold = (id: string, title: string, body: string) =>
  `<details class="set-more" data-fold="${id}"${opened.has(id) ? " open" : ""}><summary>${esc(title)}</summary><div class="set-more-body">${body}</div></details>`;
/** 見本つきの選択（棚・壁・床） */
const tiles = (name: string, items: readonly { key: string; label: string }[], cur: string, cls: string) =>
  `<div class="set-tiles" role="radiogroup" data-tiles="${name}">${items.map(i => `
    <button type="button" role="radio" class="set-tile" data-v="${esc(i.key)}" aria-checked="${i.key === cur}" title="${esc(t(i.label))}">
      <i class="${cls}" data-k="${esc(i.key)}"${name === "skin" ? ` style="${skinStyle(i.key)}"` : ""}></i><span>${esc(t(i.label))}</span></button>`).join("")}</div>`;

/** 棚の素材の見本: 木の明・中・暗の 3 色（shelf-lowpoly.css の --wood と同じ値） */
const WOODS: Record<string, [string, string, string]> = {
  lowpoly: ["#d2a26c", "#9c6b43", "#55361f"],
  "lowpoly-birch": ["#f1e6d0", "#d3c3a4", "#8f7b5c"], "lowpoly-ebony": ["#634a3a", "#3a2a22", "#171110"], "lowpoly-stone": ["#b4b8ba", "#7c8186", "#3b3f43"],
  "lowpoly-moss": ["#97805c", "#6c553b", "#2f2418"], "lowpoly-snow": ["#be9363", "#8f6440", "#3f2918"],
};
const skinStyle = (k: string) => { const [hi, mid, lo] = WOODS[k] ?? WOODS.lowpoly; return `--w-hi:${hi};--w:${mid};--w-lo:${lo}`; };

function themeBlock() {
  const p = themePrefs(), all = allPalettes();
  return `
    <div class="set-sws">${all.map(a => swatch(a.key, a.label, a.key === p.fixed, p)).join("")}</div>
    ${p.fixed === CUSTOM ? `<div class="set-row">
      <label class="set-color">${t("地")}<input type="color" data-custom="bg" value="${p.custom.bg}"></label>
      <label class="set-color">${t("灯り")}<input type="color" data-custom="accent" value="${p.custom.accent}"></label></div>` : ""}`;
}

function roomTab() {
  const q = prefs(), r = roomSurface();
  return `
    ${sec(t("色"), themeBlock())}
    ${sec(t("棚"), tiles("skin", SHELF_SKINS, shelfSkin(), "set-skin"))}
    ${sec(t("壁"), tiles("wall", WALLS, r.wall, "set-wall"))}
    ${sec(t("床"), tiles("floor", FLOORS, r.floor, "set-floor"))}
    ${fold("room-more", t("もっと見る"), `
      <div class="set-checks">
        ${check("set-roomlight", roomLightOn(), t("部屋の明かりも時刻で変える"))}
        ${check("set-marks", q.marks, t("棚板に暮らした跡を残す"))}
      </div>`)}`;
}

function soundTab(h: SettingsHooks) {
  const eq = h.player.eq, cur = eq.on ? presetMatching(eq.gains) : undefined, q = prefs();
  const preset = (name: string, gains: number[], user: boolean) => `
    <li class="set-preset${cur === name ? " on" : ""}">
      <button type="button" class="set-preset-apply" data-preset="${esc(name)}" aria-pressed="${cur === name}">
        <svg viewBox="0 0 ${BANDS.length * 6} 24" aria-hidden="true">${gains.map((g, i) => `<rect x="${i * 6 + 1}" y="${12 - Math.max(0, g)}" width="4" height="${Math.max(1, Math.abs(g))}"/>`).join("")}</svg>
        <span>${esc(user ? name : t(name))}</span></button>
      ${user ? `<button type="button" class="set-x" data-del-preset="${esc(name)}" aria-label="${esc(t("消す"))}">×</button>` : ""}
    </li>`;
  return `
    ${sec(t("音の色（イコライザー）"), `<ul class="set-presets">${BUILTIN_PRESETS.map(p => preset(p.name, p.gains, false)).join("")}${userPresets().map(p => preset(p.name, p.gains, true)).join("")}</ul>`)}
    ${sec(t("曲のつなぎ"), seg("crossfade", [{ v: "0", label: t("ギャップレス") }, { v: "3", label: "3 " + t("秒") }, { v: "6", label: "6 " + t("秒") }, { v: "10", label: "10 " + t("秒") }], String(q.crossfade)))}
    ${fold("sound-more", t("もっと見る"), `
      ${row(t("音量の正規化"), seg("normalize", [{ v: "off", label: t("しない") }, { v: "track", label: t("曲ごと") }, { v: "album", label: t("アルバムごと") }], h.player.normalize))}
      <form class="set-row set-save" id="set-save-preset"><span>${t("いまの形を残す")}</span><input id="set-preset-name" maxlength="24" placeholder="${esc(t("名前"))}" autocomplete="off"><button class="set-btn">${t("残す")}</button></form>`)}`;
}

// モジュール: ホームに並んでいる順に。押すとそのモジュールの設定が開き、ホームでもそのモジュールに札が立つ
function modulesTab(h: SettingsHooks) {
  const tree = h.modules.tree(), all = tree.flat(2);
  if (openMod && !all.some(m => m.id === openMod)) openMod = undefined;
  const tier = (i: number) => prefs().lang === "en" ? `Row ${i + 1}` : `${i + 1}段目`;
  const item = (m: ModItem, inner?: number) => `
    <li class="set-mod${m.id === openMod ? " open" : ""}" data-mod="${esc(m.id)}">
      <button type="button" class="set-mod-head" aria-expanded="${m.id === openMod}">${inner !== undefined ? `<em>${tier(inner)}</em>` : ""}<b>${esc(m.title)}</b>${m.title !== m.label ? `<i>${esc(m.label)}</i>` : ""}</button>
      ${m.id === openMod ? `<div class="set-mod-body sm-form">${h.modules.form(m.id)}</div>` : ""}
    </li>`;
  return `
    ${sec(`${t("ホームのモジュール")} · ${all.length}`, `
      <ol class="set-tree">${tree.map((row, ri) => `
        <li class="set-tier"><span class="set-tier-h">${tier(ri)}</span>
          <ul class="set-mods">${row.map(col => col.length === 1 ? item(col[0]) : `
            <li class="set-box"><span class="set-box-h">${t("ボックス")}</span>
              <ul class="set-mods">${col.map((m, k) => item(m, k)).join("")}</ul>
            </li>`).join("")}
          </ul>
        </li>`).join("")}
      </ol>`)}
    ${sec(t("モジュールを足す"), `
      <div class="set-chips">${h.modules.addable().map(a => `<button type="button" data-add-mod="${esc(a.type)}"${a.disabled ? " disabled" : ""}>＋ ${esc(a.label)}</button>`).join("")}</div>`)}`;
}

function catsTab(h: SettingsHooks) {
  const q = prefs(), cats = h.cats();
  const breeds = Object.entries(BREEDS);
  return `
    ${sec(`${t("猫")} · ${cats.length} ${t("匹")}`, `
      <ul class="set-cats">${cats.map((c, i) => `
        <li data-cat="${i}">
          <input class="set-cat-name" value="${esc(c.name ?? "")}" placeholder="${esc(t("名前"))}" maxlength="16" aria-label="${esc(t("名前"))}">
          <select class="set-cat-breed" aria-label="${esc(t("品種"))}">${breeds.map(([k, b]) => opt(k, t(b.name), k === (c.breed ?? "mix"))).join("")}</select>
          <button type="button" class="set-x set-cat-bye" aria-label="${esc(t("帰す"))}" title="${esc(t("帰す"))}">×</button>
        </li>`).join("")}
      </ul>
      <div class="set-row"><button type="button" class="set-btn" id="set-cat-add">＋ ${t("猫を呼ぶ")}</button></div>
      ${check("set-cats-hidden", q.catsHidden, t("猫を出さない"))}`)}
    ${sec(t("遊ぶ"), `
      <div class="set-row set-btns">
        <button type="button" class="set-btn" id="set-wand"${cats.length ? "" : " disabled"} aria-pressed="${h.play.wandOn()}">${h.play.wandOn() ? t("猫じゃらしをしまう") : t("猫じゃらしで遊ぶ")}</button>
        <button type="button" class="set-btn" id="set-pick"${h.play.canPick() ? "" : " disabled"}>${t("ランダムで1枚")}</button>
      </div>`)}
    ${fold("cats-more", t("もっと見る"), `
      ${check("set-zoomies", q.catZoomies, t("夜中にときどき駆け回る（夜の運動会）"))}
      ${row(t("よく聴くアルバムをくわえてきたら"), seg("mischief", [{ v: "off", label: t("させない") }, { v: "queue", label: t("次に再生に入れる") }], q.catMischief))}`)}`;
}

function otherTab(h: SettingsHooks) {
  const s = h.source(), q = prefs(), d = h.drive(), kept = h.keptAlbums();
  const kind = { local: t("この端末のフォルダ"), drive: "Google Drive", spotify: "Spotify", files: t("この端末のフォルダ（選んだファイル）"), none: t("開いていません") }[s.kind];
  const total = kept.reduce((n, a) => n + a.bytes, 0);
  return `
    ${sec(t("ライブラリ"), `
      <div class="set-source"><b>${esc(s.name || "—")}</b><span>${esc(kind)}</span></div>
      <div class="set-row set-btns">
        <button type="button" class="set-btn" id="set-rescan"${s.canRescan ? "" : " disabled"}>${t("読み直す")}</button>
        <button type="button" class="set-btn" id="set-open">${t("別のフォルダを開く")}</button>
      </div>
      ${row(t("並び順"), `<select id="set-sort">${SORTS.map(o => opt(o.key, t(o.label), o.key === q.libSort)).join("")}</select>`)}
      ${row(t("括り方"), seg("group", [{ v: "folder", label: t("フォルダ") }, { v: "artist", label: t("アーティスト") }], q.libGroup))}`)}
    ${sec(t("文字と言語"), `
      ${row(t("文字の大きさ"), seg("font-scale", [{ v: ".9", label: t("小") }, { v: "1", label: t("標準") }, { v: "1.15", label: t("大") }, { v: "1.3", label: t("特大") }], String(q.fontScale)))}
      ${row(t("書体"), seg("font", [{ v: "gothic", label: t("ゴシック") }, { v: "mincho", label: t("明朝") }], q.font))}
      ${row(t("言語"), seg("lang", [{ v: "ja", label: "日本語" }, { v: "en", label: "English" }], q.lang))}`)}
    ${fold("lib-more", t("ライブラリの細かな設定"), `
      ${row(t("ジャケットがないとき"), seg("blank", [{ v: "title", label: t("色と題名") }, { v: "initial", label: t("頭文字") }, { v: "plain", label: t("色だけ") }], q.blankArt))}
      ${check("set-autoscan", q.autoRescan, t("ほかのアプリから戻ってきたら、フォルダの変化を反映する"))}
      ${row(t("動き"), seg("motion", [{ v: "system", label: t("端末の設定に従う") }, { v: "reduce", label: t("減らす") }], q.motion))}
      ${kept.length ? `
        <span class="set-sub">${t("端末に残したアルバム")} · ${kept.length} ${t("枚")} · ${mb(total)}</span>
        <ul class="set-kept">${kept.sort((a, b) => b.bytes - a.bytes).map(a => `<li><span>${esc(a.title)}</span><i>${mb(a.bytes)}</i><button type="button" class="set-btn" data-forget="${esc(a.key)}">${t("端末から消す")}</button></li>`).join("")}</ul>` : ""}
      <p class="set-note" id="set-storage"></p>
      <div class="set-row set-btns"><button type="button" class="set-btn danger" id="set-forget"${s.kind === "none" ? " disabled" : ""}>${t("フォルダを解除する")}</button></div>`)}
    ${fold("data", t("データ"), `
      <div class="set-row set-btns">
        <button type="button" class="set-btn" data-export="0">${t("設定を書き出す")}</button>
        <button type="button" class="set-btn" data-export="1">${t("設定と聴いた記録を書き出す")}</button>
        <button type="button" class="set-btn" id="set-import">${t("設定を読み込む")}</button>
      </div>
      <div class="set-row set-btns">
        <button type="button" class="set-btn danger" id="set-clear-log">${t("聴いた記録を消す")}</button>
        <button type="button" class="set-btn danger" id="set-reset">${t("すべて初期化する")}</button>
      </div>`)}
    ${fold("keys", t("キーボード"), `
      <ul class="set-keys">${ACTIONS.map(a => `<li><span>${esc(t(a.label))}</span><kbd class="set-key">${esc(keyLabel(keyFor(a.id)))}</kbd></li>`).join("")}</ul>`)}
    ${fold("sources", t("読み込み元（Google Drive・Spotify）"), `
      <p class="set-note">${t("この端末のフォルダのほかに、Google Drive と Spotify からも聴けます。どちらも、使う人が自分で作った ID を入れて使います（Kona にはサーバーも、誰かの ID もありません）。入れると、はじめの画面と「フォルダを開く」に出ます。")}</p>
      <span class="set-sub">Google Drive</span>
      <div class="set-source"><b>${d.configured ? esc(d.folder ?? t("フォルダ未選択")) : t("使っていません")}</b><span>${d.configured ? (d.signedIn ? t("サインイン中") : t("サインインが切れています")) : ""}</span></div>
      <div class="set-row set-btns">
        <button type="button" class="set-btn" id="set-drive-open">${d.configured ? t("フォルダを選ぶ") : t("クライアントIDを入れる")}</button>
        ${d.signedIn ? `<button type="button" class="set-btn" id="set-drive-out">${t("サインアウト")}</button>` : ""}
        ${d.configured ? `<button type="button" class="set-btn danger" id="set-drive-forget">${t("クライアントIDを消す")}</button>` : ""}
      </div>
      <span class="set-sub">Spotify</span>
      ${spotifySettingsHTML(t)}`)}
    ${fold("about", t("Kona について"), aboutSection())}`;
}

function aboutSection() {
  return `
    <dl class="set-about">
      <dt>${t("版")}</dt><dd>${esc(pkg.version)}</dd>
      <dt>${t("ライセンス")}</dt><dd>MIT（${t("無保証")}）</dd>
      <dt>${t("ソース")}</dt><dd><a href="https://github.com/wentolia/kona-open" target="_blank" rel="noopener">github.com/wentolia/kona-open</a></dd>
    </dl>
    <ul class="set-privacy">
      <li>${t("サーバーはなく、アクセス解析もしません。設定・記録・取り込んだ曲は、このブラウザの中にだけ置きます。")}</li>
      <li>${t("通信するのは Google Drive を使うときの Google の API、Spotify を使うときの Spotify だけです。")}</li>
      <li>${t("Google Drive は読み取りだけで、サインインはこのタブの中だけ（約 1 時間）有効です。")}</li>
      <li>${t("聴いた場所は記録しません。位置情報は使いません。")}</li>
    </ul>`;
}

let root: HTMLElement | undefined;
let hooks: SettingsHooks;

export function initSettings(el: HTMLElement, h: SettingsHooks) {
  root = el; hooks = h;
  // 外で変わったもの（EQ のつまみ、Drive のサインインなど）を、開いているときだけ映す
  h.player.eq.subscribe(() => { if (!el.hidden && !el.contains(document.activeElement)) renderSettings(); });
}

export function renderSettings() {
  if (!root) return;
  const body = root.querySelector(".set-body"), scroll = body?.scrollTop ?? 0;
  if (tab === "modules" && document.body.classList.contains("mobile")) tab = "room"; // スマホ版にはモジュールがない
  if (tab !== "modules") hooks.modules.focus(undefined);
  const content = { room: roomTab, modules: () => modulesTab(hooks), cats: () => catsTab(hooks), sound: () => soundTab(hooks), other: () => otherTab(hooks) }[tab]();
  root.innerHTML = `
  <div class="set">
    <header class="set-head">
      <h2>${esc(t("設定"))}</h2>
      <a href="#home" class="set-close" aria-label="${esc(t("閉じる"))}" title="${esc(t("閉じる"))} (Esc)">×</a>
    </header>
    <nav class="set-tabs" role="tablist" aria-label="${esc(t("設定"))}">${TABS.filter(x => x.id !== "modules" || !document.body.classList.contains("mobile")).map(x => `<button type="button" role="tab" data-tab="${x.id}" aria-selected="${x.id === tab}">${esc(t(x.label))}</button>`).join("")}</nav>
    <div class="set-body" role="tabpanel">${content}</div>
  </div>`;
  root.querySelector(".set-body")!.scrollTop = scroll;
  wire(root);
  navigator.storage?.estimate?.().then(e => {
    const n = root?.querySelector("#set-storage");
    if (n && e.usage !== undefined) n.textContent = `${t("このブラウザで Kona が使っている容量")}: ${mb(e.usage)}${e.quota ? ` / ${mb(e.quota)}` : ""}`;
  }).catch(() => {});
}

/** 設定ページの「モジュール」タブで、そのモジュールの設定を開く（ホームの札から） */
export function openModuleSettings(id: string) {
  tab = "modules"; openMod = id;
  if (location.hash !== "#settings") location.hash = "#settings"; // 開くと描かれる
  else renderSettings();
  hooks.modules.focus(id);
  revealOpenMod(true);
}
function revealOpenMod(focusName: boolean) {
  requestAnimationFrame(() => {
    const li = root?.querySelector<HTMLElement>(".set-mod.open");
    li?.scrollIntoView({ block: "nearest" });
    if (focusName) li?.querySelector<HTMLInputElement>("#sm-title")?.focus({ preventScroll: true });
  });
}

// ---------- 確かめるダイアログ（取り消せない操作の前に） ----------
function confirmDialog(title: string, text: string, ok: string): Promise<boolean> {
  return new Promise(resolve => {
    const back = document.createElement("div");
    back.className = "dlg-back";
    back.innerHTML = `<div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="set-dlg-h">
      <div class="dlg-head"><h2 id="set-dlg-h">${esc(title)}</h2></div>
      <div class="dlg-body"><p class="dlg-lead">${esc(text)}</p>
      <div class="dlg-actions"><button class="open dlg-quiet" data-a="no">${esc(t("やめる"))}</button><button class="open set-danger" data-a="ok">${esc(ok)}</button></div></div></div>`;
    const done = (v: boolean) => { back.remove(); removeEventListener("keydown", key, true); resolve(v); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
    back.onclick = e => {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-a]")?.dataset.a;
      if (a) done(a === "ok"); else if (e.target === back) done(false);
    };
    addEventListener("keydown", key, true);
    document.body.append(back);
    back.querySelector<HTMLButtonElement>("[data-a=no]")!.focus();
  });
}

async function clearRecords() {
  if (!await confirmDialog(t("聴いた記録を消す"), t("再生回数・最後に聴いた日・聴いた記録と場所・聴いた距離を消します。元に戻せません。"), t("消す"))) return;
  for (const k of ["kona.history", "kona.log", "kona.listened", "kona.awards"]) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
  hooks.toast(t("聴いた記録を消しました。画面を開き直します"));
  setTimeout(() => location.reload(), 1000);
}

async function resetAll() {
  if (!await confirmDialog(t("すべて初期化する"), t("設定・配置・聴いた記録・猫・端末に残した曲・覚えているフォルダをすべて消して、はじめの状態に戻します。音楽のファイルそのものは消えません。"), t("初期化する"))) return;
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("kona")) localStorage.removeItem(k);
    for (const k of Object.keys(sessionStorage)) if (k.startsWith("kona")) sessionStorage.removeItem(k);
  } catch { /* ignore */ }
  const del = (name: string) => new Promise<void>(r => { const q = indexedDB.deleteDatabase(name); q.onsuccess = q.onerror = q.onblocked = () => r(); });
  await Promise.all([del("kona"), del("kona-tags")]);
  try { for (const k of await caches.keys()) if (k.includes("drive")) await caches.delete(k); } catch { /* ignore */ }
  location.href = location.pathname;
}

function wire(el: HTMLElement) {
  const h = hooks;
  const again = () => renderSettings();
  const setP = (p: Partial<Prefs>) => { setPrefs(p); again(); };
  wireSpotifySettings(el, again);
  const on = <T extends HTMLElement>(sel: string, ev: string, fn: (e: T) => void) => el.querySelectorAll<T>(sel).forEach(x => x.addEventListener(ev, () => fn(x)));

  on("[data-tab]", "click", b => { tab = b.dataset.tab as Tab; renderSettings(); el.querySelector<HTMLElement>(".set-body")!.scrollTop = 0; el.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.focus(); });
  on<HTMLDetailsElement>("[data-fold]", "toggle", d => { if (d.open) opened.add(d.dataset.fold!); else opened.delete(d.dataset.fold!); });
  // 見本つきの選択
  el.querySelectorAll<HTMLElement>("[data-tiles]").forEach(g => g.onclick = e => {
    const v = (e.target as HTMLElement).closest<HTMLElement>("[data-v]")?.dataset.v;
    if (v === undefined) return;
    switch (g.dataset.tiles) {
      case "skin": setShelfSkin(v); break;
      case "wall": setRoomSurface({ wall: v }); break;
      case "floor": setRoomSurface({ floor: v }); break;
    }
    again();
  });

  // 区切りの選択
  el.querySelectorAll<HTMLElement>("[data-seg]").forEach(g => g.onclick = e => {
    const v = (e.target as HTMLElement).closest<HTMLElement>("[data-v]")?.dataset.v;
    if (v === undefined) return;
    switch (g.dataset.seg) {
      case "font-scale": return setP({ fontScale: Number(v) });
      case "font": return setP({ font: v as Prefs["font"] });
      case "motion": return setP({ motion: v as Prefs["motion"] });
      case "normalize": h.player.setNormalize(v as Normalize); return again();
      case "crossfade": return setP({ crossfade: Number(v) });
      case "mischief": return setP({ catMischief: v as Prefs["catMischief"] });
      case "group": return setP({ libGroup: v as Prefs["libGroup"] }); // 描き直しは本体が "kona:prefs" で
      case "blank": setP({ blankArt: v as Prefs["blankArt"] }); return h.redraw();
      case "lang":
        if (v === prefs().lang) return;
        setPrefs({ lang: v as Prefs["lang"] });
        location.reload(); // 文字はあちこちで描いているので、開き直して全体を替える
    }
  });

  // テーマカラー
  el.querySelectorAll<HTMLElement>("[data-pal]").forEach(b => b.onclick = () => {
    setThemePrefs({ fixed: b.dataset.pal! });
    again();
  });
  // 色を選んでいる間は描き直さない（選ぶ窓が閉じてしまう）。部屋の色だけをその場で替え、決まったら見本も描き直す
  on<HTMLInputElement>("[data-custom]", "input", inp => setThemePrefs({ custom: { ...themePrefs().custom, [inp.dataset.custom!]: inp.value } }));
  on<HTMLInputElement>("[data-custom]", "change", again);

  // 見た目・部屋
  on<HTMLInputElement>("#set-roomlight", "change", c => setRoomLight(c.checked));
  on<HTMLInputElement>("#set-marks", "change", c => setPrefs({ marks: c.checked }));

  // 音
  on("[data-preset]", "click", b => {
    const name = b.dataset.preset!, p = [...BUILTIN_PRESETS, ...userPresets()].find(x => x.name === name);
    if (p) { h.player.eq.setAll(p.gains); again(); }
  });
  on("[data-del-preset]", "click", b => { deletePreset(b.dataset.delPreset!); again(); });
  const save = el.querySelector<HTMLFormElement>("#set-save-preset");
  if (save) save.onsubmit = e => {
    e.preventDefault();
    const name = el.querySelector<HTMLInputElement>("#set-preset-name")!.value.trim();
    if (!name) return;
    savePreset(name, h.player.eq.gains);
    h.toast(`${t("イコライザーの形を残しました")}: ${name}`);
    again();
  };

  // モジュール
  on("[data-mod] > .set-mod-head", "click", b => {
    const id = b.closest<HTMLElement>("[data-mod]")!.dataset.mod!;
    openMod = openMod === id ? undefined : id;
    h.modules.focus(openMod, true);
    again();
  });
  const form = el.querySelector<HTMLElement>(".set-mod-body");
  if (form && openMod) h.modules.wire(form, openMod, again);
  on("[data-add-mod]", "click", b => {
    openMod = h.modules.add(b.dataset.addMod!);
    again();
    h.modules.focus(openMod, true);
    revealOpenMod(true);
  });

  // 猫
  on("#set-wand", "click", () => { h.play.toggleWand(); again(); });
  on("#set-pick", "click", () => h.play.pick());
  on<HTMLInputElement>("#set-cats-hidden", "change", c => setPrefs({ catsHidden: c.checked }));
  on("#set-cat-add", "click", () => { h.addCat(); again(); });
  on("[data-cat] .set-cat-bye", "click", b => { h.removeCat(Number(b.closest<HTMLElement>("[data-cat]")!.dataset.cat)); again(); });
  on<HTMLInputElement>(".set-cat-name", "change", i => h.changeCat(Number(i.closest<HTMLElement>("[data-cat]")!.dataset.cat), { name: i.value.trim() }));
  on<HTMLSelectElement>(".set-cat-breed", "change", s => h.changeCat(Number(s.closest<HTMLElement>("[data-cat]")!.dataset.cat), { breed: s.value }));
  on<HTMLInputElement>("#set-zoomies", "change", c => setP({ catZoomies: c.checked }));

  // ライブラリ
  on("#set-rescan", "click", () => h.rescan());
  on("#set-open", "click", b => h.openSource(b));
  on("#set-forget", "click", async () => {
    if (!await confirmDialog(t("フォルダを解除する"), t("覚えているフォルダ（と Google Drive のフォルダ）を忘れて、はじめの画面に戻ります。ファイルや聴いた記録は消えません。"), t("解除する"))) return;
    await h.forgetSource();
  });
  on<HTMLInputElement>("#set-autoscan", "change", c => setPrefs({ autoRescan: c.checked }));
  on<HTMLSelectElement>("#set-sort", "change", s => { setPrefs({ libSort: s.value as Prefs["libSort"] }); h.redraw(); });
  on("#set-drive-out", "click", () => { h.driveSignOut(); again(); });
  on("#set-drive-open", "click", () => openDrive());
  on("#set-drive-forget", "click", () => { driveSignOut(); saveDriveConfig(undefined); again(); });
  on("[data-forget]", "click", async b => {
    const a = h.keptAlbums().find(x => x.key === b.dataset.forget);
    if (!a) return;
    (b as HTMLButtonElement).disabled = true;
    await a.forget();
    again();
  });

  // データ
  on("[data-export]", "click", b => h.exportSettings(b.dataset.export === "1"));
  on("#set-import", "click", () => h.importSettings());
  on("#set-clear-log", "click", clearRecords);
  on("#set-reset", "click", resetAll);

}
