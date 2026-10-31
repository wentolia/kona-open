// 起動画面の猫: ホームにいる 1 匹目の猫（同じローポリの体・同じ毛並み）が、開いたときは丸くなって眠っていて、
// あくびをして目を開け、起き上がって座る。動き自体は cat.ts の猫そのもの（stageCat）
import { reduceMotion } from "./prefs";
import "./wakecat.css";
import { stageCat, randomCoat, type Coat } from "./cat";

const SLEEP = 1.1;      // 眠っている秒数（開いた時点から）
const WAKE_MS = 4000;   // 眠る → あくび（2 秒）→ ひと呼吸 → 座るまで
const born = performance.now();
const reduced = () => reduceMotion();

/** 猫が起ききるまで待つ（起動してすぐ読み込みが終わっても、あくびの途中で画面を替えない） */
export function catAwake(): Promise<void> {
  const left = WAKE_MS - (performance.now() - born);
  if (reduced() || left <= 0 || !document.querySelector(".wake-cat")) return Promise.resolve();
  return new Promise(r => setTimeout(r, left));
}

/** 起動画面に猫を置く場所を作る。画面に入れてから placeWakeCat で猫を呼ぶ */
export function wakeCatHost(): HTMLElement {
  const el = document.createElement("div");
  el.className = "wake-cat";
  el.setAttribute("aria-hidden", "true");
  return el;
}
/** host が画面に入ったあとに呼ぶ。眠っている時間は、開いてからの経過を差し引く（描き直しても眠り直さない） */
export function placeWakeCat(host: HTMLElement, coat?: Coat) {
  if (host.querySelector(".cat-layer")) return;
  stageCat(host, coat ?? randomCoat(), Math.max(0, SLEEP - (performance.now() - born) / 1000));
}
