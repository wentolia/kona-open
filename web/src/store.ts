// 永続化: フォルダのハンドル（IndexedDB）と再生履歴（localStorage）

const DB = "kona", STORE = "kv";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch { return undefined; }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* 保存できなくても動作は続ける */ }
}

export interface PlayStat { plays: number; last: number }
type History = Record<string, PlayStat>;

const HISTORY_KEY = "kona.history";
let history: History = {};
try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "{}"); } catch { history = {}; }

export function stat(albumKey: string): PlayStat {
  return history[albumKey] ?? { plays: 0, last: 0 };
}

export function recordPlay(albumKey: string): void {
  const s = stat(albumKey);
  history[albumKey] = { plays: s.plays + 1, last: Date.now() };
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* ignore */ }
}

// 再生の記録（聴いた記録・地図のモジュールで使う）。新しいものほど後ろ
export interface PlayEvent { k: string; t: number }
const LOG_KEY = "kona.log";
let log: PlayEvent[] = [];
try { log = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]"); if (!Array.isArray(log)) log = []; } catch { log = []; }
// 以前は再生の記録に聴いた場所（緯度・経度）を付けていた。いまは場所を持たないので、残っていれば消す
{
  let had = false;
  log = log.map(e => { if (e && typeof e === "object" && ("lat" in e || "lon" in e)) { had = true; return { k: e.k, t: e.t }; } return e; });
  try { if (had) localStorage.setItem(LOG_KEY, JSON.stringify(log)); localStorage.removeItem("kona.mapRecord"); } catch { /* ignore */ }
}
const saveLog = () => { try { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-4000))); } catch { /* ignore */ } };

export function playLog(): readonly PlayEvent[] { return log; }

/** 再生を記録する。場所は後から付ける（位置の取得は時間がかかるため） */
export function logPlay(albumKey: string): PlayEvent {
  const e: PlayEvent = { k: albumKey, t: Date.now() };
  log.push(e); saveLog();
  return e;
}

// 聴いた時間の合計（秒）。聴いた距離のモジュールで使う
const LISTEN_KEY = "kona.listened";
let listened = Number(localStorage.getItem(LISTEN_KEY) ?? 0) || 0;
export const listenedSeconds = () => listened;
export function addListened(sec: number) {
  listened += sec;
  try { localStorage.setItem(LISTEN_KEY, String(Math.round(listened))); } catch { /* ignore */ }
}
