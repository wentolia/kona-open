// どのファイルでも使う小さな道具。タグやファイル名を HTML に入れるときは必ず esc() を通す

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
/** 文字を HTML の本文・属性に安全に入れる形にする（& < > " ' を文字参照に） */
export const esc = (s: string) => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** 秒を「分:秒」に */
export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** v を a 以上 b 以下に収める（a > b のときは a） */
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** 日本語の並び順（数字は数として、大文字小文字は区別しない） */
export const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });
