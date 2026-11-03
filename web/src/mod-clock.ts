// 時計まわり: 正時の鐘と、スリープタイマーの予約（アルバムの終わりで止める）。
// 時計そのものは棚の小物（mod-objects.ts のアナログ時計・デジタル時計）。以前の時計のモジュールと種類のメニューはない

import { ctx } from "./modctx";

interface Sleep { until?: number; albumEnd: boolean; fading: boolean; choice?: number }
const sleep: Sleep = { albumEnd: false, fading: false };

/** アルバムを聴き終えたとき、次へ進まずに止めるか（本体の「次に再生」より先に聞く） */
export function stopAtAlbumEnd(): boolean {
  if (!sleep.albumEnd) return false;
  sleep.albumEnd = false;
  return true;
}
/** 「アルバムの終わり」で止める予約が入っているか（予約は消さずに見るだけ） */
export const albumEndArmed = () => !!sleep.albumEnd;

// 正時の鐘: 設定（部屋 → もっと見る）で切り替える。kona.clock に置く（以前の時計の種類 kind も残っていれば読む）
const LOOK_KEY = "kona.clock";
const readLook = (): { kind?: string; chime: boolean } => { try { const v = JSON.parse(localStorage.getItem(LOOK_KEY) ?? "{}"); return { kind: typeof v.kind === "string" ? v.kind : undefined, chime: v.chime === true }; } catch { return { chime: false }; } };
export const chimeOn = () => readLook().chime;
export function setChime(on: boolean) { try { localStorage.setItem(LOOK_KEY, JSON.stringify({ chime: on })); } catch { /* ignore */ } }
/** 以前の時計のモジュールの種類（アナログ / デジタル / 振り子）。置き時計に置き換えるときに使う */
export const legacyClockKind = () => readLook().kind;

// 鐘の音: 鐘らしい倍音（1 : 2 : 2.76 : 5.4）を重ね、ゆっくり消える
function bell(ac: AudioContext, out: AudioNode, at: number, freq: number, vol: number) {
  for (const [ratio, amp, decay] of [[1, 1, 3.2], [2, .5, 2.2], [2.76, .35, 1.6], [5.4, .15, .8]] as const) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = freq * ratio;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol * amp, at + .008);
    g.gain.exponentialRampToValueAtTime(.0001, at + decay);
    o.connect(g).connect(out); o.start(at); o.stop(at + decay + .05);
  }
}
/** 正時に鳴らす: 「キン・コン」と 2 音 */
export function chimeHour(_hour: number) {
  const io = ctx().player.chimeInput();
  if (!io) return; // まだ一度も再生していない（ブラウザが音を出させてくれない）ときは鳴らさない
  const { ctx: ac, input } = io, t = ac.currentTime + .05;
  bell(ac, input, t, 784, .06); bell(ac, input, t + .7, 659, .06);
}
