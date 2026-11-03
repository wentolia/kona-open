// プレゼント（包み）: 音楽を聴いていると、まだ持っていない品が包みで届く。ガチャにしない（確率表示・レア度・期限なし）
//  - 再生 30 分ごとに 1 つ、その日はじめて再生したときに 1 つ。合わせて 1 日 5 つまで（1 日は朝 4 時に切り替わる）
//  - 中身は「まだ持っていない品・猫のアクセサリー」の山札から引く（全部そろうまで重ならない）
//  - ときどき「飼える猫がもう 1 匹ふえる」が入る。2 匹目は 50%、10 匹目は 5% まで線形に下げる。10 匹まで
//  - 実績の包みは山札と別で、決まった品が届く（1 日の上限には数えない）
//  - 数えるのは、音が出ているとき（消音・音量 0 は数えない）、開いているタブのうちひとつだけ（Web Locks）
//  最初からある品（STARTER）と、ご当地の品（region.ts）は山札に入らない
import { ITEMS, itemOf, viewBoxOf } from "./items";
import { ACCESSORIES, accOf } from "./cat-acc";
import { gotOf, landName } from "./region";
import { ACHIEVEMENTS, REWARD_KEYS } from "./achievement-list";
import { t } from "./i18n";

const KEY = "kona.presents";
const DAY_CAP = 5, LISTEN_SEC = 30 * 60, CAT_MAX = 10;

/** 最初から持っている品（包みができる前からあった品） */
const STARTER = new Set(("sofa chair cushion kilim round frame still mirror sconce garland swag lowtable sidetable stool lowshelf recordshelf speaker "
  + "floorlamp bigplant basket beanbag stove paperbag stripes cover wallshelf calendar catwalk chime mug teapot cassette headphones radio coverstand "
  + "globe jar bonsai incense musicbox figcat woodbird sakura pumpkin snowman wreath newyear").split(" "));

export type Content = { t: "item"; key: string } | { t: "acc"; key: string } | { t: "cat" };
export type Present = { id: string; k: "listen" | "first" | "ach" | "gift"; c: Content; d: string; al?: string; ach?: string; from?: string };
export type Got = { d: string; al?: string; ach?: string; from?: string };
type State = { got: Record<string, Got>; owned: string[]; acc: string[]; cap: number; pend: Present[]; day: string; n: number; first: boolean; sec: number; ach: Record<string, string>; opened: number; seeded: boolean; gd: string; gk: string; rd: string; rn: number };

export { ACHIEVEMENTS } from "./achievement-list";

const isContent = (c: unknown): c is Content => {
  const x = c as Content;
  return !!x && typeof x === "object" && (x.t === "cat" || ((x.t === "item" || x.t === "acc") && typeof x.key === "string"));
};
function load(): State {
  const def: State = { got: {}, owned: [], acc: [], cap: 0, pend: [], day: "", n: 0, first: false, sec: 0, ach: {}, opened: 0, seeded: false, gd: "", gk: "", rd: "", rn: 0 };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!v || typeof v !== "object") return def;
    const strs = (a: unknown) => Array.isArray(a) ? a.filter((s): s is string => typeof s === "string").slice(0, 2000) : [];
    const pend = Array.isArray(v.pend) ? v.pend.filter((p: Present) => p && typeof p.id === "string" && isContent(p.c) && typeof p.d === "string").slice(0, 200) : [];
    const got: Record<string, Got> = {};
    if (v.got && typeof v.got === "object") for (const [k, g] of Object.entries(v.got as Record<string, Got>))
      if (g && typeof g.d === "string") got[k] = { d: g.d.slice(0, 10), ...(typeof g.al === "string" ? { al: g.al.slice(0, 80) } : {}), ...(typeof g.ach === "string" ? { ach: g.ach } : {}), ...(typeof g.from === "string" ? { from: g.from.slice(0, 40) } : {}) };
    return {
      got, owned: strs(v.owned), acc: strs(v.acc), cap: Math.max(0, Math.min(CAT_MAX, Number(v.cap) || 0)), pend,
      day: typeof v.day === "string" ? v.day : "", n: Number(v.n) || 0, first: !!v.first, sec: Number(v.sec) || 0,
      ach: v.ach && typeof v.ach === "object" ? Object.fromEntries(Object.entries(v.ach).filter(([, d]) => typeof d === "string")) as Record<string, string> : {},
      opened: Number(v.opened) || 0, seeded: !!v.seeded,
      gd: typeof v.gd === "string" ? v.gd : "", gk: typeof v.gk === "string" ? v.gk : "", rd: typeof v.rd === "string" ? v.rd : "", rn: Number(v.rn) || 0,
    };
  } catch { return def; }
}
let st = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* 保存できなくても動く */ } };
const changed = () => document.dispatchEvent(new Event("kona:presents"));

