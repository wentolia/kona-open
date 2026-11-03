// 設定（#settings）: 部屋の右に開く細い板。部屋はそのまま見えているので、変えたものはその場で部屋に映る（スマホでは全画面）。
// 部屋・猫・音・その他の 4 つのタブに分け、よく触るものを上に、残りは「もっと見る」に畳む。説明文はなるべく置かない。

import "./settings.css";
import { PALETTES, CUSTOM, FADES, themePrefs, setThemePrefs, paletteColors, colorsAt, toHex, type ThemePrefs } from "./theme";
import { WINDOW_SCENES, windowScene, setWindowScene, windowRain, setWindowRain, roomLightOn, setRoomLight } from "./mod-window";
import { OBJECTS, objectShown, setObjectShown } from "./mod-objects";
import { mapRecording, setMapRecording } from "./mod-map";
import { SHELF_SKINS, shelfSkin, setShelfSkin } from "./shelf-skin";
import { WALLS, FLOORS, RUGS, roomSurface, setRoomSurface } from "./room-surface";
import { prefs, setPrefs, type Prefs } from "./prefs";
import { BANDS, BUILTIN_PRESETS, userPresets, savePreset, deletePreset, presetMatching } from "./eq";
import { BREEDS, type Coat } from "./cat";
import { ACTIONS, keyFor, keyLabel, setKey, resetKeys, comboOf, setRecording } from "./shortcuts";
import { SORTS } from "./shelves";
import { t } from "./i18n";
import type { Player, Normalize } from "./player";
import { spotifySettingsHTML, wireSpotifySettings } from "./spotify-ui";
import pkg from "../package.json";
import { esc } from "./dom";

