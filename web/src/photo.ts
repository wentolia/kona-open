// 写真: ホームの部屋をそのまま 1 枚の画像にする。猫に寄って撮ることもできる。
// 撮った写真は端末の中だけで作り、保存・コピー・端末の共有（Web Share API）で外に出す。Kona からはどこにも送らない。
// ジャケットは写真の中で平均色の無地に置き換えられる（既定でオン。覚えておく）。聴いた場所の地図はいつも写さない。

import { domToCanvas } from "modern-screenshot";
import { holdCats } from "./cat";
import { setPlainLabel } from "./mod-turntable";

const HIDE_KEY = "kona.photoHideArt";
type Rect = { x: number; y: number; w: number; h: number };
type Frame = { kind: "room" } | { kind: "cat"; i: number };

let toast: (text: string) => void = () => {};
let open: { el: HTMLElement; close: () => void } | undefined;

const hideArtPref = () => { try { return localStorage.getItem(HIDE_KEY) !== "0"; } catch { return true; } };
const setHideArtPref = (on: boolean) => { try { localStorage.setItem(HIDE_KEY, on ? "1" : "0"); } catch { /* 覚えられなくても撮れる */ } };
const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

// ---------- 画像の読み込みと平均色 ----------
const loaded = new Map<string, Promise<HTMLImageElement | undefined>>();
export function loadImage(url: string) {
  let p = loaded.get(url);
  if (!p) {
    p = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(undefined); im.src = url; });
    loaded.set(url, p);
  }
  return p;
}
const avg = new Map<string, Promise<string>>();
export function averageColor(url: string) {
  let p = avg.get(url);
  if (!p) {
    p = loadImage(url).then(im => {
      if (!im) return "#3a3530";
      const c = document.createElement("canvas"); c.width = c.height = 8;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.drawImage(im, 0, 0, 8, 8);
      const d = g.getImageData(0, 0, 8, 8).data;
      let r = 0, gr = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
      const k = d.length / 4;
      return `rgb(${Math.round(r / k)}, ${Math.round(gr / k)}, ${Math.round(b / k)})`;
    });
    avg.set(url, p);
  }
  return p;
}
/** ジャケットの代わりの無地: 同じ縦横比で平均色に塗り、左上から薄く光を当てる（紙のジャケットらしさだけ残す） */
async function plainArt(url: string) {
  const [im, col] = await Promise.all([loadImage(url), averageColor(url)]);
  const ratio = im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1;
  const c = document.createElement("canvas");
  c.width = 96; c.height = Math.max(1, Math.round(96 * ratio));
  const g = c.getContext("2d")!;
  g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  const sheen = g.createLinearGradient(0, 0, c.width, c.height);
  sheen.addColorStop(0, "rgba(255,255,255,.10)"); sheen.addColorStop(.6, "rgba(255,255,255,0)"); sheen.addColorStop(1, "rgba(0,0,0,.08)");
  g.fillStyle = sheen; g.fillRect(0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

/** blob: の画像は CSP（connect-src）で fetch できないので、読み込んだ画像を描き写して data: にする */
async function imageAsDataUrl(url: string): Promise<string | false> {
  if (!url.startsWith("blob:")) return false;
  const im = await loadImage(url);
  if (!im || !im.naturalWidth) return false;
  const c = document.createElement("canvas");
  const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
  c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
  c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", .92);
}
const cssUrl = (bg: string) => bg.match(/url\(["']?([^"')]+)["']?\)/)?.[1];

// ---------- 書体 ----------
// 写真の中の文字も同じ書体で描くため、いま読み込まれている書体（使っている文字の範囲だけ）を data: にして埋め込む。
// 描き写しの道具に任せると、CSP（base-uri 'none'）で書体を読めず、文字の幅が変わって背表紙の題名が切れる
const fontData = new Map<string, Promise<string | undefined>>();
function fontUrl(url: string) {
  let p = fontData.get(url);
  if (!p) {
    p = fetch(url).then(r => r.ok ? r.blob() : undefined).then(b => b && new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); })).catch(() => undefined);
    fontData.set(url, p);
  }
  return p;
}
const normFamily = (f: string) => f.replace(/["']/g, "").trim();
async function fontCss(): Promise<string> {
  const live = [...document.fonts].filter(f => f.status === "loaded");
  const want = new Set(live.map(f => `${normFamily(f.family)}|${f.weight}|${f.style}|${f.unicodeRange.replace(/\s/g, "").toUpperCase()}`));
  const rules: CSSFontFaceRule[] = [];
  const walk = (list: CSSRuleList) => { for (const r of list) { if (r instanceof CSSFontFaceRule) rules.push(r); else if ("cssRules" in r) walk((r as CSSGroupingRule).cssRules); } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* 読めないシート */ } }
  const out = await Promise.all(rules.map(async r => {
    const st = r.style, fam = normFamily(st.getPropertyValue("font-family"));
    const weight = st.getPropertyValue("font-weight") || "400", style = st.getPropertyValue("font-style") || "normal";
    const range = (st.getPropertyValue("unicode-range") || "U+0-10FFFF").replace(/\s/g, "").toUpperCase();
    if (!want.has(`${fam}|${weight}|${style}|${range}`)) return "";
    const m = st.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/);
    if (!m) return "";
    const data = await fontUrl(new URL(m[1], r.parentStyleSheet?.href ?? location.href).href);
    return data ? `@font-face{font-family:"${fam}";font-weight:${weight};font-style:${style};unicode-range:${range};src:url(${data});}` : "";
  }));
  return out.join("\n");
}

