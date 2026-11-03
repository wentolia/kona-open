// In-app documents (docs.html): privacy and terms, Google Drive and Spotify setup, in four languages.
// The text lives in src/docs/<lang>/<doc>.html. Update all four languages together.
// The language comes from ?lang=, then the browser's languages, then English.
import "./fonts";
import "./docs.css";

export const DOC_LANGS = ["ja", "en", "ko", "zh"] as const;
export const DOC_NAMES = ["privacy", "google-drive", "spotify"] as const;
type Lang = typeof DOC_LANGS[number];
type Doc = typeof DOC_NAMES[number];

const BODIES = import.meta.glob<string>("./docs/*/*.html", { query: "?raw", import: "default", eager: true });

const LANG_LABEL: Record<Lang, string> = { ja: "日本語", en: "English", ko: "한국어", zh: "简体中文" };
const HTML_LANG: Record<Lang, string> = { ja: "ja", en: "en", ko: "ko", zh: "zh-Hans" };
const TITLES: Record<Lang, Record<Doc, string>> = {
  ja: { privacy: "プライバシーと利用条件", "google-drive": "Google Drive から聴く", spotify: "Spotify で聴く" },
  en: { privacy: "Privacy and terms", "google-drive": "Google Drive", spotify: "Spotify" },
  ko: { privacy: "개인정보 처리와 이용 조건", "google-drive": "Google Drive", spotify: "Spotify" },
  zh: { privacy: "隐私与使用条款", "google-drive": "Google Drive", spotify: "Spotify" },
};
const BACK: Record<Lang, string> = { ja: "Kona に戻る", en: "Back to Kona", ko: "Kona로 돌아가기", zh: "返回 Kona" };

const isLang = (v: unknown): v is Lang => DOC_LANGS.includes(v as Lang);
const isDoc = (v: unknown): v is Doc => DOC_NAMES.includes(v as Doc);

function pickLang(param: string | null): Lang {
  if (isLang(param)) return param;
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}

const href = (doc: Doc, lang: Lang) => `?doc=${doc}&lang=${lang}`;

function render() {
  const q = new URLSearchParams(location.search);
  const lang = pickLang(q.get("lang"));
  const docParam = q.get("doc");
  const doc: Doc = isDoc(docParam) ? docParam : "privacy";
  document.documentElement.lang = HTML_LANG[lang];
  document.title = `${TITLES[lang][doc]} · Kona`;
  document.body.innerHTML = `
  <header class="doc-head">
    <a class="doc-back" href="./">${BACK[lang]}</a>
    <nav class="doc-langs" aria-label="Language">${DOC_LANGS.map(l =>
      `<a href="${href(doc, l)}" hreflang="${HTML_LANG[l]}" lang="${HTML_LANG[l]}"${l === lang ? ` aria-current="true"` : ""}>${LANG_LABEL[l]}</a>`).join("")}</nav>
  </header>
  <nav class="doc-nav">${DOC_NAMES.map(d =>
    `<a href="${href(d, lang)}"${d === doc ? ` aria-current="page"` : ""}>${TITLES[lang][d]}</a>`).join("")}</nav>
  <main class="doc">${BODIES[`./docs/${lang}/${doc}.html`] ?? ""}</main>`;
  // External links open in a new tab, without a referrer
  for (const a of document.querySelectorAll<HTMLAnchorElement>(".doc a[href^='http']")) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
}

render();