export interface KeptAlbum { key: string; title: string; bytes: number; forget(): Promise<void> }
export interface SettingsHooks {
  player: Player;
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
function swatch(key: string, label: string, cur: boolean, p: ThemePrefs, small = false) {
  const c = paletteColors(key, p);
  return `<button type="button" class="set-sw${small ? " small" : ""}" data-pal="${key}" aria-pressed="${cur}" title="${esc(label)}" aria-label="${esc(label)}"
    style="--sw-bg:${toHex(c.bg)};--sw-ink:${toHex(c.ink)};--sw-acc:${toHex(c.accent)}"><i></i>${small ? "" : `<span>${esc(label)}</span>`}</button>`;
}
const allPalettes = () => [...PALETTES.map(p => ({ key: p.key, label: t(p.label) })), { key: CUSTOM, label: t("自分で選ぶ") }];

/** 1 日の色の移り変わり（地の色の帯と、その下の灯りの色の細い線）。いまの時刻に印 */
function dayBar(p: ThemePrefs) {
  const bg: string[] = [], acc: string[] = [];
  for (let m = 0; m <= 1440; m += 10) {
    const c = colorsAt(m % 1440, p), at = `${(m / 1440 * 100).toFixed(2)}%`;
    bg.push(`${toHex(c.bg)} ${at}`); acc.push(`${toHex(c.accent)} ${at}`);
  }
  const d = new Date(), now = (d.getHours() * 60 + d.getMinutes()) / 1440 * 100;
  return `<div class="set-day" aria-hidden="true">
    <div class="set-day-bg" style="background:linear-gradient(to right, ${bg.join(",")})"></div>
    <div class="set-day-acc" style="background:linear-gradient(to right, ${acc.join(",")})"></div>
    <b style="left:${now.toFixed(2)}%"></b>
    <div class="set-day-hours">${[0, 6, 12, 18, 24].map(h => `<span style="left:${h / 24 * 100}%">${h}</span>`).join("")}</div>
  </div>`;
}

// ---------- 4 つのタブ: 部屋・猫・音・その他。よく触るものを上に、残りは「もっと見る」に畳む ----------
type Tab = "room" | "cats" | "sound" | "other";
const TABS: { id: Tab; label: string }[] = [{ id: "room", label: "部屋" }, { id: "cats", label: "猫" }, { id: "sound", label: "音" }, { id: "other", label: "その他" }];
let tab: Tab = "room";
/** 開いている畳み（描き直しても開いたまま） */
const opened = new Set<string>();

const sec = (title: string, body: string) => `<section class="set-sec"><h3>${esc(title)}</h3>${body}</section>`;
const fold = (id: string, title: string, body: string) =>
  `<details class="set-more" data-fold="${id}"${opened.has(id) ? " open" : ""}><summary>${esc(title)}</summary><div class="set-more-body">${body}</div></details>`;
/** 見本つきの選択（棚・壁・床・ラグ） */
const tiles = (name: string, items: readonly { key: string; label: string }[], cur: string, cls: string) =>
  `<div class="set-tiles" role="radiogroup" data-tiles="${name}">${items.map(i => `
    <button type="button" role="radio" class="set-tile" data-v="${esc(i.key)}" aria-checked="${i.key === cur}" title="${esc(t(i.label))}">
      <i class="${cls}" data-k="${esc(i.key)}"${name === "skin" ? ` style="${skinStyle(i.key)}"` : ""}></i><span>${esc(t(i.label))}</span></button>`).join("")}</div>`;

/** 棚の素材の見本: 木の明・中・暗の 3 色（style.css / shelf-lowpoly.css の --wood と同じ値） */
const WOODS: Record<string, [string, string, string]> = {
  walnut: ["#9a6e4c", "#6d4b33", "#3b281b"], oak: ["#ddc29c", "#b48c5c", "#85663f"], steel: ["#5d6268", "#2b2e32", "#141517"],
  acrylic: ["#c3d4da", "#7f949c", "#4d5f66"], tansu: ["#b2703f", "#7d4426", "#43210f"], lowpoly: ["#d2a26c", "#9c6b43", "#55361f"],
  "lowpoly-birch": ["#f1e6d0", "#d3c3a4", "#8f7b5c"], "lowpoly-ebony": ["#634a3a", "#3a2a22", "#171110"], "lowpoly-stone": ["#b4b8ba", "#7c8186", "#3b3f43"],
  "lowpoly-moss": ["#97805c", "#6c553b", "#2f2418"], "lowpoly-snow": ["#be9363", "#8f6440", "#3f2918"],
};
const skinStyle = (k: string) => { const [hi, mid, lo] = WOODS[k] ?? WOODS.walnut; return `--w-hi:${hi};--w:${mid};--w-lo:${lo}`; };

function themeBlock() {
  const p = themePrefs(), all = allPalettes();
  const usesCustom = p.mode === "fixed" ? p.fixed === CUSTOM : p.slots.some(s => s.p === CUSTOM);
  return `
    ${seg("theme-mode", [{ v: "fixed", label: t("いつも同じ") }, { v: "time", label: t("時刻で移ろう") }], p.mode)}
    ${p.mode === "fixed"
      ? `<div class="set-sws">${all.map(a => swatch(a.key, a.label, a.key === p.fixed, p)).join("")}</div>`
      : `${dayBar(p)}<div class="set-slots">${p.slots.map((s, i) => `
          <div class="set-slot" data-slot="${i}">
            <b>${esc(t(s.label))}</b>
            <input type="time" value="${s.at}" aria-label="${esc(t(s.label))}" step="300">
            <div class="set-sws small">${all.map(a => swatch(a.key, a.label, a.key === s.p, p, true)).join("")}</div>
          </div>`).join("")}
        </div>
        ${row(t("移り変わり"), seg("fade", FADES.map(f => ({ v: String(f.m), label: t(f.label) })), String(p.fade)))}`}
    ${usesCustom ? `<div class="set-row">
      <label class="set-color">${t("地")}<input type="color" data-custom="bg" value="${p.custom.bg}"></label>
      <label class="set-color">${t("灯り")}<input type="color" data-custom="accent" value="${p.custom.accent}"></label></div>` : ""}`;
}

function roomTab() {
  const q = prefs(), r = roomSurface();
  return `
    ${sec(t("色"), themeBlock())}
    ${sec(t("棚"), tiles("skin", SHELF_SKINS, shelfSkin(), "set-skin"))}
    ${sec(t("壁"), tiles("wall", WALLS, r.wall, "set-wall"))}
    ${sec(t("床"), tiles("floor", FLOORS, r.floor, "set-floor") + (r.floor !== "none" ? `<span class="set-sub">${t("ラグ")}</span>${tiles("rug", RUGS, r.rug, "set-rug")}` : ""))}
    ${sec(t("窓の外"), `${chips("scene", WINDOW_SCENES.map(s => ({ v: s.key, label: t(s.label) })), windowScene())}${check("set-rain", windowRain(), t("雨を降らせる"))}`)}
    ${fold("room-more", t("もっと見る"), `
      ${row(t("天井の吊りもの"), seg("hanging", [{ v: "off", label: t("なし") }, { v: "mobile", label: t("モビール") }, { v: "lamp", label: t("吊りランプ") }, { v: "mirrorball", label: t("ミラーボール") }], q.hanging))}
      ${row(t("香り"), seg("scent", [{ v: "off", label: t("なし") }, { v: "coffee", label: t("コーヒー") }, { v: "incense", label: t("お香") }], q.scent))}
      <div class="set-checks">
        ${check("set-roomlight", roomLightOn(), t("部屋の明かりも時刻で変える"))}
        ${check("set-decor", q.decor, t("季節の飾り"))}
        ${check("set-stars", q.stars, t("深夜の星空"))}
        ${check("set-umbrella", q.umbrella, t("雨の日は傘立て"))}
        ${check("set-marks", q.marks, t("棚板に暮らした跡を残す"))}
      </div>
      <span class="set-sub">${t("棚の上の小物")}</span>
      <div class="set-checks">${OBJECTS.map(o => `<label class="set-check"><input type="checkbox" data-obj="${o.key}"${objectShown(o.key) ? " checked" : ""}>${esc(t(o.label))}</label>`).join("")}</div>`)}`;
}
const chips = (name: string, items: { v: string; label: string }[], cur: string) =>
  `<div class="set-chips" role="radiogroup" data-seg="${name}">${items.map(i => `<button type="button" role="radio" data-v="${esc(i.v)}" aria-checked="${i.v === cur}">${esc(i.label)}</button>`).join("")}</div>`;

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
    ${fold("cats-more", t("もっと見る"), `
      ${check("set-zoomies", q.catZoomies, t("夜中にときどき駆け回る（夜の運動会）"))}
      ${row(t("よく聴くアルバムをくわえてきたら"), seg("mischief", [{ v: "off", label: t("させない") }, { v: "queue", label: t("次に再生に入れる") }, { v: "play", label: t("そのまま再生する") }], q.catMischief))}`)}`;
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
      <span class="set-sub">Google Drive</span>
      <div class="set-source"><b>${d.configured ? esc(d.folder ?? t("フォルダ未選択")) : t("使っていません")}</b><span>${d.configured ? (d.signedIn ? t("サインイン中") : t("サインインが切れています")) : ""}</span></div>
      ${d.signedIn ? `<div class="set-row set-btns"><button type="button" class="set-btn" id="set-drive-out">${t("サインアウト")}</button></div>` : ""}
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
      ${check("set-map", mapRecording(), t("聴いた場所を記録する"))}
      <div class="set-row set-btns">
        <button type="button" class="set-btn danger" id="set-clear-log">${t("聴いた記録を消す")}</button>
        <button type="button" class="set-btn danger" id="set-reset">${t("すべて初期化する")}</button>
      </div>`)}
    ${fold("keys", t("キーボード"), `
      <ul class="set-keys">${ACTIONS.map(a => `<li><span>${esc(t(a.label))}</span><button type="button" class="set-key" data-key="${a.id}">${esc(keyLabel(keyFor(a.id)))}</button></li>`).join("")}</ul>
      <div class="set-row set-btns"><button type="button" class="set-btn" id="set-keys-reset">${t("既定に戻す")}</button></div>`)}
    ${fold("spotify", "Spotify", spotifySettingsHTML(t))}
    ${fold("about", t("Kona について"), aboutSection())}`;
}

function aboutSection() {
  return `
    <dl class="set-about">
      <dt>${t("版")}</dt><dd>${esc(pkg.version)}</dd>
      <dt>${t("ライセンス")}</dt><dd>MIT（${t("無保証")}）</dd>
      <dt>${t("ソース")}</dt><dd><a href="https://github.com/wentolia/kona" target="_blank" rel="noopener">github.com/wentolia/kona</a></dd>
    </dl>
    <ul class="set-privacy">
      <li>${t("サーバーはなく、アクセス解析もしません。設定・記録・取り込んだ曲は、このブラウザの中にだけ置きます。")}</li>
      <li>${t("通信するのは Google Drive を使うときの Google の API、Spotify を使うときの Spotify、地図を置いたときの地図の画像だけです。")}</li>
      <li>${t("Google Drive は読み取りだけで、サインインはこのタブの中だけ（約 1 時間）有効です。")}</li>
      <li>${t("聴いた場所は約 100 m の粗さに丸めて、この端末にだけ残します。")}</li>
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
  const content = { room: roomTab, cats: () => catsTab(hooks), sound: () => soundTab(hooks), other: () => otherTab(hooks) }[tab]();
  root.innerHTML = `
  <div class="set">
    <header class="set-head">
      <h2>${esc(t("設定"))}</h2>
      <a href="#home" class="set-close" aria-label="${esc(t("閉じる"))}" title="${esc(t("閉じる"))} (Esc)">×</a>
    </header>
    <nav class="set-tabs" role="tablist" aria-label="${esc(t("設定"))}">${TABS.map(x => `<button type="button" role="tab" data-tab="${x.id}" aria-selected="${x.id === tab}">${esc(t(x.label))}</button>`).join("")}</nav>
    <div class="set-body" role="tabpanel">${content}</div>
  </div>`;
  root.querySelector(".set-body")!.scrollTop = scroll;
  wire(root);
  navigator.storage?.estimate?.().then(e => {
    const n = root?.querySelector("#set-storage");
    if (n && e.usage !== undefined) n.textContent = `${t("このブラウザで Kona が使っている容量")}: ${mb(e.usage)}${e.quota ? ` / ${mb(e.quota)}` : ""}`;
  }).catch(() => {});
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
      case "rug": setRoomSurface({ rug: v }); break;
    }
    again();
  });

  // 区切りの選択
  el.querySelectorAll<HTMLElement>("[data-seg]").forEach(g => g.onclick = e => {
    const v = (e.target as HTMLElement).closest<HTMLElement>("[data-v]")?.dataset.v;
    if (v === undefined) return;
    switch (g.dataset.seg) {
      case "theme-mode": setThemePrefs({ mode: v as ThemePrefs["mode"] }); return again();
      case "fade": setThemePrefs({ fade: Number(v) }); return again();
      case "font-scale": return setP({ fontScale: Number(v) });
      case "font": return setP({ font: v as Prefs["font"] });
      case "motion": return setP({ motion: v as Prefs["motion"] });
      case "hanging": return setP({ hanging: v as Prefs["hanging"] });
      case "scent": return setP({ scent: v as Prefs["scent"] });
      case "normalize": h.player.setNormalize(v as Normalize); return again();
      case "crossfade": return setP({ crossfade: Number(v) });
      case "mischief": return setP({ catMischief: v as Prefs["catMischief"] });
      case "group": return setP({ libGroup: v as Prefs["libGroup"] }); // 描き直しは本体が "kona:prefs" で
      case "blank": setP({ blankArt: v as Prefs["blankArt"] }); return h.redraw();
      case "scene": setWindowScene(v); return again();
      case "lang":
        if (v === prefs().lang) return;
        setPrefs({ lang: v as Prefs["lang"] });
        location.reload(); // 文字はあちこちで描いているので、開き直して全体を替える
    }
  });

  // テーマカラー
  el.querySelectorAll<HTMLElement>("[data-pal]").forEach(b => b.onclick = () => {
    const key = b.dataset.pal!, slot = b.closest<HTMLElement>("[data-slot]"), p = themePrefs();
    if (!slot) setThemePrefs({ fixed: key });
    else setThemePrefs({ slots: p.slots.map((s, i) => i === Number(slot.dataset.slot) ? { ...s, p: key } : s) });
    again();
  });
  on<HTMLInputElement>(".set-slot input[type=time]", "change", inp => {
    if (!inp.value) return;
    const i = Number(inp.closest<HTMLElement>("[data-slot]")!.dataset.slot);
    setThemePrefs({ slots: themePrefs().slots.map((s, k) => k === i ? { ...s, at: inp.value } : s) });
    again();
  });
  // 色を選んでいる間は描き直さない（選ぶ窓が閉じてしまう）。部屋の色だけをその場で替え、決まったら見本も描き直す
  on<HTMLInputElement>("[data-custom]", "input", inp => setThemePrefs({ custom: { ...themePrefs().custom, [inp.dataset.custom!]: inp.value } }));
  on<HTMLInputElement>("[data-custom]", "change", again);

  // 見た目・部屋
  on<HTMLInputElement>("#set-roomlight", "change", c => setRoomLight(c.checked));
  on<HTMLInputElement>("#set-decor", "change", c => setPrefs({ decor: c.checked }));
  on<HTMLInputElement>("#set-stars", "change", c => setPrefs({ stars: c.checked }));
  on<HTMLInputElement>("#set-marks", "change", c => setPrefs({ marks: c.checked }));
  on<HTMLInputElement>("#set-umbrella", "change", c => setPrefs({ umbrella: c.checked }));
  on<HTMLInputElement>("#set-rain", "change", c => setWindowRain(c.checked));
  on<HTMLInputElement>("[data-obj]", "change", c => setObjectShown(c.dataset.obj!, c.checked));

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

  // 猫
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
  on<HTMLInputElement>("#set-map", "change", c => setMapRecording(c.checked));
  on("#set-clear-log", "click", clearRecords);
  on("#set-reset", "click", resetAll);

  // キーボード: 押したボタンが「キーを押してください」になり、次に押したキーを覚える（Esc でやめる、Backspace でなしに）
  on<HTMLButtonElement>(".set-key", "click", b => {
    const id = b.dataset.key!;
    b.textContent = t("キーを押す…"); b.classList.add("rec"); setRecording(true);
    const stop = () => { removeEventListener("keydown", onKey, true); b.removeEventListener("blur", stop); setRecording(false); again(); };
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === "Escape") return stop();
      if (e.key === "Backspace" || e.key === "Delete") { setKey(id, ""); return stop(); }
      const c = comboOf(e);
      if (!c) return;
      setKey(id, c); stop();
    };
    addEventListener("keydown", onKey, true);
    b.addEventListener("blur", stop);
  });
  on("#set-keys-reset", "click", () => { resetKeys(); again(); });
}
