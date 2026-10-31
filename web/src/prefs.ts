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
  /** 季節の飾り（room-decor.ts）・深夜の星空（窓の外の天の川と、部屋の灯りを落とすこと） */
  decor: boolean;
  stars: boolean;
  /** 天井の吊りもの（room-things.ts）: なし・モビール・吊りランプ・ミラーボール */
  hanging: "off" | "mobile" | "lamp" | "mirrorball";
  /** 晴れた昼の窓の外の洗濯物・雨の日の傘立て */
  laundry: boolean;
  umbrella: boolean;
  /** 部屋の香り: なし・コーヒーの湯気・お香の煙 */
  scent: "off" | "coffee" | "incense";
  /** 棚板に跡を残す（shelf-marks.ts）: 猫の毛・爪あと・コーヒーのしみ */
  marks: boolean;
  /** 曲の切り替え: 0 ならギャップレス、正なら秒数ぶんクロスフェード */
  crossfade: number;
  /** 猫: 出さない・鳴き声・その音量・いたずら（よく聴くアルバムを運んでくる） */
  catsHidden: boolean;
  catVoice: boolean;
  catVolume: number;
  catMischief: "off" | "queue" | "play";
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
  lang: "ja" | "en";
  /** キーボードの割り当て（操作の名前 → キー。空ならなし） */
  keys: Record<string, string>;
}

export const DEFAULT_PREFS: Prefs = {
  fontScale: 1, font: "gothic", motion: "system", decor: true, stars: true, hanging: "lamp", laundry: true, umbrella: true, scent: "coffee", marks: true, crossfade: 0,
  catsHidden: false, catVoice: true, catVolume: .4, catMischief: "queue", catZoomies: true,
  autoRescan: true, libSort: "title", libGroup: "folder", blankArt: "title", lang: "ja", keys: {},
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
    decor: pick("decor", bool), stars: pick("stars", bool),
    hanging: pick("hanging", oneOf("off", "mobile", "lamp", "mirrorball")),
    laundry: pick("laundry", bool), umbrella: pick("umbrella", bool),
    scent: pick("scent", oneOf("off", "coffee", "incense")),
    marks: pick("marks", bool),
    crossfade: pick("crossfade", num(0, 12)),
    catsHidden: pick("catsHidden", bool), catVoice: pick("catVoice", bool),
    catVolume: pick("catVolume", num(0, 1)),
    catMischief: pick("catMischief", oneOf("off", "queue", "play")),
    catZoomies: pick("catZoomies", bool),
    autoRescan: pick("autoRescan", bool),
    libSort: pick("libSort", oneOf("title", "artist", "year", "yearAsc", "plays", "last")),
    libGroup: pick("libGroup", oneOf("folder", "artist")),
    blankArt: pick("blankArt", oneOf("title", "plain", "initial")),
    lang: pick("lang", oneOf("ja", "en")),
    keys: pick("keys", x => !!x && typeof x === "object" && !Array.isArray(x)),
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
  r.lang = p.lang;
}
osReduce.addEventListener("change", applyLook);
applyLook();
