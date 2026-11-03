// 設定（#settings）: 部屋の右に開く細い板。部屋はそのまま見えているので、変えたものはその場で部屋に映る（スマホでは全画面）。
// 部屋・モジュール・猫・音・その他の 5 つのタブに分け（スマホ版は部屋・音・その他の 3 つ）、よく触るものを上に、残りは「もっと見る」に畳む。説明文はなるべく置かない。

import "./settings.css";
import { PALETTES, CUSTOM, themePrefs, setThemePrefs, paletteColors, toHex, type ThemePrefs } from "./theme";
import { roomLightOn, setRoomLight } from "./mod-window";
import { SHELF_SKINS, shelfSkin, setShelfSkin } from "./shelf-skin";
import { WALLS, FLOORS, roomSurface, setRoomSurface } from "./room-surface";
import { THINGS, countOf, toggleThing, thingThumb } from "./room-things";
import { OBJECTS, objectAvailable, objectArt } from "./mod-objects";
import { chimeOn, setChime } from "./mod-clock";
import { prefs, setPrefs, type Prefs } from "./prefs";
import { NOISES, noiseLevel, setNoiseLevel } from "./noise";
import { BANDS, BUILTIN_PRESETS, userPresets, savePreset, deletePreset, presetMatching } from "./eq";
import { BREEDS, type Coat } from "./cat";
import { nameOf } from "./cat-coat";
import { ACTIONS, keyFor, keyLabel } from "./shortcuts";
import { t } from "./i18n";
import type { Player, Normalize } from "./player";
import { spotifySettingsHTML, wireSpotifySettings } from "./spotify-ui";
import { openDrive } from "./drive-ui";
import { saveDriveConfig, signOut as driveSignOut } from "./drive";
import pkg from "../package.json";
import { esc } from "./dom";
import { docHref } from "./doc-link";
import { regionAllows, regionalOn, setRegionalOn, hereLand, hereProgress, locate, locateStatus, landName, nextOf, gotList, regionalItems, GIFT_SEC } from "./region";
import { itemOf } from "./items";
import { catCap, ownedAccs, presentAllows, presentStats, ACHIEVEMENTS, achieved } from "./presents";

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
  /** 棚の小物: 置いてある棚の名前、しまう */
  goods: { shelfOf(key: string): string | undefined; putAway(key: string): void };
  modules: ModuleHooks;
  /** 猫と遊ぶ（ホームの「＋」にあったもの） */
  play: { canPick(): boolean; pick(): void; wandOn(): boolean; toggleWand(): void };
  /** 飼い猫 */
  cats(): Coat[];
  /** 遊びに来ている通りすがりの猫 */
  stray(): Coat | undefined;
  adoptStray(): boolean;
  removeCat(i: number): void;
  changeCat(i: number, change: { name?: string; acc?: string }): void;
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

