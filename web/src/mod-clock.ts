// 時計とスリープタイマー: 置き時計の文字盤。決めた時間か、アルバムの終わりで静かに止める。
// ポモドーロ: 集中 25 分（音楽を流す）→ 休憩 5 分（静かに止める）を繰り返す。4 回目の休憩は 15 分。
// ポモドーロの間は、時計と再生の画面以外を触れなくする（本体が "kona:focus" を受けて鍵をかける）

import { ctx, fmt, everyFrame } from "./modctx";

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

const FOCUS = 25, BREAK = 5, LONG = 15;
interface Pomo { phase: "focus" | "break"; until: number; round: number }
let pomo: Pomo | undefined;
export const focusLocked = () => !!pomo;
const announce = () => document.dispatchEvent(new CustomEvent("kona:focus", { detail: !!pomo }));

// 時計の種類と、正時の鐘。設定は kona.clock に置く
type Kind = "digital" | "analog" | "pendulum";
const KINDS: { key: Kind; label: string }[] = [{ key: "digital", label: "デジタル" }, { key: "analog", label: "アナログ" }, { key: "pendulum", label: "振り子" }];
interface Look { kind: Kind; chime: boolean }
const LOOK_KEY = "kona.clock";
const look: Look = { kind: "digital", chime: false };
try {
  const v = JSON.parse(localStorage.getItem(LOOK_KEY) ?? "{}");
  if (KINDS.some(k => k.key === v.kind)) look.kind = v.kind;
  look.chime = v.chime === true;
} catch { /* ignore */ }
const saveLook = () => { try { localStorage.setItem(LOOK_KEY, JSON.stringify(look)); } catch { /* ignore */ } };

// 文字盤の目盛り（12 本、3・6・9・12 は太く）
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = i * Math.PI / 6, big = i % 3 === 0, r1 = big ? 37 : 40;
  const f = (n: number) => n.toFixed(2);
  return `<line x1="${f(50 + Math.sin(a) * r1)}" y1="${f(50 - Math.cos(a) * r1)}" x2="${f(50 + Math.sin(a) * 44)}" y2="${f(50 - Math.cos(a) * 44)}"${big ? ' class="big"' : ""}/>`;
}).join("");
const HANDS = `<g class="ck-hands"><line class="ck-h" x1="50" y1="54" x2="50" y2="27"/><line class="ck-m" x1="50" y1="56" x2="50" y2="15"/><line class="ck-s" x1="50" y1="60" x2="50" y2="12"/><circle cx="50" cy="50" r="2.2"/></g>`;
const DIAL = `<circle class="ck-dial" cx="50" cy="50" r="46"/><g class="ck-ticks">${TICKS}</g>${HANDS}`;
const ANALOG = `<svg class="ck-analog" viewBox="0 0 100 100" role="img">${DIAL}</svg>`;
// 振り子時計: 上に文字盤、下の窓で振り子が揺れる
const PENDULUM = `<svg class="ck-pendulum" viewBox="0 0 100 190" role="img">
  <path class="ck-case" d="M14 50 A36 36 0 0 1 86 50 V176 Q86 184 78 184 H22 Q14 184 14 176 Z"/>
  <rect class="ck-window" x="28" y="98" width="44" height="76" rx="4"/>
  <g class="ck-bob"><line x1="50" y1="92" x2="50" y2="150"/><circle cx="50" cy="154" r="8"/></g>
  <g transform="translate(14 14) scale(.72)">${DIAL}</g>
</svg>`;

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
/** 正時に鳴らす。振り子時計は時の数だけ打ち、ほかは「キン・コン」と 2 音だけ */
function chime(kind: Kind, hour: number) {
  const io = ctx().player.chimeInput();
  if (!io) return; // まだ一度も再生していない（ブラウザが音を出させてくれない）ときは鳴らさない
  const { ctx: ac, input } = io, t = ac.currentTime + .05;
  if (kind === "pendulum") {
    const n = hour % 12 || 12;
    for (let i = 0; i < n; i++) bell(ac, input, t + i * 1.6, 392, .09);
  } else { bell(ac, input, t, 784, .06); bell(ac, input, t + .7, 659, .06); }
}

