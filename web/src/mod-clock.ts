// 時計まわり: 正時の鐘と、空中に掛ける時計のモジュール（おやすみタイマーは棚のろうそく。mod-objects.ts）。
// 時計は 2 通り: 棚に立てる置き時計（mod-objects.ts のアナログ時計）と、空中に掛ける時計のモジュール。
// モジュールにはメニューを付けない。文字盤を押すと、デジタルとアナログが入れ替わる

import { ctx, everyFrame } from "./modctx";

// 正時の鐘: 設定（部屋 → 置くもの、時計の並びの下）で切り替える。kona.clock に置く（以前の時計の種類 kind も残っていれば読む）
const LOOK_KEY = "kona.clock";
const readLook = (): { kind?: string; chime: boolean } => { try { const v = JSON.parse(localStorage.getItem(LOOK_KEY) ?? "{}"); return { kind: typeof v.kind === "string" ? v.kind : undefined, chime: v.chime === true }; } catch { return { chime: false }; } };
export const chimeOn = () => readLook().chime;
const writeLook = (v: { kind?: string; chime: boolean }) => { try { localStorage.setItem(LOOK_KEY, JSON.stringify(v)); } catch { /* ignore */ } };
export function setChime(on: boolean) { writeLook({ ...readLook(), chime: on }); }
/** 時計のモジュールの種類。以前の振り子はアナログとして描く */
const moduleKind = (): "digital" | "analog" => { const k = readLook().kind; return k === "analog" || k === "pendulum" ? "analog" : "digital"; };

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

// 文字盤の目盛り（12 本、3・6・9・12 は太く）
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = i * Math.PI / 6, big = i % 3 === 0, r1 = big ? 37 : 40;
  const f = (n: number) => n.toFixed(2);
  return `<line x1="${f(50 + Math.sin(a) * r1)}" y1="${f(50 - Math.cos(a) * r1)}" x2="${f(50 + Math.sin(a) * 44)}" y2="${f(50 - Math.cos(a) * 44)}"${big ? ' class="big"' : ""}/>`;
}).join("");
const ANALOG = `<svg class="ck-analog" viewBox="0 0 100 100" role="img"><circle class="ck-dial" cx="50" cy="50" r="46"/><g class="ck-ticks">${TICKS}</g><g class="ck-hands"><line class="ck-h" x1="50" y1="54" x2="50" y2="27"/><line class="ck-m" x1="50" y1="56" x2="50" y2="15"/><line class="ck-s" x1="50" y1="60" x2="50" y2="12"/><circle cx="50" cy="50" r="2.2"/></g></svg>`;

/** 時計のモジュール: 棚に乗せず、空中（好きな列）に掛ける時計 */
export function mountClock(body: HTMLElement) {
  body.innerHTML = `
    <div class="clock" role="button" tabindex="0" title="押すとデジタル / アナログを切り替える">
      <div class="clock-face">
        <div class="clock-dial"></div>
        <time class="clock-time"></time>
        <span class="clock-date"></span>
      </div>
    </div>`;
  const root = body.querySelector<HTMLElement>(".clock")!;
  const time = root.querySelector<HTMLTimeElement>(".clock-time")!, date = root.querySelector<HTMLElement>(".clock-date")!;
  const dial = root.querySelector<HTMLElement>(".clock-dial")!;
  let hands: { h: SVGElement; m: SVGElement; s: SVGElement } | undefined;
  let lastMin = -1;
  const draw = () => {
    const kind = moduleKind();
    root.dataset.kind = kind;
    dial.innerHTML = kind === "analog" ? ANALOG : "";
    const q = (c: string) => dial.querySelector<SVGElement>(c)!;
    hands = kind === "analog" ? { h: q(".ck-h"), m: q(".ck-m"), s: q(".ck-s") } : undefined;
    lastMin = -1;
  };
  const flip = () => { writeLook({ ...readLook(), kind: moduleKind() === "analog" ? "digital" : "analog" }); draw(); };
  root.addEventListener("click", flip);
  root.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  draw();
  everyFrame(root, () => {
    const now = new Date();
    if (now.getMinutes() !== lastMin) {
      lastMin = now.getMinutes();
      time.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
      time.dateTime = now.toISOString();
      date.textContent = now.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
      dial.firstElementChild?.setAttribute("aria-label", `${now.getHours()}時${now.getMinutes()}分`);
    }
    if (hands) {
      const s = now.getSeconds(), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
      hands.h.setAttribute("transform", `rotate(${h * 30} 50 50)`);
      hands.m.setAttribute("transform", `rotate(${m * 6} 50 50)`);
      hands.s.setAttribute("transform", `rotate(${s * 6} 50 50)`);
    }
    root.classList.toggle("clock-tick", now.getSeconds() % 2 === 0);
  });
}
