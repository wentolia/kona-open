// アルバムの並べ替えと検索（画面に依らない、純粋な関数）
import type { Album } from "./library";
import type { SortKey } from "./shelves";
import { stat } from "./store";
import { collator } from "./dom";

/** 文字列から決まった数を作る（FNV-1a）。色や日替わりの並びに使う */
export function hashOf(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return Math.abs(h); }

/** 日替わりで並びが変わるシャッフル（同じ日なら同じ並び） */
export function dailyShuffle<T>(xs: T[], key: (x: T) => string): T[] {
  const day = new Date().toDateString();
  return [...xs].sort((a, b) => hashOf(key(a) + day) - hashOf(key(b) + day));
}

/** 最後に聴いた日時の新しい順 */
export const byLast = (x: Album, y: Album) => stat(y.key).last - stat(x.key).last;

// 検索: 空白区切りの語をすべて含むもの。artist: / genre: / year: / folder:（a: g: y: f:）で項目を指定できる
export const norm = (s: string) => s.normalize("NFKC").toLowerCase();
export function matches(a: Album, q: string) {
  return norm(q).split(/\s+/).filter(Boolean).every(tok => {
    const m = tok.match(/^(artist|a|genre|g|year|y|folder|f):(.+)$/);
    if (!m) return norm([a.title, a.artist, a.dir, a.shelf, a.genre ?? "", a.year ?? ""].join(" ")).includes(tok);
    const [, k, v] = m;
    if (k[0] === "y") {
      const [lo, hi = lo] = v.split("-").map(Number);
      return !!a.year && a.year >= lo && a.year <= hi;
    }
    return norm(k[0] === "a" ? a.artist : k[0] === "g" ? a.genre ?? "" : a.shelf).includes(v);
  });
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
  };
  return [...list].sort(by[key]);
}
