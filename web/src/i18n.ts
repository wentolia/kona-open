// 言語: 日本語（元の文）・英語・韓国語・中国語（簡体字）。文は日本語のまま書き、ほかの言語のときだけ表で置き換える。
// 表は i18n/<言語>.ts（キーは日本語の文）。韓国語・中国語の表にない文は英語で、英語の表にもない文は日本語のまま出す。
// 言語を替えたら画面を開き直す（文はあちこちで描いているため）。

import { prefs } from "./prefs";
import EN from "./i18n/en";
import KO from "./i18n/ko";
import ZH from "./i18n/zh";

export type Lang = "ja" | "en" | "ko" | "zh";
export const LANGS: { v: Lang; label: string }[] = [
  { v: "ja", label: "日本語" }, { v: "en", label: "English" }, { v: "ko", label: "한국어" }, { v: "zh", label: "简体中文" },
];
const TABLES: Record<Exclude<Lang, "ja">, Record<string, string>> = { en: EN, ko: KO, zh: ZH };
/** 日付などの書式に使うロケール */
const LOCALES: Record<Lang, string> = { ja: "ja-JP", en: "en-US", ko: "ko-KR", zh: "zh-CN" };
/** <html lang> に入れる値 */
export const HTML_LANG: Record<Lang, string> = { ja: "ja", en: "en", ko: "ko", zh: "zh-Hans" };

export const lang = (): Lang => prefs().lang;
export const locale = () => LOCALES[lang()];
export function t(ja: string): string {
  const l = lang();
  return l === "ja" ? ja : TABLES[l][ja] ?? EN[ja] ?? ja;
}

/**
 * 差し込みのある文。{0} {1} … を args で埋める。
 * 訳が「単数|複数」の形なら、最初の引数が 1 のとき左を使う。英語の 1 album / 2 albums のため
 */
export function tp(ja: string, ...args: (string | number)[]): string {
  let s = t(ja);
  if (s.includes("|") && !ja.includes("|")) { const [one, many] = s.split("|"); s = args[0] === 1 ? one : many; }
  s = s.replace(/\{(\d)\}/g, (_, i: string) => String(args[Number(i)] ?? ""));
  return lang() === "ko" ? particles(s) : s;
}

/** 韓国語の助詞「을/를」「은/는」「이/가」を、直前の語の終わりに合わせて選ぶ。訳には「을(를)」の形で書く */
const PARTICLE = /([^\s'"’”])['"’”]?(을\(를\)|은\(는\)|이\(가\))/g;
function particles(s: string): string {
  return s.replace(PARTICLE, (m, last: string, pair: string) => {
    const [a, b] = [pair[0], pair[2]];
    return m.slice(0, -pair.length) + (endsInConsonant(last) ? a : b);
  });
}
function endsInConsonant(c: string): boolean {
  const n = c.charCodeAt(0);
  if (n >= 0xac00 && n <= 0xd7a3) return (n - 0xac00) % 28 !== 0;   // 한글: 받침の有無
  if (/[0-9]/.test(c)) return "013678".includes(c);                    // 영, 일, 삼, 육, 칠, 팔
  if (/[a-z]/i.test(c)) return !"aeiouy".includes(c.toLowerCase());
  return false;
}

/** index.html に書いてある文（上の帯など）を替える */
export function translateStatic() {
  if (lang() === "ja") return;
  for (const el of document.querySelectorAll<HTMLElement>(".top a, .top button, .top [title], .top [aria-label]")) {
    if (el.children.length === 0 && el.textContent?.trim()) el.textContent = t(el.textContent.trim());
    for (const a of ["title", "aria-label"]) { const v = el.getAttribute(a); if (v) el.setAttribute(a, t(v)); }
  }
}
