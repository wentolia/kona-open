// キーボードの割り当て: 操作ごとに 1 つのキー（修飾キーつきも可）。割り当ては決まっていて、設定ページに一覧を出す。
// 文字を打つ場所（検索窓など）にいるときと、ほかの部品がキーを使ったとき（EQ のつまみの矢印など）は何もしない。

import { t } from "./i18n";

export interface Action { id: string; label: string; def: string }
export const ACTIONS: Action[] = [
  { id: "toggle", label: "再生・一時停止", def: "Space" },
  { id: "next", label: "次の曲", def: "Shift+ArrowRight" },
  { id: "prev", label: "前の曲", def: "Shift+ArrowLeft" },
  { id: "fwd", label: "10 秒送る", def: "ArrowRight" },
  { id: "back", label: "10 秒戻す", def: "ArrowLeft" },
  { id: "volUp", label: "音量を上げる", def: "ArrowUp" },
  { id: "volDown", label: "音量を下げる", def: "ArrowDown" },
  { id: "mute", label: "消音", def: "M" },
  { id: "home", label: "ホーム", def: "1" },
  { id: "library", label: "ライブラリ", def: "2" },
  { id: "settings", label: "設定", def: "3" },
  { id: "search", label: "検索", def: "/" },
];

/** 押されたキーを "Ctrl+Shift+K" の形に。修飾キーだけのときは空 */
function comboOf(e: KeyboardEvent): string {
  if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return "";
  // 文字と数字は配列（JIS / US）や Shift で変わらないよう、物理キーの名前から
  let k = e.code.startsWith("Key") ? e.code.slice(3) : e.code.startsWith("Digit") ? e.code.slice(5) : e.key === " " ? "Space" : e.key;
  if (k.length === 1) k = k.toUpperCase();
  return [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.metaKey && "Meta", e.shiftKey && "Shift", k].filter(Boolean).join("+");
}

const ARROWS: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Space: "Space" };
/** 画面に出す形 */
export const keyLabel = (combo: string) => combo ? combo.split("+").map(k => ARROWS[k] ?? k).join(" + ") : t("なし");

export const keyFor = (id: string): string => ACTIONS.find(a => a.id === id)?.def ?? "";

const typing = (el: EventTarget | null) => el instanceof HTMLElement &&
  (el.isContentEditable || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement ||
   (el instanceof HTMLInputElement && !["checkbox", "radio", "button", "range", "color"].includes(el.type)));

export function initShortcuts(run: (id: string) => void) {
  addEventListener("keydown", e => {
    if (e.defaultPrevented || e.isComposing || typing(e.target)) return;
    const combo = comboOf(e);
    if (!combo) return;
    // スペースはボタンの上では押したことになるので、ボタンに任せる
    if (combo === "Space" && e.target instanceof HTMLButtonElement) return;
    // 範囲のつまみ（音量など）の上の矢印はつまみに任せる
    if (combo.startsWith("Arrow") && e.target instanceof HTMLInputElement && e.target.type === "range") return;
    const a = ACTIONS.find(x => keyFor(x.id) === combo);
    if (!a || document.body.dataset.state !== "ready" && !["settings", "home", "library"].includes(a.id)) return;
    e.preventDefault();
    run(a.id);
  });
}
