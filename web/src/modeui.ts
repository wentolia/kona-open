import type { PlayMode } from "./player";

// 再生のしかたのボタン: 押すたびに 通常 → アルバムリピート → 1 曲リピート → シャッフル と巡る
const LOOP = '<path d="M2.5 7.5V6a2 2 0 0 1 2-2h8M10.5 2l2 2-2 2M13.5 8.5V10a2 2 0 0 1-2 2h-8M5.5 14l-2-2 2-2"/>';
export const MODE_UI: Record<PlayMode, { label: string; icon: string }> = {
  normal: { label: "通常の再生（押すとアルバムをくり返す）", icon: `<svg class="ic-line" viewBox="0 0 16 16">${LOOP}</svg>` },
  album: { label: "アルバムをくり返す（押すと 1 曲をくり返す）", icon: `<svg class="ic-line" viewBox="0 0 16 16">${LOOP}</svg>` },
  track: { label: "1 曲をくり返す（押すとシャッフル）", icon: `<svg class="ic-line" viewBox="0 0 16 16">${LOOP}<text x="8" y="10.4" text-anchor="middle">1</text></svg>` },
  shuffle: { label: "アルバムの中でシャッフル（押すと通常の再生）", icon: '<svg class="ic-line" viewBox="0 0 16 16"><path d="M2 4.5h2.5l6 7h3M11.5 9.5l2 2-2 2M2 11.5h2.5l1.8-2.1M9.7 6.6l.8-1h3M11.5 2.5l2 2-2 2"/></svg>' },
};
export const modeButtonHTML = (mode: PlayMode, cls: string) =>
  `<button class="${cls}" data-mode="${mode}" aria-label="${MODE_UI[mode].label}" title="${MODE_UI[mode].label}">${MODE_UI[mode].icon}</button>`;
