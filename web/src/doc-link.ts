// Links to the in-app documents (docs.html). Single-file and mock builds have no docs.html, so they link to the public build.
import { lang } from "./i18n";

export type DocName = "privacy" | "google-drive" | "spotify";

const PUBLIC = "https://wentolia.github.io/kona-open/";
const standalone = import.meta.env.MODE === "single" || import.meta.env.MODE === "mock";

/** The UI is in Japanese or English; documents also exist in Korean and Chinese, chosen from the browser language */
function docLang(): string {
  const nav = (navigator.language || "").toLowerCase().split("-")[0];
  return nav === "ko" || nav === "zh" ? nav : lang();
}

export const docHref = (doc: DocName) => `${standalone ? PUBLIC : "./"}docs.html?doc=${doc}&lang=${docLang()}`;
