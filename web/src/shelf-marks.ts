// 棚板の跡: ホームの棚板に、暮らした跡が少しずつ残る。
//  - 猫がよく眠る場所: 板の縁に、その猫の毛色の毛が引っかかり、板の前がうっすら擦れて明るくなる
//  - 猫がよく跳び乗る場所: 板の前に、爪で引っかいた細い傷
//  - コーヒーを置く場所: 縁から垂れたしみ（置いた日の数だけ濃くなる）
// 位置は棚（モジュール）ごとに、幅を 48 に分けた区画で覚える。モジュールの幅が変わっても同じ場所に残る。
// 記録は端末の中（kona.marks）だけ。設定の「棚板に跡を残す」で止められる（止めると跡も見せない）

import { prefs } from "./prefs";

const KEY = "kona.marks", N = 48;
interface ModMarks { s?: Record<number, [number, string]>; c?: Record<number, number>; k?: Record<number, number>; kd?: string }
let data: Record<string, ModMarks> | undefined;
const load = () => {
  if (data) return data;
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "{}"); data = v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { data = {}; }
  return data!;
};
let saveTimer = 0;
const save = () => {
  if (saveTimer) return;
  saveTimer = window.setTimeout(() => { saveTimer = 0; try { localStorage.setItem(KEY, JSON.stringify(data ?? {})); } catch { /* 保存できなくても動く */ } }, 4000);
};
const on = () => prefs().marks;

/** 棚の中の区画（0〜N-1）。clientX は画面の座標 */
function slot(mod: Element, clientX: number): [string, number] | undefined {
  const id = (mod as HTMLElement).dataset?.id, r = mod.getBoundingClientRect();
  if (!id || !r.width) return;
  return [id, Math.max(0, Math.min(N - 1, Math.floor((clientX - r.left) / r.width * N)))];
}
const of = (id: string) => (load()[id] ??= {});

/** 猫が眠っていた（sec 秒）。fur はその猫の毛色 */
export function markNap(mod: Element, clientX: number, sec: number, fur: string) {
  if (!on()) return;
  const s = slot(mod, clientX); if (!s) return;
  const m = of(s[0]); m.s ??= {};
  const cur = m.s[s[1]] ?? [0, fur];
  // 毛の色は、そこでいちばん長く眠った子の色に寄っていく（ここでは新しく寝た子の色にときどき替わる）
  m.s[s[1]] = [Math.round(cur[0] + sec), sec > 0 && Math.random() < .15 ? fur : cur[1]];
  save();
}
/** 猫が跳び乗った */
export function markClaw(mod: Element, clientX: number) {
  if (!on()) return;
  const s = slot(mod, clientX); if (!s) return;
  const m = of(s[0]); m.c ??= {};
  m.c[s[1]] = (m.c[s[1]] ?? 0) + 1;
  save();
}
/** コーヒーを置いている。1 日に 1 回だけ数える */
let coffeeAt = 0;
export function markCoffee(mod: Element, clientX: number) {
  const now = Date.now();
  if (!on() || now - coffeeAt < 60_000) return; // 毎フレーム呼ばれるので、確かめるのは 1 分に 1 回
  coffeeAt = now;
  const s = slot(mod, clientX); if (!s) return;
  const m = of(s[0]), today = new Date().toDateString();
  if (m.kd === today) return;
  m.kd = today; m.k ??= {};
  m.k[s[1]] = (m.k[s[1]] ?? 0) + 1;
  save();
}

// ---------- 描く ----------
const seeded = (n: number) => { let s = n * 2654435761 >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 13), 1274126177) >>> 0) / 4294967296); };

