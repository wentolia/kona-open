// タグとアルバムのセット: フォルダやアルバムに自分で札をつけ、検索（tag:）と、ホーム・ライブラリに出すアルバムの切り替えに使う。
// タグはパス（フォルダかアルバムのフォルダ）につける。アルバムのタグは、そのフォルダと上のフォルダすべてのタグを合わせたもの。
// セットは「すべて」（既定）か「あるタグのアルバムだけ」か「あるタグ以外」。開き直すと「すべて」に戻る。
// リスニングパーティーで送るアルバムを絞るときも、同じ inSet を使う。
import type { Album } from "./library";
import { esc, collator } from "./dom";
import "./tags.css";

const KEY = "kona.tags";
type TagMap = Record<string, string[]>;
let map: TagMap = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v as TagMap : {};
  } catch { return {}; }
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* 保存できなくても動く */ } };

/** タグの名前をそろえる（前後の空白を落とし、中の空白は 1 つに） */
export const cleanTag = (s: string) => s.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 40);

/** そのパスに直接ついているタグ */
export const ownTags = (path: string): string[] => map[path] ?? [];

/** アルバムのタグ: アルバムのフォルダ・その上のフォルダ・棚（Spotify のようにパスを持たないものの括り）につけたものを合わせる */
export function tagsOf(a: Album): string[] {
  const out = new Set<string>(map[a.shelf] ?? []);
  const parts = a.key.split("/");
  for (let i = 1; i <= parts.length; i++) for (const t of map[parts.slice(0, i).join("/")] ?? []) out.add(t);
  return [...out];
}

/** どこかについているタグすべて（名前の順） */
export const allTags = (): string[] => [...new Set(Object.values(map).flat())].sort(collator.compare);

/** パスにタグをつける・外す */
export function setTag(paths: string[], tag: string, on: boolean) {
  tag = cleanTag(tag);
  if (!tag) return;
  for (const p of paths) {
    const cur = new Set(map[p] ?? []);
    on ? cur.add(tag) : cur.delete(tag);
    if (cur.size) map[p] = [...cur]; else delete map[p];
  }
  save();
  // いま選んでいるセットのタグがどこにもなくなったら「すべて」に戻す
  if (active && !allTags().includes(active.tag)) active = null;
  document.dispatchEvent(new CustomEvent("kona:tags"));
}

// ---------- アルバムのセット ----------
export interface AlbumSet { tag: string; not: boolean }
let active: AlbumSet | null = null;

/** いま選んでいるセット（null は「すべて」） */
export const currentSet = () => active;
/** そのアルバムがセットに入るか（既定はいま選んでいるセット） */
export function inSet(a: Album, s: AlbumSet | null = active) {
  if (!s) return true;
  return tagsOf(a).includes(s.tag) !== s.not;
}
export const setLabel = (s: AlbumSet | null) => !s ? "すべて" : s.not ? `${s.tag} 以外` : s.tag;
export function selectSet(s: AlbumSet | null) {
  active = s;
  document.dispatchEvent(new CustomEvent("kona:tags"));
}

/** 上の帯のタブ: すべて・タグごと。選んでいるタグをもう一度押すと「そのタグ以外」、さらに押すと「すべて」 */
export function setTabsHTML() {
  const tags = allTags();
  if (!tags.length) return "";
  const tab = (label: string, on: boolean, tag = "", not = false) =>
    `<button data-tag="${esc(tag)}" aria-pressed="${on}"${not ? ' class="not"' : ""}${tag ? ` title="${esc(on && !not ? `もう一度押すと「${tag} 以外」` : tag)}"` : ""}>${esc(label)}</button>`;
  return tab("すべて", !active) + tags.map(tg => {
    const on = active?.tag === tg;
    return tab(on && active!.not ? `${tg} 以外` : tg, on, tg, on && active!.not);
  }).join("");
}
export function onSetTabClick(e: Event) {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-tag]");
  if (!b) return;
  const tag = b.dataset.tag!;
  if (!tag) return selectSet(null);
  if (active?.tag !== tag) return selectSet({ tag, not: false });
  selectSet(active.not ? null : { tag, not: true });
}

// ---------- タグをつける小さなパネル（フォルダの箱・曲目パネル・複数選択の帯から） ----------
/** paths（フォルダかアルバムのパス）のタグを編集する。inherited はそのまま見せるだけのタグ（上のフォルダのもの） */
export function openTagEditor(anchor: HTMLElement, paths: string[], title: string, inherited: string[] = []) {
  closeTagEditor();
  const el = document.createElement("div");
  el.id = "tag-pop"; el.className = "pop-menu tag-pop"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", `${title} のタグ`);
  const paint = () => {
    const tags = [...new Set([...allTags(), ...inherited])].sort(collator.compare);
    const state = (tg: string) => {
      const n = paths.filter(p => ownTags(p).includes(tg)).length;
      return n === paths.length ? "true" : n ? "mixed" : "false";
    };
    el.innerHTML = `<div class="tag-title">${esc(title)}</div>
      <div class="tag-chips">${tags.map(tg => inherited.includes(tg) && state(tg) === "false"
        ? `<span class="tag-chip inherited" title="上のフォルダのタグ">${esc(tg)}</span>`
        : `<button class="tag-chip" data-t="${esc(tg)}" aria-pressed="${state(tg)}">${esc(tg)}</button>`).join("")}</div>
      <input class="tag-new" type="text" placeholder="新しいタグ" aria-label="新しいタグ" maxlength="40" autocomplete="off">`;
    const input = $in(el);
    input.onkeydown = e => {
      if (e.key !== "Enter" || e.isComposing) return;
      const tg = cleanTag(input.value);
      if (tg) { setTag(paths, tg, true); paint(); $in(el).focus(); }
    };
  };
  el.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-t]");
    if (!b) return;
    setTag(paths, b.dataset.t!, b.getAttribute("aria-pressed") !== "true");
    paint();
  };
  paint();
  document.body.append(el);
  const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = `${Math.max(16, Math.min(r.left, innerWidth - w - 16))}px`;
  el.style.top = `${r.bottom + 6 + h > innerHeight - 8 ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;
  $in(el).focus();
}
const $in = (el: HTMLElement) => el.querySelector<HTMLInputElement>(".tag-new")!;
export const closeTagEditor = () => document.getElementById("tag-pop")?.remove();
addEventListener("pointerdown", e => { if (!(e.target as HTMLElement).closest("#tag-pop, [data-tag-edit]")) closeTagEditor(); });
addEventListener("keydown", e => { if (e.key === "Escape") closeTagEditor(); });
