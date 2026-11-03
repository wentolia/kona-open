// アルバムの並べ替えと検索（画面に依らない、純粋な関数）
import type { Album } from "./library";
import type { SortKey } from "./shelves";
import { stat } from "./store";
import { collator } from "./dom";
import { tagsOf } from "./tags";
import { moodOf, hsl } from "./shelves";

/** 文字列から決まった数を作る（FNV-1a）。色や日替わりの並びに使う */
export function hashOf(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return Math.abs(h); }

/** 最後に聴いた日時の新しい順 */
export const byLast = (x: Album, y: Album) => stat(y.key).last - stat(x.key).last;

// 検索: 空白区切りの語をすべて含むもの。artist: / genre: / year: / folder: / tag: / mood:（a: g: y: f: t: m:）で項目を指定できる。頭に - をつけると「含まない」。
// 空白を含む値は "…" で囲む（folder:"Jazz Classics"）
export const norm = (s: string) => s.normalize("NFKC").toLowerCase();
export function matches(a: Album, q: string) {
  return (norm(q).match(/-?[^\s"]*"[^"]*"?|\S+/g) ?? []).map(t => t.replace(/"/g, "")).filter(Boolean).every(tok => {
    const not = tok.length > 1 && tok.startsWith("-");
    return hit(a, not ? tok.slice(1) : tok) !== not;
  });
}
function hit(a: Album, tok: string) {
  const m = tok.match(/^(artist|a|genre|g|year|y|folder|f|tag|t|mood|m):(.+)$/);
  if (!m) return norm([a.title, a.artist, a.dir, a.shelf, a.genre ?? "", a.year ?? "", ...tagsOf(a)].join(" ")).includes(tok);
  const [, k, v] = m;
  if (k[0] === "y") {
    const [lo, hi = lo] = v.split("-").map(Number);
    return !!a.year && a.year >= lo && a.year <= hi;
  }
  if (k[0] === "t") return tagsOf(a).some(tg => norm(tg).includes(v));
  if (k[0] === "m") return norm(moodOf(a.color)) === v;
  return norm(k[0] === "a" ? a.artist : k[0] === "g" ? a.genre ?? "" : a.shelf).includes(v);
}

export function sortAlbums(list: Album[], key: SortKey) {
  const by: Record<SortKey, (x: Album, y: Album) => number> = {
    title: (x, y) => collator.compare(x.title, y.title),
    artist: (x, y) => collator.compare(x.artist, y.artist) || collator.compare(x.title, y.title),
    year: (x, y) => (y.year ?? 0) - (x.year ?? 0),
    // 古い順: 年のないものは最後に。同じ年は題名の順
    yearAsc: (x, y) => (x.year ?? Infinity) - (y.year ?? Infinity) || collator.compare(x.title, y.title),
    plays: (x, y) => stat(y.key).plays - stat(x.key).plays,
    last: byLast,
    // ジャケットの平均色の色相の順（色が流れるように）
    hue: (x, y) => (hsl(x.color)?.[0] ?? 0) - (hsl(y.color)?.[0] ?? 0),
  };
  return [...list].sort(by[key]);
}
