// プレゼント（包み）: 音楽を聴いていると、まだ持っていない品が包みで届く。ガチャにしない（確率表示・レア度・期限なし）
//  - 再生 30 分ごとに 1 つ、その日はじめて再生したときに 1 つ。合わせて 1 日 5 つまで（1 日は朝 4 時に切り替わる）
//  - 中身は「まだ持っていない品・猫のアクセサリー」の山札から引く（全部そろうまで重ならない）
//  - ときどき「飼える猫がもう 1 匹ふえる」が入る。2 匹目は 50%、10 匹目は 5% まで線形に下げる。10 匹まで
//  - 実績の包みは山札と別で、決まった品が届く（1 日の上限には数えない）
//  - 数えるのは、音が出ているとき（消音・音量 0 は数えない）、開いているタブのうちひとつだけ（Web Locks）
//  最初からある品（STARTER）と、ご当地の品（region.ts）は山札に入らない
import { ITEMS, itemOf } from "./items";
import { ACCESSORIES, accOf } from "./cat-acc";

const KEY = "kona.presents";
const DAY_CAP = 5, LISTEN_SEC = 30 * 60, CAT_MAX = 10;

/** 最初から持っている品（包みができる前からあった品） */
const STARTER = new Set(("sofa chair cushion kilim round frame still mirror sconce garland swag lowtable sidetable stool lowshelf recordshelf speaker "
  + "floorlamp bigplant basket beanbag stove paperbag stripes cover wallshelf calendar catwalk chime mug teapot cassette headphones radio coverstand "
  + "globe jar bonsai incense musicbox figcat woodbird sakura pumpkin snowman wreath newyear").split(" "));

export type Content = { t: "item"; key: string } | { t: "acc"; key: string } | { t: "cat" };
export type Present = { id: string; k: "listen" | "first" | "ach"; c: Content; d: string; al?: string; ach?: string };
type State = { owned: string[]; acc: string[]; cap: number; pend: Present[]; day: string; n: number; first: boolean; sec: number; ach: Record<string, string>; opened: number; seeded: boolean };

/** 実績: id → 届く品（items/*.ts の reward と同じ） */
export const ACHIEVEMENTS: Record<string, { label: string; item: string }> = {
  "party-join": { label: "はじめてのパーティー参加", item: "cracker" },
  "party-host": { label: "はじめてのパーティー主催", item: "mirrorball" },
};

const isContent = (c: unknown): c is Content => {
  const x = c as Content;
  return !!x && typeof x === "object" && (x.t === "cat" || ((x.t === "item" || x.t === "acc") && typeof x.key === "string"));
};
function load(): State {
  const def: State = { owned: [], acc: [], cap: 0, pend: [], day: "", n: 0, first: false, sec: 0, ach: {}, opened: 0, seeded: false };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!v || typeof v !== "object") return def;
    const strs = (a: unknown) => Array.isArray(a) ? a.filter((s): s is string => typeof s === "string").slice(0, 2000) : [];
    const pend = Array.isArray(v.pend) ? v.pend.filter((p: Present) => p && typeof p.id === "string" && isContent(p.c) && typeof p.d === "string").slice(0, 200) : [];
    return {
      owned: strs(v.owned), acc: strs(v.acc), cap: Math.max(0, Math.min(CAT_MAX, Number(v.cap) || 0)), pend,
      day: typeof v.day === "string" ? v.day : "", n: Number(v.n) || 0, first: !!v.first, sec: Number(v.sec) || 0,
      ach: v.ach && typeof v.ach === "object" ? Object.fromEntries(Object.entries(v.ach).filter(([, d]) => typeof d === "string")) as Record<string, string> : {},
      opened: Number(v.opened) || 0, seeded: !!v.seeded,
    };
  } catch { return def; }
}
let st = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* 保存できなくても動く */ } };
const changed = () => document.dispatchEvent(new Event("kona:presents"));

/** 1 日の区切りは朝 4 時（夜ふかしの再生は前の日に数える） */
const dayKey = (t = Date.now()) => { const d = new Date(t - 4 * 3600_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const rewardKeys = () => new Set(Object.values(ACHIEVEMENTS).map(a => a.item));
/** 包みから届く品（山札のもと） */
export const deckItems = () => ITEMS.filter(d => !STARTER.has(d.key) && !d.region && !rewardKeys().has(d.key));
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
}
export const achieved = () => Object.entries(st.ach).map(([id, d]) => ({ id, d, ...ACHIEVEMENTS[id] })).filter(a => a.label);

/** 包みを開ける。中身を手元に入れて返す */
export function openPresent(id: string): Present | undefined {
  const i = st.pend.findIndex(p => p.id === id);
  if (i < 0) return undefined;
  const [p] = st.pend.splice(i, 1);
  if (p.c.t === "item" && !st.owned.includes(p.c.key)) st.owned.push(p.c.key);
  if (p.c.t === "acc" && !st.acc.includes(p.c.key)) st.acc.push(p.c.key);
  if (p.c.t === "cat") st.cap = Math.min(CAT_MAX, catCap() + 1);
  st.opened++;
  save(); changed();
  return p;
}