function svgFor(m: ModMarks, w: number, board: number) {
  const TOP = 12, H = TOP + board; // 上の 12px は縁に乗った毛のため
  const cx = (b: number) => (b + .5) / N * w;
  let out = "";
  // 擦れ: 猫がよく眠る所は、板の前がうっすら明るい
  for (const [b, [sec, fur]] of Object.entries(m.s ?? {})) {
    if (sec < 120) continue;
    const a = Math.min(1, sec / (4 * 3600)), x = cx(Number(b)), R = seeded(Number(b) + 11);
    out += `<ellipse cx="${x.toFixed(1)}" cy="${(TOP + board * .45).toFixed(1)}" rx="${(18 + 10 * a).toFixed(1)}" ry="${(board * .55).toFixed(1)}" fill="rgba(255, 238, 214, ${(.04 + .1 * a).toFixed(3)})"/>`;
    // 毛: 縁に乗って、少し前へ垂れる。長く眠った所ほど多い
    const n = Math.round(1 + a * 9);
    for (let i = 0; i < n; i++) {
      const x0 = x + (R() - .5) * 46, len = 3 + R() * 5, dir = R() < .5 ? -1 : 1, droop = R() * 4;
      out += `<path d="M${x0.toFixed(1)} ${(TOP - .5).toFixed(1)} q${(dir * len * .6).toFixed(1)} ${(-1 - R() * 1.5).toFixed(1)} ${(dir * len).toFixed(1)} ${droop.toFixed(1)}" stroke="${fur}" stroke-width="${(.5 + R() * .5).toFixed(2)}" fill="none" stroke-linecap="round" opacity="${(.55 + .4 * a).toFixed(2)}"/>`;
    }
  }
  // 爪あと: 跳び乗るたびに少しずつ増える細い斜めの傷（明るい筋と、下の暗い影）
  for (const [b, cnt] of Object.entries(m.c ?? {})) {
    if (cnt < 3) continue;
    const sets = Math.min(4, Math.floor(cnt / 3)), x = cx(Number(b)), R = seeded(Number(b) + 101);
    for (let k = 0; k < sets; k++) {
      const x0 = x + (R() - .5) * 30, tilt = (R() - .5) * 3;
      for (let j = 0; j < 3; j++) {
        const xx = x0 + j * 2.4, y0 = TOP + 1, y1 = TOP + board * (.55 + R() * .35);
        out += `<path d="M${xx.toFixed(1)} ${y0} L${(xx + tilt).toFixed(1)} ${y1.toFixed(1)}" stroke="rgba(255, 236, 210, .32)" stroke-width=".7" stroke-linecap="round"/>`
          + `<path d="M${(xx + .7).toFixed(1)} ${y0} L${(xx + tilt + .7).toFixed(1)} ${y1.toFixed(1)}" stroke="rgba(0, 0, 0, .28)" stroke-width=".6" stroke-linecap="round"/>`;
      }
    }
  }
  // コーヒーのしみ: 縁に輪、前へ 1〜2 筋垂れる。置いた日が多いほど濃い
  for (const [b, days] of Object.entries(m.k ?? {})) {
    if (days < 2) continue;
    const a = Math.min(1, days / 30), x = cx(Number(b)), R = seeded(Number(b) + 503);
    const col = `rgba(38, 20, 8, ${(.3 + .4 * a).toFixed(3)})`;
    out += `<ellipse cx="${x.toFixed(1)}" cy="${TOP + .8}" rx="${(9 + 3 * a).toFixed(1)}" ry="1.4" fill="none" stroke="${col}" stroke-width="1.1"/>`;
    const drips = days >= 10 ? 2 : 1;
    for (let i = 0; i < drips; i++) {
      const dx = x + (R() - .5) * 12, len = board * (.5 + R() * .45);
      out += `<path d="M${dx.toFixed(1)} ${TOP} q.6 ${(len * .5).toFixed(1)} 0 ${len.toFixed(1)}" stroke="${col}" stroke-width="${(1.4 + R()).toFixed(2)}" stroke-linecap="round" fill="none"/>`;
    }
  }
  return out ? `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">${out}</svg>` : "";
}

function paint() {
  const show = on(), d = load();
  const board = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--board")) || 11;
  document.querySelectorAll<HTMLElement>(".grid .mod-shelf[data-id]").forEach(mod => {
    let el = mod.querySelector<HTMLElement>(":scope > .shelf-marks");
    const m = show ? d[mod.dataset.id!] : undefined;
    if (!m) { el?.remove(); return; }
    if (!el) { el = document.createElement("div"); el.className = "shelf-marks"; el.setAttribute("aria-hidden", "true"); mod.append(el); }
    const w = Math.round(el.clientWidth), sig = `${w}|${board}|${JSON.stringify(m.s)}|${JSON.stringify(m.c)}|${JSON.stringify(m.k)}`;
    if (el.dataset.sig === sig) return;
    el.dataset.sig = sig;
    el.style.height = `${board + 12}px`;
    el.innerHTML = svgFor(m, w, board);
  });
}

export function initShelfMarks() {
  // 跡はゆっくり増えるので、数秒ごとに見直すだけでよい（配置の変更・棚の素材の変更にもここで追いつく）
  setInterval(() => { if (!document.hidden) paint(); }, 3000);
  document.addEventListener("kona:prefs", e => { if ((e as CustomEvent).detail.includes("marks")) paint(); });
  addEventListener("resize", () => paint()); // 棚の素材を替えたときも来る（板の厚みが変わる）
  paint();
}
