// 包み: 届いた包みをホームの床（敷いていなければホームの下の端）に並べ、押すと開いて中身を見せる（中身の決め方は presents.ts）
import "./presents.css";
import { pendingPresents, openPresent, ACHIEVEMENTS, type Present } from "./presents";
import { itemOf, viewBoxOf } from "./items";
import { accOf } from "./cat-acc";
import { t } from "./i18n";
import { esc } from "./dom";

const PAPERS = [["#c8553f", "#e8c46a"], ["#3d6b8a", "#efe6d2"], ["#5f8a5a", "#d9584a"], ["#e0d7c2", "#b04a3b"], ["#8a5a9a", "#f0d27a"], ["#2c2a28", "#d8b46a"]];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function boxArt(p: Present) {
  const [paper, rib] = PAPERS[hash(p.id) % PAPERS.length];
  const dk = `color-mix(in srgb, ${paper} 70%, #000)`, lt = `color-mix(in srgb, ${paper} 80%, #fff)`;
  const q = (c: string, pts: string) => `<polygon style="fill:${c};stroke:${c}" points="${pts}"/>`;
  return `<svg viewBox="0 0 40 36" aria-hidden="true">
    ${q(dk, "30,14 36,10 36,32 30,36")}${q(paper, "4,14 30,14 30,36 4,36")}${q(lt, "4,14 10,10 36,10 30,14")}
    ${q(rib, "15,14 19,14 19,36 15,36")}${q(rib, "18,10 22,10 16,14 12,14")}${q(`color-mix(in srgb, ${rib} 75%, #000)`, "30,22 36,18 36,21 30,25")}
    ${q(rib, "17,11 11,4 9,9")}${q(rib, "17,11 23,4 25,9")}${q(`color-mix(in srgb, ${rib} 70%, #000)`, "15.5,10 18.5,10 18,12.5 16,12.5")}
  </svg>`;
}

let pile: HTMLElement | undefined;
export function mountPresents() {
  const grid = document.querySelector<HTMLElement>("#view-home .grid");
  if (!grid) return;
  if (!pile || pile.parentElement !== grid) {
    pile?.remove();
    pile = document.createElement("div");
    pile.className = "present-pile";
    grid.append(pile);
    pile.addEventListener("click", e => {
      const b = (e.target as Element).closest<HTMLElement>("[data-present]");
      if (b && !b.classList.contains("opening")) open(b);
    });
  }
  paint();
}
function paint() {
  if (!pile) return;
  const list = pendingPresents(), have = new Set(list.map(p => p.id));
  for (const el of [...pile.children] as HTMLElement[]) if (!have.has(el.dataset.present!) && !el.classList.contains("opening")) el.remove();
  for (const p of list) {
    if (pile.querySelector(`[data-present="${CSS.escape(p.id)}"]`)) continue;
    const b = document.createElement("button");
    b.type = "button"; b.className = "present"; b.dataset.present = p.id;
    b.setAttribute("aria-label", t("包みを開ける"));
    b.title = t("包みを開ける");
    b.innerHTML = boxArt(p);
    b.style.setProperty("--tilt", `${(hash(p.id) % 13) - 6}deg`);
    pile.append(b);
  }
}
document.addEventListener("kona:presents", () => paint());

function open(b: HTMLElement) {
  b.classList.add("opening");
  setTimeout(() => {
    const p = openPresent(b.dataset.present!);
    b.remove();
    if (p) reveal(p);
  }, 650);
}

function thumb(p: Present) {
  if (p.c.t === "item") {
    const d = itemOf(p.c.key);
    return d ? `<svg viewBox="${viewBoxOf(d)}" preserveAspectRatio="xMidYMid meet">${d.art().replace(/<i [^>]*><\/i>/g, "")}</svg>` : "";
  }
  if (p.c.t === "acc") {
    // 薄い猫の頭に重ねて、どこにつけるものか分かるように
    const g = (pts: string) => `<polygon points="${pts}" fill="#5a5651" stroke="#5a5651" stroke-width=".3" stroke-linejoin="round"/>`;
    return `<svg viewBox="7 -39 19 22">${g("11.5,-29 12,-35.5 16.5,-31.5")}${g("15.2,-31.8 19.2,-37 21.4,-30.3")}${g("10.5,-26 12,-30.5 16,-32.2 20.5,-31 22.6,-28 23.4,-26 22,-22.8 18.5,-21 13,-21")}${accOf(p.c.key)?.art ?? ""}</svg>`;
  }
  // 猫がもう 1 匹: 肉球
  const pad = (cx: number, cy: number, r: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.15}" fill="#e8a0a8"/>`;
  return `<svg viewBox="0 0 40 40">${pad(20, 26, 8)}${pad(9, 14, 3.6)}${pad(16, 8, 3.6)}${pad(24, 8, 3.6)}${pad(31, 14, 3.6)}</svg>`;
}
function reveal(p: Present) {
  document.querySelector(".present-reveal")?.remove();
  const name = p.c.t === "item" ? t(itemOf(p.c.key)?.label ?? p.c.key) : p.c.t === "acc" ? t(accOf(p.c.key)?.label ?? p.c.key) : "";
  const title = p.c.t === "cat" ? t("飼える猫がもう 1 匹ふえました") : `「${esc(name)}」${t("が届きました")}`;
  const d = new Date(p.d), when = `${d.getMonth() + 1}/${d.getDate()}`;
  const why = p.from ? `${esc(p.from)}${t("さんから")} · ${when}` : p.k === "ach" ? `${t("実績")}「${esc(t(ACHIEVEMENTS[p.ach ?? ""]?.label ?? ""))}」`
    : p.al ? `${when} · 「${esc(p.al)}」${t("を聴いていたとき")}` : when;
  const where = p.c.t === "item" ? t("設定の「部屋」→「置くもの」から置けます") : p.c.t === "acc" ? t("飼い猫の名札か、設定の「猫」からつけられます") : t("通りすがりの猫を飼い猫にできます");
  const el = document.createElement("div");
  el.className = "present-reveal"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", t("プレゼント"));
  el.innerHTML = `<div class="pr-thumb">${thumb(p)}</div><b>${title}</b><span class="pr-why">${why}</span><span class="pr-where">${where}</span><button type="button" class="pr-ok">${t("閉じる")}</button>`;
  document.body.append(el);
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 250); };
  el.querySelector(".pr-ok")!.addEventListener("click", close);
  el.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  (el.querySelector(".pr-ok") as HTMLElement).focus();
}
