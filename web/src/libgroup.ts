// アルバムの括り方: フォルダごと / アーティストごと。ライブラリ・ホームの棚の仕切り・スマホの棚で共通。
// 設定は prefs().libGroup（設定ページと、ライブラリ上の切り替えで変える）
import type { Album } from "./library";
import { prefs, setPrefs, type Prefs } from "./prefs";
import { collator } from "./dom";

export type LibGroup = Prefs["libGroup"];
export const NO_ARTIST = "アーティスト不明";
export const libGroup = (): LibGroup => prefs().libGroup;
export const setLibGroup = (g: LibGroup) => setPrefs({ libGroup: g });

/** そのアルバムが入る括りの名前。アーティストはタグのアルバムアーティスト（なければアーティスト） */
export const groupKey = (a: Album, g = libGroup()) => g === "artist" ? (a.artist.trim() || NO_ARTIST) : a.shelf;


/** 括りごとにまとめる（中の並びは渡した順のまま）。括りは名前の順、アーティスト不明は最後 */
export function groupAlbums(list: Album[], g = libGroup()): [string, Album[]][] {
  const groups = new Map<string, Album[]>();
  for (const a of list) {
    const k = groupKey(a, g), arr = groups.get(k);
    if (arr) arr.push(a); else groups.set(k, [a]);
  }
  return [...groups.entries()].sort(([x], [y]) => Number(x === NO_ARTIST) - Number(y === NO_ARTIST) || collator.compare(x, y));
}