// ---------- 撮る ----------
/** 画面（body）をそのまま描き写す。hideArt ならジャケットを無地にする */
async function shoot(hideArt: boolean): Promise<HTMLCanvasElement> {
  const w = innerWidth, h = innerHeight;
  const scale = Math.min(Math.max(2, devicePixelRatio || 1), Math.sqrt(16e6 / (w * h)));
  if (hideArt) { setPlainLabel(true); await nextFrame(); await nextFrame(); }
  try {
    return await domToCanvas(document.body, {
      width: w, height: h, scale,
      style: { margin: "0" },
      font: { cssText: await fontCss() },
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      features: { restoreScrollPosition: true, copyScrollbar: false },
      fetchFn: imageAsDataUrl,
      // 写さないもの: 撮影の画面・メニュー・お知らせ・地図（聴いた場所は写真に残さない）
      filter: n => !(n instanceof Element) || !n.matches(".photo, .photo-flash, .pop-menu, .toast, #add-menu, #module-menu, .leaflet-pane, .leaflet-control-container"),
      onCloneNode: async root => {
        if (!(root instanceof Element)) return;
        root.querySelectorAll<HTMLElement>(".add-mod").forEach(e => { e.style.visibility = "hidden"; });
        // 写真にスクロールバーは要らない（位置はそのまま写す）
        [root, ...root.querySelectorAll("*")].forEach(e => { if (e instanceof HTMLElement) e.style.scrollbarWidth = "none"; });
        if (!hideArt) return;
        root.querySelectorAll(".spine-tex").forEach(e => e.remove());
        await Promise.all([...root.querySelectorAll<HTMLImageElement>("img.art")].map(async im => {
          const src = im.getAttribute("src");
          if (src) { im.removeAttribute("srcset"); im.src = await plainArt(src); }
        }));
        await Promise.all([...root.querySelectorAll<HTMLElement>(".cat-carry")].map(async e => {
          const url = cssUrl(e.style.background || e.style.backgroundImage);
          if (url) { const col = await averageColor(url); e.style.backgroundImage = "none"; e.style.backgroundColor = col; }
        }));
      },
    });
  } finally {
    if (hideArt) setPlainLabel(false);
  }
}

