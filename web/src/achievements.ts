// 実績の記録と判定。数えるのは音が出ているときだけ（presents.ts と同じ）。解除すると、決まった品が包みで届く（achieve）
// 一覧と届く品は achievement-list.ts
import type { Album } from "./library";
import { achieve, hasAch, openedCount } from "./presents";

const KEY = "kona.achstats";
type Stats = {
  sec: number; day: string; daySec: number; days: number; streak: number; lastDay: string;
  whole: number; dayWhole: number; byAlbum: Record<string, number>; heard: string[]; genres: string[]; decades: string[];
  strokes: number; catPicks: number; nap: number; season: Record<string, number>;
  slots: Record<string, number>; joins: number; hosts: number; partySec: number;
};
const DEF: Stats = { sec: 0, day: "", daySec: 0, days: 0, streak: 0, lastDay: "", whole: 0, dayWhole: 0, byAlbum: {}, heard: [], genres: [], decades: [],
  strokes: 0, catPicks: 0, nap: 0, season: {}, slots: {}, joins: 0, hosts: 0, partySec: 0 };
function load(): Stats {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!v || typeof v !== "object") return { ...DEF };
    const s = { ...DEF } as Record<string, unknown>;
    for (const [k, d] of Object.entries(DEF)) {
      const x = v[k];
      if (typeof d === "number") s[k] = Number.isFinite(x) ? x : d;
      else if (typeof d === "string") s[k] = typeof x === "string" ? x : d;
      else if (Array.isArray(d)) s[k] = Array.isArray(x) ? x.filter((y: unknown) => typeof y === "string").slice(-3000) : [];
      else s[k] = x && typeof x === "object" ? Object.fromEntries(Object.entries(x).filter(([, n]) => Number.isFinite(n)).slice(-3000)) : {};
    }
    return s as Stats;
  } catch { return { ...DEF }; }
}
const st = load();
let dirty = 0;
const save = () => { dirty = 0; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ } };

const pad = (n: number) => String(n).padStart(2, "0");
/** 1 日は朝 4 時に切り替わる */
const dayOf = (t: number) => { const d = new Date(t - 4 * 3600_000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const seasonOf = (m: number) => m >= 2 && m <= 4 ? "spring" : m >= 5 && m <= 7 ? "summer" : m >= 8 && m <= 10 ? "autumn" : "winter";

/** 一枚通して聴いたか: いまのアルバムの曲ごとに聴いた秒を数え、どの曲も半分以上聴けば 1 枚 */
let cur = "", perTrack = new Map<number, number>(), counted = false, catPicked = "";
let wasParty: string | undefined, prev = 0;

export interface AchCtx {
  playing: boolean; audible: boolean; album?: Album; index: number; duration: number;
  library: number; pets: number; catAsleep: boolean;
  party?: "host" | "guest"; partySize: number;
  placed: { key: string; at: string; cat: string }[];
}
/** 1 秒ごとに呼ぶ */
export function achTick(c: AchCtx) {
  const now = Date.now(), d = new Date(now);
  // 聴いていなくても分かるもの
  if (c.library >= 50) achieve("lib-50");
  if (c.library >= 200) achieve("lib-200");
  if (c.pets >= 3) achieve("cats-3");
  if (c.placed.length >= 1) achieve("room-1");
  if (c.placed.filter(p => p.at === "wall").length >= 5) achieve("wall-5");
  if (c.placed.length >= 30) achieve("room-30");
  if (c.placed.filter(p => p.cat === "季節").length >= 4) achieve("seasons");
  if (openedCount() >= 50) achieve("opened-50");
  // パーティー
  if (c.party !== wasParty) {
    if (c.party === "guest") { st.joins++; dirty++; }
    if (c.party === "host") { st.hosts++; dirty++; }
    wasParty = c.party;
  }
  if (c.party) { st.partySec++; if (c.partySize >= 4) achieve("party-4"); }
  if (c.party === "guest") achieve("party-join");
  if (c.party === "host") achieve("party-host");
  if (st.joins >= 5) achieve("party-5");
  if (st.hosts >= 5) achieve("host-5");
  if (st.partySec >= 10 * 3600) achieve("party-10h");
  if (st.strokes >= 1) achieve("stroke-1");
  if (st.strokes >= 100) achieve("stroke-100");

  const listening = c.playing && c.audible;
  const last = prev; prev = listening ? now : 0;
  if (!listening) { if (dirty) save(); return; }
  // 日付をまたいで（0 時をまたいで鳴らしていた）・年越し
  if (last && new Date(last).getDate() !== d.getDate()) {
    achieve("midnight");
    if (d.getMonth() === 0 && d.getDate() === 1) achieve("newyear-eve");
  }
  // 聴いた時間・日
  const day = dayOf(now);
  if (st.day !== day) {
    const y = dayOf(now - 86400_000);
    st.streak = st.lastDay === y ? st.streak + 1 : 1;
    st.days++; st.lastDay = day; st.day = day; st.daySec = 0; st.dayWhole = 0; st.slots = {};
  }
  st.sec++; st.daySec++;
  const h = st.sec / 3600;
  for (const [n, id] of [[1, "hours-1"], [10, "hours-10"], [50, "hours-50"], [100, "hours-100"], [300, "hours-300"], [500, "hours-500"], [1000, "hours-1000"]] as const) if (h >= n) achieve(id);
  if (st.daySec >= 3 * 3600) achieve("long-day");
  if (st.streak >= 7) achieve("streak-7");
  if (st.streak >= 30) achieve("streak-30");
  if (st.days >= 100) achieve("days-100");
  // 時間帯（その日のうちに 10 分）・季節（合わせて 1 時間）
  const hr = d.getHours(), wd = d.getDay(), slot = (k: string, need = 600) => { st.slots[k] = (st.slots[k] ?? 0) + 1; return st.slots[k] >= need; };
  if (hr >= 4 && hr < 6 && slot("dawn")) achieve("dawn");
  if (hr >= 5 && hr < 7 && slot("early")) achieve("early");
  if (hr === 12 && slot("lunch")) achieve("lunch");
  if (hr >= 17 && hr < 19 && slot("dusk")) achieve("dusk");
  if ((wd === 0 || wd === 6) && hr >= 6 && hr < 11 && slot("weekend", 3600)) achieve("weekend");
  if (d.getMonth() === 0 && d.getDate() === 1 && slot("newyear")) achieve("newyear-day");
  const se = seasonOf(d.getMonth());
  st.season[se] = (st.season[se] ?? 0) + 1;
  if (st.season[se] >= 3600) achieve(se);
  if (c.catAsleep && ++st.nap >= 3600) achieve("nap");
  // アルバム
  const a = c.album;
  if (a) {
    if (a.key !== cur) { cur = a.key; perTrack = new Map(); counted = false; }
    perTrack.set(c.index, (perTrack.get(c.index) ?? 0) + 1);
    if ((perTrack.get(c.index) ?? 0) === 60) {
      if (!st.heard.includes(a.key)) { st.heard.push(a.key); if (st.heard.length > 3000) st.heard.shift(); }
      const g = a.genre?.trim().toLowerCase();
      if (g && !st.genres.includes(g)) st.genres.push(g);
      const dec = a.year ? String(Math.floor(a.year / 10) * 10) : "";
      if (dec && !st.decades.includes(dec)) st.decades.push(dec);
      if (st.heard.length >= 20) achieve("new-20");
      if (st.genres.length >= 10) achieve("genres-10");
      if (st.decades.length >= 5) achieve("decades-5");
    }
    const n = a.tracks.length;
    if (!counted && n && a.tracks.every((t, i) => (perTrack.get(i) ?? 0) >= Math.min(120, Math.max(5, (i === c.index && c.duration ? c.duration : t.duration ?? 60) * .5)))) {
      counted = true;
      st.whole++; st.dayWhole++;
      st.byAlbum[a.key] = (st.byAlbum[a.key] ?? 0) + 1;
      if (catPicked === a.key) { st.catPicks++; catPicked = ""; }
      for (const [k, id] of [[1, "whole-1"], [10, "whole-10"], [50, "whole-50"], [100, "whole-100"]] as const) if (st.whole >= k) achieve(id);
      if (st.dayWhole >= 3) achieve("three-day");
      if (st.byAlbum[a.key] >= 10) achieve("favorite");
      if (st.catPicks >= 1) achieve("cat-pick");
      if (st.catPicks >= 5) achieve("cat-pick-5");
    }
  }
  if (++dirty >= 15) save();
}

document.addEventListener("kona:stroke", () => { st.strokes++; dirty++; });
document.addEventListener("kona:catpick", e => { const k = (e as CustomEvent<string>).detail; if (typeof k === "string") catPicked = k; });
addEventListener("pagehide", save);
export const achStats = () => ({ hours: st.sec / 3600, whole: st.whole, strokes: st.strokes, done: hasAch });