/** スマホ版: 棚の一覧だけで、部屋（壁・床・置くもの）・モジュール・猫はない */
const onMobile = () => document.body.classList.contains("mobile");

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
    ${row(t("部屋の明かり"), seg("roomlight", [{ v: "time", label: t("時刻に合わせる") }, { v: "fixed", label: t("いつも同じ") }], roomLightOn() ? "time" : "fixed"))}
    ${p.fixed === CUSTOM ? `<div class="set-row">
      <label class="set-color">${t("地")}<input type="color" data-custom="bg" value="${p.custom.bg}"></label>
      <label class="set-color">${t("灯り")}<input type="color" data-custom="accent" value="${p.custom.accent}"></label></div>` : ""}`;
}

function roomTab() {
  const q = prefs(), r = roomSurface();
  // スマホ版には部屋がないので、色と棚の素材だけ
  if (onMobile()) return `
    ${sec(t("色"), themeBlock())}
    ${sec(t("棚"), tiles("skin", SHELF_SKINS, shelfSkin(), "set-skin"))}`;
  return `
    ${sec(t("色"), themeBlock())}
    ${sec(t("棚"), tiles("skin", SHELF_SKINS, shelfSkin(), "set-skin"))}
    ${sec(t("壁"), tiles("wall", WALLS, r.wall, "set-wall"))}
    ${sec(t("床"), tiles("floor", FLOORS, r.floor, "set-floor"))}
    ${sec(t("置くもの"), putBlock(hooks))}
    ${sec(t("プレゼント"), presentBlock())}
    ${sec(t("ご当地の品"), regionalBlock())}
    ${fold("room-more", t("もっと見る"), `
      <div class="set-checks">
        ${check("set-marks", q.marks, t("棚板に暮らした跡を残す"))}
      </div>`)}`;
}

// 置くもの: 小物と家具の見本を並べ、ホームの棚・床へドラッグして置く。見本を押すか、ホームからここへ戻すとしまう。
// 位置は自動（家具は床で左右に動かせる）、大きさはホームで角のつまみを引いて変える（size-knob.ts）
function putBlock(h: SettingsHooks) {
  const tile = (id: string, label: string, at: string | undefined, art: string) =>
    `<button type="button" class="set-put${at ? " placed" : ""}" data-put="${id}" aria-pressed="${!!at}" title="${esc(at ? `${label}（${at}）。押すとしまう` : `${label}: ホームへドラッグして置く`)}">
      <span class="set-put-art">${art}</span><span class="set-put-label">${esc(label)}</span>${at && /^\d+$/.test(at) ? `<span class="set-put-n">×${at}</span>` : ""}</button>`;
  const placed = (k: string) => { const n = countOf(k); return n ? (n > 1 ? `${n}` : t("置いた")) : undefined; };
  const things = (at: string) => THINGS.filter(x => x.at === at && regionAllows(x.key) && presentAllows(x.key)).map(x => tile(`thing:${x.key}`, t(x.label), placed(x.key), "")).join("");
  return `
    <p class="set-note">${t("ホームの棚・床・壁へドラッグして置く（家具はいくつでも）。ここへ戻すとしまう。ダブルクリックで左右を反転")}</p>
    <div class="set-puts-head">${t("棚に置く")}</div>
    <div class="set-puts">${OBJECTS.filter(o => objectAvailable(o.key)).map(o => tile(`obj:${o.key}`, t(o.label.replace(/（.*）/, "")), h.goods.shelfOf(o.key), "")).join("")}</div>
    <div class="set-checks">${check("set-chime", chimeOn(), t("時計が正時に鐘を鳴らす"))}</div>
    <div class="set-puts-head">${t("床に置く")}</div>
    <div class="set-puts">${things("floor")}</div>
    <div class="set-puts-head">${t("壁に掛ける")}</div>
    <div class="set-puts">${things("wall")}</div>`;
}

// プレゼント: 聴いていると包みが届く（presents.ts）。包みはホームの床に置かれ、押すと開く
function presentBlock() {
  const p = presentStats(), done = new Map(achieved().map(a => [a.id, a.d]));
  return `
    <p class="set-note">${t("音楽を 30 分聴くごとに、その日はじめて聴いたときに、包みがひとつ届きます（1 日 5 つまで）。包みはホームの床に置かれ、押すと開きます")}</p>
    <div class="set-row"><span>${t("今日届いた包み")} ${p.today} / ${p.cap}${p.today < p.cap ? ` · ${t("次まで")} ${t("あと")} ${p.left} ${t("分")}` : ""}</span></div>
    <span class="set-sub">${t("届いた品")} ${p.owned} / ${p.all} · ${t("アクセサリー")} ${p.accs} / ${p.accAll} · ${t("飼える猫")} ${p.cats} / ${p.catMax} ${t("匹")}</span>
    ${fold("ach-list", `${t("実績の一覧")} ${done.size} / ${Object.keys(ACHIEVEMENTS).length}`, `<ul class="set-ach">${Object.entries(ACHIEVEMENTS).map(([id, a]) => {
      const d = done.get(id), it = itemOf(a.item);
      return `<li class="${d ? "done" : ""}"><b>${d ? "✓ " : ""}${esc(t(a.label))}</b><span>${esc(t(a.how))}</span><span class="set-ach-item">${it ? esc(t(it.label)) : ""}${d ? ` · ${esc(d.slice(5).replace("-", "/"))}` : ""}</span></li>`;
    }).join("")}</ul>`)}`;
}

// ご当地の品: いる土地で聴くと、その土地の品が届く（region.ts）。届いた品は「置くもの」に出る
function regionalBlock() {
  const on = regionalOn(), here = hereLand(), s = locateStatus(), got = gotList(), all = regionalItems().length;
  const next = here ? nextOf(here) : undefined, left = Math.max(1, Math.ceil(GIFT_SEC * (1 - hereProgress()) / 60));
  const where = s === "asking" ? t("土地を調べています…")
    : s === "denied" ? t("位置情報が許可されていません。ブラウザのサイトの設定で許可できます")
    : s === "unsupported" ? t("このブラウザは位置情報を使えません")
    : s === "unknown" ? t("土地が分かりませんでした")
    : here ? `${t("いま")}: ${esc(landName(here))} · ${next ? `${t("あと")} ${left} ${t("分聴くと")}「${esc(t(next.label))}」${t("が届きます")}` : t("この土地の品はみんな届きました")}` : "";
  const tag = (g: { from?: string; at: string; d: string }) =>
    `${g.from ? `${esc(g.from)}${t("さんの部屋で")}（${esc(landName(g.at))}）` : `${esc(landName(g.at))}${t("で")}`} · ${esc(g.d.slice(5).replace("-", "/"))}`;
  return `
    <p class="set-note">${t("いる土地（都道府県・国）で合わせて 30 分聴くと、その土地らしい品がひとつ届きます。パーティーでは、ホストの土地の品が届きます")}</p>
    <div class="set-checks">${check("set-regional", on, t("いる土地の品を受け取る（位置情報を使う）"))}</div>
    <p class="set-note">${t("位置情報は 1 日 1 回だけ使い、端末の中で都道府県・国に置き換えます。座標は保存も送信もしません")}</p>
    ${on ? `<div class="set-row"><span>${where}</span>${s === "asking" ? "" : `<button type="button" class="set-btn" id="set-regional-again">${t("調べ直す")}</button>`}</div>` : ""}
    <span class="set-sub">${t("届いた品")} ${got.length} / ${all}</span>
    ${got.length ? `<ul class="set-got">${got.map(g => `<li><b>${esc(t(itemOf(g.key)?.label ?? g.key))}</b> <span>${tag(g)}</span></li>`).join("")}</ul>` : ""}`;
}

// 音: モジュールを置かなくても、出力先・イコライザー・重ねる音をここで変えられる（モジュールと同じものを動かす）
function soundTab(h: SettingsHooks) {
  const p = h.player, eq = p.eq, cur = eq.on ? presetMatching(eq.gains) : undefined, q = prefs();
  const preset = (name: string, gains: number[], user: boolean) => `
    <li class="set-preset${cur === name ? " on" : ""}">
      <button type="button" class="set-preset-apply" data-preset="${esc(name)}" aria-pressed="${cur === name}">
        <svg viewBox="0 0 ${BANDS.length * 6} 24" aria-hidden="true">${gains.map((g, i) => `<rect x="${i * 6 + 1}" y="${12 - Math.max(0, g)}" width="4" height="${Math.max(1, Math.abs(g))}"/>`).join("")}</svg>
        <span>${esc(user ? name : t(name))}</span></button>
      ${user ? `<button type="button" class="set-x" data-del-preset="${esc(name)}" aria-label="${esc(t("消す"))}">×</button>` : ""}
    </li>`;
  return `
    ${sec(t("出力先"), `<select id="set-sink" aria-label="${esc(t("出力先"))}"${p.canChooseSink ? "" : " disabled"}><option value="">${t("既定の出力")}</option></select>`)}
    ${sec(t("イコライザー"), `
      ${check("set-eq-on", eq.on, t("イコライザーを使う"))}
      <ul class="set-presets">${BUILTIN_PRESETS.map(x => preset(x.name, x.gains, false)).join("")}${userPresets().map(x => preset(x.name, x.gains, true)).join("")}</ul>
      ${eq.on && !cur ? `<form class="set-row set-save" id="set-save-preset"><span>${t("いまの形を残す")}</span><input id="set-preset-name" maxlength="24" placeholder="${esc(t("名前"))}" autocomplete="off"><button class="set-btn">${t("残す")}</button></form>` : ""}`)}
    ${sec(t("曲のつなぎ"), seg("crossfade", [{ v: "0", label: t("ギャップレス") }, { v: "3", label: "3 " + t("秒") }, { v: "6", label: "6 " + t("秒") }, { v: "10", label: "10 " + t("秒") }], String(q.crossfade)))}
    ${fold("sound-more", t("もっと見る"), `
      <span class="set-sub">${t("重ねる音")}</span>
      <div class="set-noise">${NOISES.map(n => `<label class="set-noise-row"><span>${esc(t(n.label))}</span><input type="range" min="0" max="100" step="1" data-noise="${n.key}" value="${Math.round(noiseLevel(n.key) * 100)}" aria-label="${esc(t(n.label))}"></label>`).join("")}</div>
      ${row(t("音量の正規化"), seg("normalize", [{ v: "off", label: t("しない") }, { v: "track", label: t("曲ごと") }, { v: "album", label: t("アルバムごと") }], p.normalize))}`)}`;
}
/** 出力先の一覧は端末に尋ねてから入れる */
async function fillSinks(el: HTMLElement, p: Player) {
  const sel = el.querySelector<HTMLSelectElement>("#set-sink");
  if (!sel) return;
  let outs: MediaDeviceInfo[] = [];
  try { outs = (await navigator.mediaDevices?.enumerateDevices() ?? []).filter(d => d.kind === "audiooutput" && d.deviceId !== "default"); } catch { /* ignore */ }
  sel.innerHTML = `<option value="">${esc(t("既定の出力"))}</option>` + outs.map((d, i) => `<option value="${esc(d.deviceId)}">${esc(d.label || `${t("出力")} ${i + 1}`)}</option>`).join("");
  sel.value = p.sink;
  sel.disabled = !p.canChooseSink || !outs.length;
}

// モジュール: ホームでモジュールを押して選ぶと、ここにそのモジュールの設定だけが出る
function modulesTab(h: SettingsHooks) {
  const all = h.modules.tree().flat(2);
  if (openMod && !all.some(m => m.id === openMod)) openMod = undefined;
  const m = all.find(x => x.id === openMod);
  return `
    ${m ? sec(m.title !== m.label ? `${m.title} · ${m.label}` : m.title, `
      <div class="set-mod-body sm-form" data-mod="${esc(m.id)}">${h.modules.form(m.id)}</div>`)
    : `<p class="set-pick-hint">${esc(t("ホームのモジュールを押して選ぶ"))}</p>`}
    ${sec(t("モジュールを足す"), `
      <div class="set-chips">${h.modules.addable().map(a => `<button type="button" data-add-mod="${esc(a.type)}"${a.disabled ? " disabled" : ""}>＋ ${esc(a.label)}</button>`).join("")}</div>`)}`;
}

function catsTab(h: SettingsHooks) {
  const q = prefs(), cats = h.cats(), stray = h.stray(), cap = catCap(), accs = ownedAccs();
  const breed = (c: Coat) => t(BREEDS[c.breed ?? "mix"]?.name ?? BREEDS.mix.name);
  return `
    ${sec(`${t("飼い猫")} · ${cats.length} / ${cap} ${t("匹")}`, `
      <ul class="set-cats">${cats.map((c, i) => `
        <li data-cat="${i}">
          <input class="set-cat-name" value="${esc(c.name ?? "")}" placeholder="${esc(nameOf(c))}" maxlength="16" aria-label="${esc(t("名前"))}">
          <span class="set-cat-kind">${esc(breed(c))}</span>
          <select class="set-cat-acc" aria-label="${esc(t("アクセサリー"))}"><option value="">${t("アクセサリーなし")}</option>${accs.map(a => opt(a.key, t(a.label), a.key === c.acc)).join("")}</select>
          <button type="button" class="set-x set-cat-bye" aria-label="${esc(t("手放す"))}" title="${esc(t("手放す"))}">×</button>
        </li>`).join("")}
      </ul>
      <p class="set-note">${t("通りすがりの猫が気まぐれに遊びに来ます。気に入ったら飼い猫にできます（猫の名札を押しても）。品種は変えられません。飼える数はプレゼントで増えます（10 匹まで）")}</p>
      ${stray ? `<div class="set-row"><span>${t("遊びに来ている猫")}: <b>${esc(nameOf(stray))}</b>（${esc(breed(stray))}）</span><button type="button" class="set-btn" id="set-cat-adopt"${cats.length >= cap ? " disabled" : ""}>${t("飼い猫にする")}</button></div>` : ""}
      ${check("set-cats-hidden", q.catsHidden, t("猫を出さない"))}`)}
    ${sec(t("遊ぶ"), `
      <div class="set-row set-btns">
        <button type="button" class="set-btn" id="set-wand"${cats.length ? "" : " disabled"} aria-pressed="${h.play.wandOn()}">${h.play.wandOn() ? t("猫じゃらしをしまう") : t("猫じゃらしで遊ぶ")}</button>
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
        <button type="button" class="set-btn" id="set-pick"${h.play.canPick() ? "" : " disabled"}>${t("ランダムで1枚")}</button>
      </div>
      ${onMobile() ? row(t("括り方"), seg("group", [{ v: "folder", label: t("フォルダ") }, { v: "artist", label: t("アーティスト") }], q.libGroup)) : ""}`)}
    ${sec(t("表示と言語"), `
      ${row(t("文字の大きさ"), seg("font-scale", [{ v: ".9", label: t("小") }, { v: "1", label: t("標準") }, { v: "1.15", label: t("大") }, { v: "1.3", label: t("特大") }], String(q.fontScale)))}
      ${row(t("書体"), seg("font", [{ v: "gothic", label: t("ゴシック") }, { v: "mincho", label: t("明朝") }], q.font))}
      ${row(t("動き"), seg("motion", [{ v: "system", label: t("端末の設定に従う") }, { v: "reduce", label: t("減らす") }], q.motion))}
      ${row(t("言語"), seg("lang", [{ v: "ja", label: "日本語" }, { v: "en", label: "English" }], q.lang))}`)}
    ${fold("lib-more", t("ライブラリの細かな設定"), `
      ${row(t("ジャケットがないとき"), seg("blank", [{ v: "title", label: t("色と題名") }, { v: "initial", label: t("頭文字") }, { v: "plain", label: t("色だけ") }], q.blankArt))}
      ${check("set-autoscan", q.autoRescan, t("ほかのアプリから戻ってきたら、フォルダの変化を反映する"))}
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
      <dt>${t("決まりごと")}</dt><dd><a href="${docHref("privacy")}" target="_blank" rel="noopener">${t("プライバシーと利用条件")}</a> · <a href="./THIRD_PARTY_NOTICES.txt" target="_blank" rel="noopener">${t("使っているソフトウェアのライセンス")}</a></dd>
    </dl>
    <ul class="set-privacy">
      <li>${t("サーバーはなく、アクセス解析もしません。設定・記録・取り込んだ曲は、このブラウザの中にだけ置きます。")}</li>
      <li>${t("通信するのは Google Drive を使うときの Google の API、Spotify を使うときの Spotify、リスニングパーティーを使うときの公開の Nostr リレー（暗号化した接続情報だけ）、STUN サーバーとホストが設定した中継サーバー（どちらも IP アドレスが届きます）だけです。このページを置いている GitHub Pages も、開いた人の IP アドレスを記録します。")}</li>
      <li>${t("Google Drive は読み取りだけで、サインインはこのタブの中だけ（約 1 時間）有効です。")}</li>
      <li>${t("聴いた場所は記録しません。位置情報は「ご当地の品」をオンにしたときだけ 1 日 1 回使い、端末の中で都道府県・国に置き換えます。座標は保存も送信もしません。")}</li>
      <li>${t("リスニングパーティーでは、つながったホストと参加者の間でお互いの IP アドレスが見えます。通話のマイクは本人が入れたときだけ開き、Kona は録音しません。")}</li>
    </ul>`;
}

let root: HTMLElement | undefined;
let hooks: SettingsHooks;

export function initSettings(el: HTMLElement, h: SettingsHooks) {
  root = el; hooks = h;
  // 外で変わったもの（EQ のつまみ、Drive のサインインなど）を、開いているときだけ映す
  h.player.eq.subscribe(() => { if (!el.hidden && !el.contains(document.activeElement)) renderSettings(); });
  document.addEventListener("kona:regional", () => { if (!el.hidden) renderSettings(); });
  document.addEventListener("kona:presents", () => { if (!el.hidden && !el.contains(document.activeElement)) renderSettings(); });
}

export function renderSettings() {
  // 閉じているときは描かない（棚の小物を動かしたときなどに呼ばれる。描くと「モジュールを選ぶ」状態がホームに残り、モジュールが点線で囲まれて押せなくなる）
  if (!root || root.hidden) return;
  const body = root.querySelector(".set-body"), scroll = body?.scrollTop ?? 0;
  if ((tab === "modules" || tab === "cats") && onMobile()) tab = "room"; // スマホ版にはモジュールも猫もない
  if (tab !== "modules") hooks.modules.focus(undefined);
  document.body.classList.toggle("mod-picking", tab === "modules"); // ホームのモジュールを押すと選べる
  const content = { room: roomTab, modules: () => modulesTab(hooks), cats: () => catsTab(hooks), sound: () => soundTab(hooks), other: () => otherTab(hooks) }[tab]();
  root.innerHTML = `
  <div class="set">
    <header class="set-head">
      <h2>${esc(t("設定"))}</h2>
      <a href="#home" class="set-close" aria-label="${esc(t("閉じる"))}" title="${esc(t("閉じる"))} (Esc)">×</a>
    </header>
    <nav class="set-tabs" role="tablist" aria-label="${esc(t("設定"))}">${TABS.filter(x => !onMobile() || (x.id !== "modules" && x.id !== "cats")).map(x => `<button type="button" role="tab" data-tab="${x.id}" aria-selected="${x.id === tab}">${esc(t(x.label))}</button>`).join("")}</nav>
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
    const li = root?.querySelector<HTMLElement>(".set-mod-body");
    root?.querySelector(".set-body")?.scrollTo({ top: 0 });
    if (focusName && matchMedia("(pointer: fine)").matches) li?.querySelector<HTMLInputElement>("#sm-title")?.focus({ preventScroll: true });
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
  if (!await confirmDialog(t("聴いた記録を消す"), t("再生回数・最後に聴いた日・聴いた記録・聴いた距離を消します。元に戻せません。"), t("消す"))) return;
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
      case "roomlight": setRoomLight(v === "time"); return again();
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
  on<HTMLInputElement>("#set-regional", "change", c => setRegionalOn(c.checked));
  on("#set-regional-again", "click", () => locate(true));
  on<HTMLInputElement>("#set-marks", "change", c => setPrefs({ marks: c.checked }));
  on<HTMLInputElement>("#set-chime", "change", c => setChime(c.checked));
  // 置くもの: 小物の見本は今の姿の写し。置いてあるものを押すとしまう（置くのはホームへドラッグで。place-drag.ts）
  el.querySelectorAll<HTMLElement>("[data-put^='obj:'] .set-put-art").forEach(box => { const art = objectArt(box.closest<HTMLElement>("[data-put]")!.dataset.put!.slice(4)); if (art) box.append(art); });
  el.querySelectorAll<HTMLElement>("[data-put^='thing:'] .set-put-art").forEach(box => box.append(thingThumb(box.closest<HTMLElement>("[data-put]")!.dataset.put!.slice(6))));
  on("[data-put]", "click", b => {
    if (b.dataset.dragged) { delete b.dataset.dragged; return; }
    if (b.getAttribute("aria-pressed") !== "true") return;
    const [kind, k] = b.dataset.put!.split(":");
    if (kind === "obj") h.goods.putAway(k); else toggleThing(k, false);
    again();
  });

  // 音
  on("[data-preset]", "click", b => {
    const name = b.dataset.preset!, x = [...BUILTIN_PRESETS, ...userPresets()].find(y => y.name === name);
    if (x) { h.player.eq.setAll(x.gains); again(); }
  });
  on<HTMLInputElement>("#set-eq-on", "change", c => { if (c.checked !== h.player.eq.on) h.player.eq.toggle(); again(); });
  on<HTMLSelectElement>("#set-sink", "change", s => { void h.player.setSink(s.value); });
  on<HTMLInputElement>("[data-noise]", "input", r => setNoiseLevel(r.dataset.noise as typeof NOISES[number]["key"], Number(r.value) / 100));
  if (tab === "sound") void fillSinks(el, h.player);
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
  on("#set-cat-adopt", "click", () => { h.adoptStray(); again(); });
  on("[data-cat] .set-cat-bye", "click", b => { h.removeCat(Number(b.closest<HTMLElement>("[data-cat]")!.dataset.cat)); again(); });
  on<HTMLInputElement>(".set-cat-name", "change", i => h.changeCat(Number(i.closest<HTMLElement>("[data-cat]")!.dataset.cat), { name: i.value.trim() }));
  on<HTMLSelectElement>(".set-cat-acc", "change", s => h.changeCat(Number(s.closest<HTMLElement>("[data-cat]")!.dataset.cat), { acc: s.value }));
  on<HTMLInputElement>("#set-zoomies", "change", c => setP({ catZoomies: c.checked }));

  // ライブラリ
  on("#set-rescan", "click", () => h.rescan());
  on("#set-open", "click", b => h.openSource(b));
  on("#set-forget", "click", async () => {
    if (!await confirmDialog(t("フォルダを解除する"), t("覚えているフォルダ（と Google Drive のフォルダ）を忘れて、はじめの画面に戻ります。ファイルや聴いた記録は消えません。"), t("解除する"))) return;
    await h.forgetSource();
  });
  on<HTMLInputElement>("#set-autoscan", "change", c => setPrefs({ autoRescan: c.checked }));
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
