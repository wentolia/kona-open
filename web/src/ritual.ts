// 聴きはじめの儀式: アルバムを再生し始めるとき、棚の背表紙がすっと上に抜き出され、
// くるりと表を向いてジャケットになり、再生中の欄へ運ばれて収まる。面陳や曲目パネルのジャケットからなら、持ち上げて運ぶだけ
import { reduceMotion } from "./prefs";
import "./ritual.css";

const reduced = () => reduceMotion();
let flying = 0;

export interface Sleeve { key: string; src: HTMLElement; cover?: string; color: string; ratio: number }

/** target: 着地先（再生中のジャケット）。抜き出しているあいだに描き直されるので、飛ぶ直前に探す */
async function pullOut(s: Sleeve, target: () => HTMLElement | undefined): Promise<void> {
  if (reduced() || !s.src.isConnected) return;
  const r0 = s.src.getBoundingClientRect();
  if (!r0.width || !r0.height) return;
  const isSpine = s.src.classList.contains("spine");
  const ghost = document.createElement("div");
  ghost.className = "sleeve";
  const back = isSpine ? s.src.cloneNode(true) as HTMLElement : undefined;
  if (back) { back.className = "spine sleeve-spine"; back.removeAttribute("style"); back.style.background = s.src.style.background; back.style.color = s.src.style.color; }
  ghost.innerHTML = s.cover ? `<img class="sleeve-face" alt="" src="${s.cover}">` : `<div class="sleeve-face" style="background:${s.color}"></div>`;
  if (back) ghost.prepend(back);
  document.body.append(ghost);
  const rect = (x: number, y: number, w: number, h: number) => ({ left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
  Object.assign(ghost.style, rect(r0.left, r0.top, r0.width, r0.height));
  if (isSpine) s.src.classList.add("pulled");
  document.querySelectorAll(`.spine[data-key="${CSS.escape(s.key)}"]`).forEach(el => el.classList.add("pulled"));
  flying++; document.body.classList.add("ritual-flying");
  const face = ghost.querySelector<HTMLElement>(".sleeve-face")!;
  try {
    // 1. 抜き出す: 背表紙ならその高さの半分ほど、ジャケットなら少しだけ持ち上げる
    const lift = isSpine ? Math.min(r0.height * .55, 70) : 14;
    const up = r0.top - lift;
    await ghost.animate([rect(r0.left, r0.top, r0.width, r0.height), rect(r0.left, up, r0.width, r0.height)],
      { duration: isSpine ? 420 : 220, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" }).finished;
    // 2. 表を向ける: 背表紙を細めて消し、同じ所でジャケットを開く
    let r1 = { x: r0.left, y: up, w: r0.width, h: r0.height };
    if (isSpine) {
      const side = Math.min(Math.max(r0.height * .9, 64), 150), w = side * Math.min(1, s.ratio), h = side / Math.max(1, s.ratio);
      r1 = { x: r0.left + r0.width / 2 - w / 2, y: up + r0.height / 2 - h / 2, w, h };
      back?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" });
      face.animate([{ opacity: 0, transform: "scaleX(.15)" }, { opacity: 1, transform: "scaleX(1)" }], { duration: 300, delay: 90, easing: "ease-out", fill: "forwards" });
      await ghost.animate([rect(r0.left, up, r0.width, r0.height), rect(r1.x, r1.y, r1.w, r1.h)],
        { duration: 380, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }).finished;
    }
    // 3. 運ぶ: 再生中のジャケットの所へ。見当たらなければ、その場でふわりと消える
    const to = target(), r2 = to?.getBoundingClientRect();
    const from = rect(r1.x, r1.y, r1.w, r1.h);
    if (r2 && r2.width && r2.height && r2.bottom > 0 && r2.top < innerHeight) {
      await ghost.animate([{ ...from, opacity: 1 }, { ...rect(r2.left, r2.top, r2.width, r2.height), opacity: 1 }],
        { duration: 560, easing: "cubic-bezier(.5,0,.15,1)", fill: "forwards" }).finished;
      document.body.classList.remove("ritual-flying");
      await ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }).finished;
    } else {
      await ghost.animate([{ ...from, opacity: 1 }, { ...rect(r1.x, r1.y - 24, r1.w, r1.h), opacity: 0 }],
        { duration: 520, easing: "ease-in", fill: "forwards" }).finished;
    }
  } catch { /* 途中で消えた */ } finally {
    ghost.remove();
    if (--flying <= 0) { flying = 0; document.body.classList.remove("ritual-flying"); }
    document.querySelectorAll(`.spine.pulled[data-key="${CSS.escape(s.key)}"]`).forEach(el => el.classList.remove("pulled"));
  }
}

/** 抜き出しているあいだに棚が描き直されても、そのアルバムの背表紙の所は空けておく */
const pulling = new Set<string>();
export const isPulled = (key: string) => pulling.has(key);
export async function ritual(s: Sleeve, target: () => HTMLElement | undefined) {
  pulling.add(s.key);
  try { await pullOut(s, target); } finally { pulling.delete(s.key); }
}
