// ご当地の品: いる土地（日本は都道府県、ほかは国）で音楽を聴くと、その土地らしい品がひとつずつ届く。
//  - 土地を調べるのは、設定の「ご当地の品」をオンにしたときだけ。調べるのは 1 日 1 回まで（開いたときと、押して調べ直すとき）
//  - 調べ方はブラウザの位置情報。Kona はどこにも問い合わせず、端末の中の粗い地図（region-map.ts）で土地のコード（JP-27・TR など）に置き換え、
//    座標はその場で捨てる。保存も送信もしない（ブラウザや OS が位置を求めるときに、Google や Apple の位置サービスを使うことはある）
//  - 残すのは、いまの土地のコードと、その土地で聴いた秒数（土地が変わると 0 から）と、届いた品（品・土地・日付・誰の部屋で）だけ
//  - その土地で合わせて 30 分聴くと、まだ持っていない品が order の順にひとつ届く。ガチャもレア度もない
//  - リスニングパーティーでは、ホストが「土地を知らせる」を選んだときだけ（既定は知らせない。party.ts の LAND_KEY）、土地のコードだけを（暗号化された接続の中で）参加者に配る。ホストの部屋で一緒に 30 分聴くと、
//    その土地の品が「○○さんの部屋で」の札つきで届く。参加者の位置情報は使わない
//  品の側は ItemDef.region に土地のコードを書くだけ（items/*.ts）。届くまでは設定の「置くもの」に出ない
import { ALL_ITEMS, type ItemDef } from "./items";
import { NAMES } from "./region-names";
import { lang } from "./i18n";

const KEY = "kona.regional";
export const GIFT_SEC = 30 * 60;

export type Got = { at: string; d: string; from?: string };
type State = { on: boolean; here?: string; day?: string; sec: number; visit?: { at: string; from: string; sec: number }; got: Record<string, Got> };

export const isLand = (x: unknown): x is string => typeof x === "string" && /^[A-Z]{2}(-\d{2})?$/.test(x) && x in NAMES;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function load(): State {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}"), got: Record<string, Got> = {};
    if (v.got && typeof v.got === "object") for (const [k, g] of Object.entries(v.got as Record<string, Got>))
      if (g && isLand(g.at) && typeof g.d === "string") got[k] = { at: g.at, d: g.d.slice(0, 10), ...(typeof g.from === "string" ? { from: g.from.slice(0, 40) } : {}) };
    const vis = v.visit && isLand(v.visit.at) && typeof v.visit.from === "string" ? { at: v.visit.at, from: v.visit.from, sec: Number(v.visit.sec) || 0 } : undefined;
    return { on: !!v.on, ...(isLand(v.here) ? { here: v.here } : {}), ...(typeof v.day === "string" ? { day: v.day } : {}), sec: Number(v.sec) || 0, ...(vis ? { visit: vis } : {}), got };
  } catch { return { on: false, sec: 0, got: {} }; }
}
let st = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* 保存できなくても動く */ } };
const changed = (detail?: { key: string }) => document.dispatchEvent(new CustomEvent("kona:regional", { detail }));

/** 土地の名前（いまの言語で） */
// 都道府県の韓国語・中国語の名前（JP-01〜47 の順）。国の名前はブラウザ（Intl.DisplayNames）に任せる
const PREF_KO = ["홋카이도", "아오모리현", "이와테현", "미야기현", "아키타현", "야마가타현", "후쿠시마현", "이바라키현", "도치기현", "군마현", "사이타마현", "지바현", "도쿄도", "가나가와현", "니가타현", "도야마현", "이시카와현", "후쿠이현", "야마나시현", "나가노현", "기후현", "시즈오카현", "아이치현", "미에현", "시가현", "교토부", "오사카부", "효고현", "나라현", "와카야마현", "돗토리현", "시마네현", "오카야마현", "히로시마현", "야마구치현", "도쿠시마현", "가가와현", "에히메현", "고치현", "후쿠오카현", "사가현", "나가사키현", "구마모토현", "오이타현", "미야자키현", "가고시마현", "오키나와현"];
const PREF_ZH = ["北海道", "青森县", "岩手县", "宫城县", "秋田县", "山形县", "福岛县", "茨城县", "栃木县", "群马县", "埼玉县", "千叶县", "东京都", "神奈川县", "新潟县", "富山县", "石川县", "福井县", "山梨县", "长野县", "岐阜县", "静冈县", "爱知县", "三重县", "滋贺县", "京都府", "大阪府", "兵库县", "奈良县", "和歌山县", "鸟取县", "岛根县", "冈山县", "广岛县", "山口县", "德岛县", "香川县", "爱媛县", "高知县", "福冈县", "佐贺县", "长崎县", "熊本县", "大分县", "宫崎县", "鹿儿岛县", "冲绳县"];
const regionNames: Partial<Record<string, Intl.DisplayNames>> = {};
export function landName(code: string): string {
  const l = lang(), n = NAMES[code];
  if (l === "ja" || l === "en") return n?.[l === "en" ? 1 : 0] ?? code;
  const pref = /^JP-(\d\d)$/.exec(code);
  if (pref) return (l === "ko" ? PREF_KO : PREF_ZH)[Number(pref[1]) - 1] ?? n?.[1] ?? code;
  try { return (regionNames[l] ??= new Intl.DisplayNames([l === "zh" ? "zh-Hans" : l], { type: "region" })).of(code) ?? n?.[1] ?? code; }
  catch { return n?.[1] ?? code; }
}
/** 土地のものの一覧（試作を除く） */
export const regionalItems = (): readonly ItemDef[] => ALL_ITEMS.filter(d => d.region && !d.draft);
export const regionalOn = () => st.on;
/** いまの土地（オンで、調べられたときだけ） */
export const hereLand = () => st.on ? st.here : undefined;
export const checkedDay = () => st.day;
export const hereProgress = () => Math.min(1, st.sec / GIFT_SEC);
export const gotOf = (key: string): Got | undefined => st.got[key];
export const gotList = () => Object.entries(st.got).map(([key, g]) => ({ key, ...g })).sort((a, b) => b.d.localeCompare(a.d));
/** 置けるか: 土地のものは届いてから */
export const regionAllows = (key: string) => { const d = ALL_ITEMS.find(x => x.key === key); return !d?.region || !!st.got[key]; };
/** その土地で、まだ届いていない品 */
export const nextOf = (code: string) => regionalItems().find(d => d.region === code && !st.got[d.key]);