function crop(src: HTMLCanvasElement, r: Rect): HTMLCanvasElement {
  const k = src.width / innerWidth;
  const c = document.createElement("canvas");
  c.width = Math.round(r.w * k); c.height = Math.round(r.h * k);
  c.getContext("2d")!.drawImage(src, Math.round(r.x * k), Math.round(r.y * k), c.width, c.height, 0, 0, c.width, c.height);
  return c;
}
const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("画像にできませんでした")), type, q));
/** PNG（ローポリの平らな色がにじまない）。大きすぎて SNS に載らない大きさなら JPEG にする */
async function encode(c: HTMLCanvasElement): Promise<Blob> {
  const png = await toBlob(c, "image/png");
  return png.size <= 4.5e6 ? png : toBlob(c, "image/jpeg", .92);
}
const fileName = (b: Blob, prefix = "kona") => {
  const d = new Date(), p = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${b.type === "image/png" ? "png" : "jpg"}`;
};

// ---------- 構図: 部屋全体 / 猫に寄る ----------
const toRect = (r: DOMRect): Rect => ({ x: r.left, y: r.top, w: r.width, h: r.height });
function roomRect(): Rect | undefined {
  const home = document.querySelector<HTMLElement>(".home");
  if (!home || !home.offsetParent) return;
  const r = toRect(home.getBoundingClientRect());
  return r.w > 0 && r.h > 0 ? r : undefined;
}
/** 見えている猫ひとりずつの、寄った構図（正方形） */
function catRects(room: Rect): Rect[] {
  const out: Rect[] = [];
  document.querySelectorAll<HTMLElement>(".cat-layer .cat").forEach(el => {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!r.width || cx < room.x || cx > room.x + room.w || cy < room.y || cy > room.y + room.h) return;
    const side = Math.min(room.w, room.h, Math.max(300, Math.max(r.width, r.height) * 4.2));
    const x = Math.min(Math.max(cx - side / 2, room.x), room.x + room.w - side);
    const y = Math.min(Math.max(cy - side * .55, room.y), room.y + room.h - side);
    out.push({ x, y, w: side, h: side });
  });
  return out.sort((a, b) => a.x - b.x);
}

// ---------- 画面 ----------
export function initPhoto(opts: { toast: (text: string) => void }) {
  toast = opts.toast;
  const btn = document.getElementById("to-photo");
  if (btn) btn.onclick = () => { void takePhoto(); };
  addEventListener("keydown", e => { if (e.key === "Escape" && open) { e.preventDefault(); open.close(); } });
}
export const photoToast = (text: string) => toast(text);
export const photoHideArt = hideArtPref;

/** 保存・コピー・共有。どれも端末の中だけで済ませる（共有は端末の共有シートに渡すだけ） */
async function act(kind: string, blob: Blob, url: string, prefix: string, png: () => Promise<Blob>) {
  const file = new File([blob], fileName(blob, prefix), { type: blob.type });
  if (kind === "save") {
    const a = document.createElement("a");
    a.href = url; a.download = file.name; a.click();
  } else if (kind === "copy") {
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": await png() })]); toast("画像をコピーしました"); }
    catch { toast("コピーできませんでした"); }
  } else if (kind === "share") {
    try { await navigator.share({ files: [file] }); }
    catch (err) { if ((err as Error).name !== "AbortError") toast("共有できませんでした"); }
  }
}

/** 写真と同じ画面で、描いた画像（レシート・証書など）を見せて保存・コピー・共有する。
 *  hideToggle: 「ジャケットを隠す」を出す（写真と同じ設定を使う）。choices: 何枚かから選ぶとき */
export function showPicture(o: {
  label: string; prefix: string; hideToggle?: boolean; choices?: string[]; choice?: number;
  draw: (q: { hideArt: boolean; choice: number }) => Promise<HTMLCanvasElement>;
}) {
  if (open) return;
  let hideArt = hideArtPref(), choice = o.choice ?? 0;
  const el = document.createElement("div");
  el.className = "photo photo-pict"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", o.label);
  const canShareFiles = typeof navigator.canShare === "function";
  const canCopy = typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
  const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  el.innerHTML = `<div class="photo-card">
    <div class="photo-pic" data-busy><img alt="${esc(o.label)}"></div>
    <div class="photo-bar">
      ${o.choices && o.choices.length > 1 ? `<select class="photo-choice" aria-label="どれにするか">${o.choices.map((c, i) => `<option value="${i}"${i === choice ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>` : ""}
      ${o.hideToggle ? `<label class="photo-hide"><input type="checkbox"${hideArt ? " checked" : ""}>ジャケットを隠す</label>` : ""}
      <span class="photo-gap"></span>
      ${canCopy ? `<button class="photo-act" data-act="copy">コピー</button>` : ""}
      <button class="photo-act" data-act="save">保存</button>
      <button class="photo-act photo-main" data-act="share" hidden>共有</button>
    </div>
    <button class="photo-close" aria-label="閉じる">×</button>
  </div>`;
  const back = document.activeElement as HTMLElement | null;
  document.body.append(el);
  const pic = el.querySelector<HTMLElement>(".photo-pic")!, img = pic.querySelector("img")!;
  const shareBtn = el.querySelector<HTMLButtonElement>('[data-act="share"]')!;
  let blob: Blob | undefined, canvas: HTMLCanvasElement | undefined, url = "", seq = 0;
  const close = () => {
    if (open?.el !== el) return;
    open = undefined; el.remove(); if (url) URL.revokeObjectURL(url);
    back?.focus?.();
  };
  open = { el, close };
  const render = async () => {
    const my = ++seq;
    pic.toggleAttribute("data-busy", true); blob = undefined;
    try {
      const c = await o.draw({ hideArt, choice });
      const b = await encode(c);
      if (my !== seq || open?.el !== el) return;
      blob = b; canvas = c;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(b); img.src = url;
      pic.style.aspectRatio = `${c.width} / ${c.height}`; pic.style.setProperty("--ar", String(c.width / c.height));
      shareBtn.hidden = !(canShareFiles && navigator.canShare({ files: [new File([b], fileName(b, o.prefix), { type: b.type })] }));
    } catch {
      if (my === seq && open?.el === el) { close(); toast("画像にできませんでした"); }
      return;
    }
    pic.toggleAttribute("data-busy", false);
  };
  el.addEventListener("click", e => {
    const t = e.target as HTMLElement;
    if (t === el || t.closest(".photo-close")) return close();
    const kind = t.closest<HTMLButtonElement>("[data-act]")?.dataset.act;
    if (kind && blob) { const b = blob, c = canvas!; void act(kind, b, url, o.prefix, async () => b.type === "image/png" ? b : toBlob(c, "image/png")); }
  });
  el.querySelector<HTMLInputElement>(".photo-hide input")?.addEventListener("change", e => {
    hideArt = (e.target as HTMLInputElement).checked; setHideArtPref(hideArt); void render();
  });
  el.querySelector<HTMLSelectElement>(".photo-choice")?.addEventListener("change", e => { choice = Number((e.target as HTMLSelectElement).value); void render(); });
  void render();
  el.querySelector<HTMLButtonElement>(".photo-act")?.focus();
}

function flash() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const f = document.createElement("div");
  f.className = "photo-flash"; f.setAttribute("aria-hidden", "true");
  document.body.append(f);
  f.addEventListener("animationend", () => f.remove());
}

export async function takePhoto() {
  if (open) return;
  const room = roomRect();
  if (!room) return;
  // シャッターを切った瞬間の構図を覚え、猫にはそのままじっとしていてもらう（写真の画面を閉じるまで）
  holdCats(true);
  document.body.toggleAttribute("data-photo", true);
  const cats = catRects(room);
  let hideArt = hideArtPref(), frame: Frame = { kind: "room" };
  const shots = new Map<boolean, Promise<HTMLCanvasElement>>();
  const shot = (hide: boolean) => { let p = shots.get(hide); if (!p) { p = shoot(hide); shots.set(hide, p); } return p; };
  shot(hideArt).catch(() => {}); // 画面を出す前に描き写し始める（撮影の画面は写さない）
  flash();

  const el = document.createElement("div");
  el.className = "photo"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "写真");
  const canShareFiles = typeof navigator.canShare === "function";
  const canCopy = typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
  el.innerHTML = `<div class="photo-card">
    <div class="photo-pic" data-busy><img alt="撮った写真"></div>
    <div class="photo-bar">
      <div class="photo-frame" role="group" aria-label="構図"${cats.length ? "" : " hidden"}>
        <button data-frame="room" aria-pressed="true">部屋</button><button data-frame="cat" aria-pressed="false">猫</button>
      </div>
      <label class="photo-hide"><input type="checkbox"${hideArt ? " checked" : ""}>ジャケットを隠す</label>
      <span class="photo-gap"></span>
      ${canCopy ? `<button class="photo-act" data-act="copy">コピー</button>` : ""}
      <button class="photo-act" data-act="save">保存</button>
      <button class="photo-act photo-main" data-act="share" hidden>共有</button>
    </div>
    <button class="photo-close" aria-label="閉じる">×</button>
  </div>`;
  document.body.append(el);
  const pic = el.querySelector<HTMLElement>(".photo-pic")!, img = pic.querySelector("img")!;
  const catBtn = el.querySelector<HTMLButtonElement>('[data-frame="cat"]')!, shareBtn = el.querySelector<HTMLButtonElement>('[data-act="share"]')!;
  let blob: Blob | undefined, url = "", seq = 0;

  const close = () => {
    if (open?.el !== el) return;
    open = undefined; el.remove(); if (url) URL.revokeObjectURL(url);
    holdCats(false); document.body.toggleAttribute("data-photo", false);
    document.getElementById("to-photo")?.focus();
  };
  open = { el, close };

  const render = async () => {
    const my = ++seq;
    pic.toggleAttribute("data-busy", true); blob = undefined;
    try {
      const full = await shot(hideArt);
      const r = frame.kind === "cat" ? cats[frame.i] : room;
      const b = await encode(crop(full, r));
      if (my !== seq || open?.el !== el) return;
      blob = b;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(b); img.src = url;
      pic.style.aspectRatio = `${r.w} / ${r.h}`; pic.style.setProperty("--ar", String(r.w / r.h));
      shareBtn.hidden = !(canShareFiles && navigator.canShare({ files: [new File([b], fileName(b), { type: b.type })] }));
    } catch {
      if (my === seq && open?.el === el) { close(); toast("写真を撮れませんでした"); }
      return;
    }
    pic.toggleAttribute("data-busy", false);
  };
  const setFrame = (f: Frame) => {
    frame = f;
    el.querySelectorAll<HTMLButtonElement>("[data-frame]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.frame === f.kind)));
    catBtn.textContent = f.kind === "cat" && cats.length > 1 ? `猫 ${f.i + 1}/${cats.length}` : "猫";
    void render();
  };

  el.addEventListener("click", async e => {
    const t = e.target as HTMLElement;
    if (t === el || t.closest(".photo-close")) return close();
    const fb = t.closest<HTMLButtonElement>("[data-frame]");
    // 猫のボタンは押すたびに次の猫へ
    if (fb) return setFrame(fb.dataset.frame === "room" ? { kind: "room" } : { kind: "cat", i: frame.kind === "cat" ? (frame.i + 1) % cats.length : 0 });
    const a = t.closest<HTMLButtonElement>("[data-act]")?.dataset.act;
    if (!a || !blob) return;
    const b = blob;
    await act(a, b, url, "kona", async () => b.type === "image/png" ? b : toBlob(await shot(hideArt).then(full => crop(full, frame.kind === "cat" ? cats[frame.i] : room)), "image/png"));
  });
  el.querySelector<HTMLInputElement>(".photo-hide input")!.addEventListener("change", e => {
    hideArt = (e.target as HTMLInputElement).checked; setHideArtPref(hideArt); void render();
  });
  void render();
  el.querySelector<HTMLButtonElement>(".photo-act")?.focus();
}