const CHOICES: { label: string; min?: number }[] = [
  { label: "15分", min: 15 }, { label: "30分", min: 30 }, { label: "60分", min: 60 }, { label: "アルバムの終わり" },
];

export function mountClock(body: HTMLElement) {
  body.innerHTML = `
    <div class="clock">
      <div class="clock-face">
        <div class="clock-dial"></div>
        <time class="clock-time"></time>
        <span class="clock-date"></span>
      </div>
      <button class="clock-btn" aria-label="タイマー" aria-haspopup="true" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.6M10 3.5h4"/></svg>
      </button>
      <div class="clock-menu" hidden>
      <div class="clock-sleep" role="group" aria-label="スリープタイマー">
        <span class="clock-label">おやすみ</span>
        ${CHOICES.map((c, i) => `<button class="clock-chip" data-i="${i}">${c.label}</button>`).join("")}
      </div>
      <div class="clock-sleep clock-pomo" role="group" aria-label="ポモドーロ">
        <span class="clock-label">ポモドーロ</span>
        <button class="clock-chip" data-pomo>${FOCUS} / ${BREAK}分</button>
      </div>
      <div class="clock-sleep" role="group" aria-label="時計の種類">
        <span class="clock-label">時計</span>
        ${KINDS.map(k => `<button class="clock-chip" data-kind="${k.key}">${k.label}</button>`).join("")}
        <button class="clock-chip" data-chime aria-pressed="false">正時の鐘</button>
      </div>
      </div>
      <span class="clock-left"></span>
    </div>`;
  const root = body.querySelector<HTMLElement>(".clock")!;
  const time = root.querySelector<HTMLTimeElement>(".clock-time")!, date = root.querySelector<HTMLElement>(".clock-date")!;
  const left = root.querySelector<HTMLElement>(".clock-left")!;
  const chips = [...root.querySelectorAll<HTMLButtonElement>(".clock-chip[data-i]")];
  const pomoChip = root.querySelector<HTMLButtonElement>("[data-pomo]")!;
  const dial = root.querySelector<HTMLElement>(".clock-dial")!;
  const kindChips = [...root.querySelectorAll<HTMLButtonElement>(".clock-chip[data-kind]")];
  const chimeChip = root.querySelector<HTMLButtonElement>("[data-chime]")!;
  let hands: { h: SVGElement; m: SVGElement; s: SVGElement } | undefined;
  const drawKind = () => {
    root.dataset.kind = look.kind;
    dial.innerHTML = look.kind === "analog" ? ANALOG : look.kind === "pendulum" ? PENDULUM : "";
    const q = (c: string) => dial.querySelector<SVGElement>(c)!;
    hands = look.kind === "digital" ? undefined : { h: q(".ck-h"), m: q(".ck-m"), s: q(".ck-s") };
    kindChips.forEach(b => b.classList.toggle("on", b.dataset.kind === look.kind));
    lastMin = -1;
  };
  kindChips.forEach(b => b.onclick = () => { look.kind = b.dataset.kind as Kind; saveLook(); drawKind(); });
  chimeChip.onclick = () => { look.chime = !look.chime; saveLook(); sync(); };
  // 選択肢はふだん隠し、無地のボタンを押したときだけ出す
  const btn = root.querySelector<HTMLButtonElement>(".clock-btn")!, menu = root.querySelector<HTMLElement>(".clock-menu")!;
  const openMenu = (open: boolean) => { menu.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
  btn.onclick = () => openMenu(menu.hidden !== false);
  menu.addEventListener("click", e => { if ((e.target as HTMLElement).closest(".clock-chip")) openMenu(false); });
  document.addEventListener("pointerdown", e => { if (!menu.hidden && !(e.target as HTMLElement).closest?.(".clock-menu, .clock-btn")) openMenu(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") openMenu(false); });
  pomoChip.onclick = () => {
    if (pomo) pomo = undefined;
    else {
      sleep.until = undefined; sleep.albumEnd = false; sleep.choice = undefined;
      pomo = { phase: "focus", until: Date.now() + FOCUS * 60_000, round: 1 };
      const p = ctx().player;
      if (p.album && !p.playing) p.toggle();
    }
    announce(); sync();
  };

  chips.forEach(b => b.onclick = () => {
    const i = Number(b.dataset.i), c = CHOICES[i];
    const same = sleep.choice === i;
    sleep.until = undefined; sleep.albumEnd = false; sleep.choice = undefined;
    if (!same && pomo) { pomo = undefined; announce(); }
    if (!same) { sleep.choice = i; if (c.min) sleep.until = Date.now() + c.min * 60_000; else sleep.albumEnd = true; }
    sync();
  });

  let lastMin = -1;
  drawKind();
  const sync = () => {
    if (sleep.until === undefined && !sleep.albumEnd) sleep.choice = undefined;
    chips.forEach((b, i) => b.classList.toggle("on", sleep.choice === i));
    root.classList.toggle("clock-armed", sleep.choice !== undefined || pomo?.phase === "focus");
    root.classList.toggle("clock-rest", pomo?.phase === "break");
    pomoChip.classList.toggle("on", !!pomo);
    btn.classList.toggle("on", sleep.choice !== undefined || !!pomo);
    chimeChip.classList.toggle("on", look.chime);
    chimeChip.setAttribute("aria-pressed", String(look.chime));
  };
  let lastHour = new Date().getHours();

  everyFrame(root, () => {
    sync();
    const now = new Date();
    if (now.getMinutes() !== lastMin) {
      lastMin = now.getMinutes();
      time.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
      time.dateTime = now.toISOString();
      date.textContent = now.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
      dial.firstElementChild?.setAttribute("aria-label", `${now.getHours()}時${now.getMinutes()}分`);
    }
    if (now.getHours() !== lastHour) {
      lastHour = now.getHours();
      if (look.chime && now.getMinutes() === 0) chime(look.kind, lastHour);
    }
    if (hands) {
      const s = now.getSeconds(), m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
      hands.h.setAttribute("transform", `rotate(${h * 30} 50 50)`);
      hands.m.setAttribute("transform", `rotate(${m * 6} 50 50)`);
      hands.s.setAttribute("transform", `rotate(${s * 6} 50 50)`);
    }
    root.classList.toggle("clock-tick", now.getSeconds() % 2 === 0);
    if (pomo) {
      const rest = Math.max(0, (pomo.until - Date.now()) / 1000);
      left.textContent = `${pomo.phase === "focus" ? "集中" : "休憩"} ${pomo.round}　${fmt(rest)}`;
      if (rest <= 0) {
        const p = ctx().player;
        if (pomo.phase === "focus") {
          pomo = { ...pomo, phase: "break", until: Date.now() + (pomo.round % 4 === 0 ? LONG : BREAK) * 60_000 };
          p.fadeOutAndPause(8);
        } else {
          pomo = { phase: "focus", until: Date.now() + FOCUS * 60_000, round: pomo.round + 1 };
          if (p.album && !p.playing) p.toggle();
        }
        sync();
      }
    } else if (sleep.until !== undefined) {
      const rest = Math.max(0, (sleep.until - Date.now()) / 1000);
      left.textContent = `あと ${fmt(rest)}`;
      if (rest <= 0 && !sleep.fading) {
        sleep.fading = true; sleep.until = undefined;
        ctx().player.fadeOutAndPause(8).finally(() => { sleep.fading = false; sync(); });
        sync();
      }
    } else left.textContent = "";
  });
  sync();
}