/** 1 日の区切りは朝 4 時（夜ふかしの再生は前の日に数える） */
const dayKey = (t = Date.now()) => { const d = new Date(t - 4 * 3600_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** 包みから届く品（山札のもと） */
export const deckItems = () => ITEMS.filter(d => !STARTER.has(d.key) && !d.region && !REWARD_KEYS.has(d.key));
/** 置けるか: 最初からある品・ご当地の品はいつでも（ご当地は region.ts が見る）。ほかは届いてから */
export const presentAllows = (key: string) => {
  const d = itemOf(key);
  if (!d || STARTER.has(key) || d.region) return true;
  return st.owned.includes(key);
};
export const ownsAcc = (key: string) => !!accOf(key)?.free || st.acc.includes(key);
export const ownedAccs = () => ACCESSORIES.filter(a => ownsAcc(a.key));

/** 飼える猫の数。はじめは 1 匹（すでにそれより多く飼っていれば、その数） */
export const catCap = () => Math.max(1, st.cap);
/** 起動時に一度: いまの飼い猫の数を上限の下限にし、置いている品は持っていることにする（何も取り上げない） */
export function seedPresents(pets: number, placed: string[]) {
  if (st.cap < pets) st.cap = Math.min(CAT_MAX, Math.max(pets, 1));
  if (!st.cap) st.cap = 1;
  if (!st.seeded) {
    for (const k of placed) if (!presentAllows(k)) st.owned.push(k);
    st.seeded = true;
  }
  save();
}

export const pendingPresents = () => st.pend;
export const presentStats = () => {
  roll();
  const deck = deckItems();
  return { today: st.n, cap: DAY_CAP, left: Math.max(1, Math.ceil((LISTEN_SEC - st.sec) / 60)), owned: deck.filter(d => st.owned.includes(d.key)).length, all: deck.length,
    accs: ownedAccs().length, accAll: ACCESSORIES.length, cats: catCap(), catMax: CAT_MAX, opened: st.opened };
};

/** 次の 1 匹（cap + 1 匹目）の上限の報酬が出る確率: 2 匹目 50% 〜 10 匹目 5% を線形に */
export const catChance = (cap: number) => cap >= CAT_MAX ? 0 : .5 - (cap + 1 - 2) * (.45 / 8);

function draw(): Content | undefined {
  const pendCats = st.pend.filter(p => p.c.t === "cat").length, cap = catCap() + pendCats;
  const taken = new Set(st.pend.map(p => p.c.t !== "cat" ? `${p.c.t}:${p.c.key}` : ""));
  const bag: Content[] = [
    ...deckItems().filter(d => !st.owned.includes(d.key) && !taken.has(`item:${d.key}`)).map(d => ({ t: "item", key: d.key }) as Content),
    ...ACCESSORIES.filter(a => !ownsAcc(a.key) && !taken.has(`acc:${a.key}`)).map(a => ({ t: "acc", key: a.key }) as Content),
  ];
  if (cap < CAT_MAX && (Math.random() < catChance(cap) || !bag.length)) return { t: "cat" };
  return bag[Math.floor(Math.random() * bag.length)];
}

let uid = 0;
function deliver(k: Present["k"], album?: string) {
  if (st.n >= DAY_CAP) return;
  const c = draw();
  if (!c) return;
  st.n++;
  st.pend.push({ id: `${Date.now().toString(36)}${(uid++).toString(36)}`, k, c, d: new Date().toISOString(), ...(album ? { al: album.slice(0, 80) } : {}) });
  save(); changed();
}
function roll() {
  const d = dayKey();
  if (st.day !== d) { st.day = d; st.n = 0; st.first = false; }
}

// ひとつのタブだけが数える
let mine = !("locks" in navigator);
function grab() {
  if (mine) return;
  navigator.locks.request("kona.presents", { ifAvailable: true }, lock => {
    if (!lock) { setTimeout(grab, 30_000); return; }
    mine = true;
    return new Promise<void>(() => { /* 開いているあいだ持ち続ける */ });
  }).catch(() => { mine = true; });
}
grab();

let ticks = 0;
/** 1 秒ごとに呼ぶ。audible: 音が出ている（消音・音量 0 でない） */
export function presentTick(playing: boolean, audible: boolean, album?: string) {
  if (!mine || !playing || !audible) return;
  roll();
  if (!st.first) { st.first = true; deliver("first", album); }
  if (++st.sec >= LISTEN_SEC) { st.sec = 0; deliver("listen", album); }
  if (++ticks % 15 === 0) save();
}

/** 実績を解除する（一度だけ）。決まった品が包みで届く */
export function achieve(id: string) {
  const a = ACHIEVEMENTS[id];
  if (!a || st.ach[id]) return;
  st.ach[id] = new Date().toISOString().slice(0, 10);
  st.pend.push({ id: `a${Date.now().toString(36)}`, k: "ach", c: { t: "item", key: a.item }, d: new Date().toISOString(), ach: id });
  save(); changed();
  document.dispatchEvent(new CustomEvent("kona:achieve", { detail: id }));
}
export const achieved = () => Object.entries(st.ach).map(([id, d]) => ({ id, d, ...ACHIEVEMENTS[id] })).filter(a => a.label);
export const hasAch = (id: string) => !!st.ach[id];
export const openedCount = () => st.opened;
export const ownsItem = (key: string) => presentAllows(key);

/** 包みを開ける。中身を手元に入れて返す */
export function openPresent(id: string): Present | undefined {
  const i = st.pend.findIndex(p => p.id === id);
  if (i < 0) return undefined;
  const [p] = st.pend.splice(i, 1);
  if (p.c.t === "item" && !st.owned.includes(p.c.key)) st.owned.push(p.c.key);
  if (p.c.t === "item" && (!st.got[p.c.key] || p.from)) st.got[p.c.key] = { d: p.d.slice(0, 10), ...(p.al ? { al: p.al } : {}), ...(p.ach ? { ach: p.ach } : {}), ...(p.from ? { from: p.from } : {}) };
  if (p.c.t === "acc" && !st.acc.includes(p.c.key)) st.acc.push(p.c.key);
  if (p.c.t === "cat") st.cap = Math.min(CAT_MAX, catCap() + 1);
  st.opened++;
  save(); changed();
  return p;
}

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
/** 届いた品の札（置いた品にカーソルを重ねると出る）: いつ・何を聴いていたとき・誰から */
export function itemTag(key: string): string | undefined {
  const g = st.got[key];
  if (g) {
    if (g.from) return `${g.from}${t("さんから")} · ${md(g.d)}`;
    if (g.ach) return `${t("実績")}「${t(ACHIEVEMENTS[g.ach]?.label ?? g.ach)}」 · ${md(g.d)}`;
    return g.al ? `${md(g.d)} · 「${g.al}」${t("を聴いていたとき")}` : md(g.d);
  }
  const r = gotOf(key);
  if (r) return `${r.from ? `${r.from}${t("さんの部屋で")}（${landName(r.at)}）` : `${landName(r.at)}${t("で")}`} · ${md(r.d)}`;
  return undefined;
}

// 贈りもの（リスニングパーティーで）: 持っている品を部屋にいる人に贈る。贈っても手元からは無くならない。
// 贈れるのは 1 日 1 種類まで（同じ品なら何人にでも）。受け取った品には「〇〇さんから・日付」の札がつく
const GIFT_IN_CAP = 20;   // 1 日に受け取る数の上限（いたずら避け）
/** 贈れる品: 包みや実績で届いた品（最初からある品・ご当地の品はみんな持っているので除く） */
export function giftable(): { key: string; label: string; svg: string }[] {
  return st.owned.map(k => itemOf(k)).filter((d): d is NonNullable<typeof d> => !!d && !d.draft && !d.region && !STARTER.has(d.key))
    .map(d => ({ key: d.key, label: d.label, svg: `<svg viewBox="${viewBoxOf(d)}" preserveAspectRatio="xMidYMid meet">${d.art().replace(/<i [^>]*><\/i>/g, "")}</svg>` }));
}
/** 今日もう贈った品の種類（まだなら undefined） */
export const giftToday = () => st.gd === dayKey() ? st.gk : undefined;
export const canGift = (key: string) => st.owned.includes(key) && (giftToday() ?? key) === key;
/** 贈った（送るのは party.ts）。今日の 1 種類として覚える */
export function gave(key: string): boolean {
  if (!canGift(key)) return false;
  st.gd = dayKey(); st.gk = key;
  save(); achieve("gift-give");
  return true;
}
/** 贈りものを受け取る: 包みとして届く */
export function receiveGift(key: string, from: string): boolean {
  const d = itemOf(key);
  if (!d || d.draft || d.region || STARTER.has(key)) return false;
  const day = dayKey();
  if (st.rd !== day) { st.rd = day; st.rn = 0; }
  if (st.rn >= GIFT_IN_CAP) return false;
  st.rn++;
  st.pend.push({ id: `g${Date.now().toString(36)}${(uid++).toString(36)}`, k: "gift", c: { t: "item", key }, d: new Date().toISOString(), from: from.slice(0, 40) || "名無し" });
  save(); changed();
  achieve("gift-get");
  return true;
}
