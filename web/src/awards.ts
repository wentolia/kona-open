// 到達の記録: 聴いた距離が目じるし（東京タワー・富士山・フルマラソンなど）に届いた日を覚えておく。
import { t, tp } from "./i18n";
// 棚の上の小物の「賞状」が、届いた数を見せる。記録は端末の中（kona.awards）だけ

import { MARKS, metersOf } from "./mod-distance";
import { listenedSeconds } from "./store";

export interface Award { m: number; label: string; t: number; album?: string; artist?: string }
const KEY = "kona.awards";

let list: Award[] | undefined;
function load(): Award[] {
  if (list) return list;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(v)) list = v.filter(a => a && typeof a.m === "number" && typeof a.label === "string" && typeof a.t === "number");
  } catch { /* 読めなければ作り直す */ }
  if (!list) {
    // はじめて: もう通り過ぎた目じるしは、日付の分からない証書として静かに並べる（一度にたくさん知らせない）
    const m = metersOf(listenedSeconds());
    list = MARKS.filter(([v]) => v <= m).map(([v, label]) => ({ m: v, label, t: 0 }));
    save();
  }
  return list;
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list ?? [])); } catch { /* 保存できなくても動く */ } };

export const awards = (): readonly Award[] => load();

/** 聴いた時間が増えたら呼ぶ。新しく届いた目じるしがあれば証書を作って知らせる */
export function checkAwards(now?: { title: string; artist?: string }) {
  const got = load(), m = metersOf(listenedSeconds());
  const fresh = MARKS.filter(([v, label]) => v <= m && !got.some(a => a.m === v && a.label === label));
  if (!fresh.length) return;
  for (const [v, label] of fresh) got.push({ m: v, label, t: Date.now(), ...(now ? { album: now.title, ...(now.artist ? { artist: now.artist } : {}) } : {}) });
  save();
  const last = fresh[fresh.length - 1];
  document.dispatchEvent(new CustomEvent("kona:award", { detail: tp("聴いた距離が「{0}」に届きました", t(last[1])) }));
}