let status: "" | "asking" | "denied" | "unknown" | "unsupported" = "";
export const locateStatus = () => status;

export function setRegionalOn(on: boolean) {
  st = { ...st, on };
  if (!on) { delete st.here; delete st.day; st.sec = 0; status = ""; }
  save(); changed();
  if (on) locate(true);
}

/** いる土地を調べる（オンのときだけ。force でなければ 1 日 1 回まで）。座標はコードに置き換えたら捨てる */
export function locate(force = false) {
  if (!st.on || status === "asking" || (!force && st.day === today())) return;
  if (!("geolocation" in navigator)) { status = "unsupported"; changed(); return; }
  status = "asking"; changed();
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    const code = await landAt(latitude, longitude);
    status = code ? "" : "unknown";
    if (code && code !== st.here) { st.here = code; st.sec = 0; }
    st.day = today(); save(); changed();
  }, err => { status = err.code === err.PERMISSION_DENIED ? "denied" : "unknown"; changed(); },
  { enableHighAccuracy: false, maximumAge: 6 * 3600_000, timeout: 30_000 });
}

/** 緯度・経度 → 土地のコード（端末の中の地図で。どこにも問い合わせない） */
export async function landAt(lat: number, lon: number): Promise<string | undefined> {
  const { SHAPES } = await import("./region-map");
  const x = lon * 100, y = lat * 100;
  let near: string | undefined, best = Infinity;
  for (const [code, rings] of SHAPES) {
    const lim = code.startsWith("JP-") ? 40 : 150;   // 地図が粗くて外れた海辺・小さな島は、近い土地に寄せる（0.01 度の単位）
    for (const r of decoded(code, rings)) {
      if (inside(r, x, y)) return code;
      for (let i = 0; i < r.length; i += 2) { const d = Math.hypot(r[i] - x, r[i + 1] - y); if (d < lim && d < best) { best = d; near = code; } }
    }
  }
  return near;
}
const cache = new Map<string, number[][]>();
function decoded(code: string, rings: string[]) {
  let v = cache.get(code);
  if (!v) {
    v = rings.map(s => { const a = s.split(",").map(Number); for (let i = 2; i < a.length; i++) a[i] += a[i - 2]; return a; });
    cache.set(code, v);
  }
  return v;
}
function inside(r: number[], x: number, y: number) {
  let c = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function give(code: string, from?: string) {
  const d = nextOf(code);
  if (!d) return;
  st.got[d.key] = { at: code, d: today(), ...(from ? { from } : {}) };
  save(); changed({ key: d.key });
}

let ticks = 0;
/** 1 秒ごとに呼ぶ。playing: 自分が鳴らしている。visit: パーティーでホストの部屋にいて、ホストが鳴らしている（ホストの土地・名前） */
export function regionalTick(playing: boolean, visit?: { land: string; host: string }) {
  let dirty = false;
  if (st.on && st.here && playing && nextOf(st.here)) {
    st.sec += 1; dirty = true;
    if (st.sec >= GIFT_SEC) { st.sec = 0; give(st.here); }
  }
  if (visit && isLand(visit.land) && nextOf(visit.land)) {
    const from = visit.host.slice(0, 40);
    if (!st.visit || st.visit.at !== visit.land || st.visit.from !== from) st.visit = { at: visit.land, from, sec: 0 };
    st.visit.sec += 1; dirty = true;
    if (st.visit.sec >= GIFT_SEC) { delete st.visit; give(visit.land, from); }
  }
  // 書き込みは 15 秒に 1 回でよい（閉じても 15 秒ぶん失うだけ）
  if (dirty && ++ticks % 15 === 0) save();
}
