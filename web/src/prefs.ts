// 設定ページで決める、部屋全体に効く細かな設定（kona.prefs にひとまとめ）。
// 変わると document に "kona:prefs" を流す（detail は変わった項目の名前）。読む側はそのつど prefs() を見る。

import type { SortKey } from "./shelves";

export interface Prefs {
  /** 文字の大きさ（倍率） */
  fontScale: number;
  /** 書体 */
  font: "gothic" | "mincho";
  /** 動き: OS の設定に従う / いつも減らす */
  motion: "system" | "reduce";
  /** 棚板に跡を残す（shelf-marks.ts）: 猫の毛・爪あと */
  marks: boolean;
  /** 曲の切り替え: 0 ならギャップレス、正なら秒数ぶんクロスフェード */
  crossfade: number;
  /** 猫: 出さない・いたずら（よく聴くアルバムを運んでくる）。猫は声を出さない */
  catsHidden: boolean;
  catMischief: "off" | "queue";
  /** 夜中にときどき猫が棚を駆け回る（夜の運動会） */
  catZoomies: boolean;
  /** ほかのアプリから戻ってきたときに、フォルダを読み直す */
  autoRescan: boolean;
  /** ライブラリの箱の中・新しく作る検索の棚の並び順 */
  libSort: SortKey;
  /** アルバムの括り方（ライブラリの箱・棚の仕切り）: フォルダ / アーティスト */
  libGroup: "folder" | "artist";
  /** ジャケットのないアルバムの見せ方: 色と題名 / 無地 / 頭文字 */
  blankArt: "title" | "plain" | "initial";
  /** 言語 */
  lang: "ja" | "en" | "ko" | "zh";
}

/** 言語の既定: ブラウザの言語が 4 つのどれかならそれ、ほかは英語 */
function browserLang(): Prefs["lang"] {
  for (const l of navigator.languages ?? [navigator.language]) {
    const b = l.toLowerCase().split("-")[0];
    if (b === "ja" || b === "en" || b === "ko" || b === "zh") return b;
  }
  return "en";
}

export const DEFAULT_PREFS: Prefs = {
  fontScale: 1, font: "gothic", motion: "system", marks: true, crossfade: 0,
  catsHidden: false, catMischief: "queue", catZoomies: true,
  autoRescan: true, libSort: "title", libGroup: "folder", blankArt: "title", lang: browserLang(),
};

const KEY = "kona.prefs";
let cache: Prefs | undefined;

export function prefs(): Prefs {
  if (cache) return cache;
  let v: Partial<Prefs> = {};
  try { v = JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {}; } catch { /* 既定に戻す */ }
  const d = DEFAULT_PREFS;
  const pick = <K extends keyof Prefs>(k: K, ok: (x: unknown) => boolean): Prefs[K] => ok(v[k]) ? v[k] as Prefs[K] : d[k];
  const oneOf = (...xs: unknown[]) => (x: unknown) => xs.includes(x);
  const num = (a: number, b: number) => (x: unknown) => typeof x === "number" && x >= a && x <= b;
  const bool = (x: unknown) => typeof x === "boolean";
  cache = {
    fontScale: pick("fontScale", num(.8, 1.4)),
    font: pick("font", oneOf("gothic", "mincho")),
    motion: pick("motion", oneOf("system", "reduce")),
    marks: pick("marks", bool),
    crossfade: pick("crossfade", num(0, 12)),
    catsHidden: pick("catsHidden", bool),
    catMischief: v.catMischief === "off" ? "off" : d.catMischief, // 以前の「そのまま再生する」は「次に再生に入れる」に
    catZoomies: pick("catZoomies", bool),
    autoRescan: pick("autoRescan", bool),
    libSort: pick("libSort", oneOf("title", "artist", "year", "yearAsc", "plays", "last", "hue")),
    libGroup: pick("libGroup", oneOf("folder", "artist")),
    blankArt: pick("blankArt", oneOf("title", "plain", "initial")),
    lang: pick("lang", oneOf("ja", "en", "ko", "zh")),
  };
  return cache;
}

export function setPrefs(p: Partial<Prefs>) {
  cache = { ...prefs(), ...p };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* 保存できなくても動く */ }
  applyLook();
  document.dispatchEvent(new CustomEvent("kona:prefs", { detail: Object.keys(p) }));
}

// ---------- 動きを減らす: OS の設定か、ここでの設定 ----------
const osReduce = matchMedia("(prefers-reduced-motion: reduce)");
export const reduceMotion = () => { const m = prefs().motion; return m === "reduce" || (m === "system" && osReduce.matches); };
/** 動きを減らす設定が変わったら呼ぶ（OS 側・設定ページ側のどちらでも） */
export function onMotionChange(fn: () => void): () => void {
  const h = (e: Event) => { if (!(e instanceof CustomEvent) || e.detail.includes("motion")) fn(); };
  osReduce.addEventListener("change", fn);
  document.addEventListener("kona:prefs", h);
  return () => { osReduce.removeEventListener("change", fn); document.removeEventListener("kona:prefs", h); };
}

/** 文字の大きさ・書体・動きを <html> に映す（CSS が読む） */
export function applyLook() {
  const p = prefs(), r = document.documentElement;
  r.style.setProperty("--font-scale", String(p.fontScale));
  r.dataset.font = p.font;
  r.dataset.motion = reduceMotion() ? "reduce" : "full";
  r.lang = p.lang === "zh" ? "zh-Hans" : p.lang;
}
osReduce.addEventListener("change", applyLook);
applyLook();
