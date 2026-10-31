// タグとジャケットの読み取り結果を IndexedDB に覚えておく。次に開いたときは、変わっていないファイルを読み直さない
// 変わったかどうかは、ファイルのパス・大きさ・更新日時で見る

const DB = "kona-tags", STORE = "albums", PEAKS = "peaks";

export interface HeadCache {
  sig: string;
  title: string; artist: string; year?: number; genre?: string;
  color?: string; ratio?: number;
  pic?: Blob;          // 埋め込みジャケット（フォルダの画像を使うときは持たない）
}
export interface TrackCache {
  path: string; title: string; no: number; disc: number;
  duration?: number; format?: string; rgTrack?: number; rgAlbum?: number;
}
export interface TracksCache { sig: string; list: TrackCache[]; year?: number; genre?: string }
interface Rec { head?: HeadCache; tracks?: TracksCache }

let db: Promise<IDBDatabase> | undefined;
function open(): Promise<IDBDatabase> {
  return db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      for (const name of [STORE, PEAKS]) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const mem = new Map<string, Rec>();
const dirty = new Set<string>();
let flushTimer = 0;

/** 覚えている分をまとめて読み込む（フォルダを読むたびに 1 回） */
export async function loadTagCache(): Promise<void> {
  try {
    const d = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction(STORE), st = tx.objectStore(STORE);
      const req = st.openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve();
        mem.set(String(c.key), c.value as Rec);
        c.continue();
      };
      req.onerror = () => reject(req.error);
    });
  } catch { /* 使えなければ毎回読むだけ */ }
}

export function getHead(key: string, sig: string): HeadCache | undefined {
  const h = mem.get(key)?.head;
  return h?.sig === sig ? h : undefined;
}
export function getTracks(key: string, sig: string): TracksCache | undefined {
  const t = mem.get(key)?.tracks;
  return t?.sig === sig ? t : undefined;
}
export function putHead(key: string, head: HeadCache) { update(key, { head }); }
export function putTracks(key: string, tracks: TracksCache) { update(key, { tracks }); }

function update(key: string, part: Rec) {
  mem.set(key, { ...mem.get(key), ...part });
  dirty.add(key);
  clearTimeout(flushTimer);
  flushTimer = window.setTimeout(flushTagCache, 800);
}

/** 今のライブラリにないアルバムの分は捨てる */
export function pruneTagCache(keep: Set<string>) {
  for (const k of mem.keys()) if (!keep.has(k)) { mem.delete(k); dirty.add(k); }
  if (dirty.size) { clearTimeout(flushTimer); flushTimer = window.setTimeout(flushTagCache, 800); }
}

export async function flushTagCache(): Promise<void> {
  if (!dirty.size) return;
  const keys = [...dirty]; dirty.clear();
  try {
    const d = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction(STORE, "readwrite"), st = tx.objectStore(STORE);
      for (const k of keys) { const r = mem.get(k); if (r) st.put(r, k); else st.delete(k); }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* 保存できなくても動作は続ける */ }
}

/** ファイルの目印: パス・大きさ・更新日時 */
export function fileSig(path: string, f: File): string { return `${path}|${f.size}|${f.lastModified}`; }

// ---------- 波形の形（曲ごと、0〜255 の 1 バイトずつ）。一度描いた曲は、次からデコードせずに出す ----------
export async function getPeaks(sig: string): Promise<Uint8Array | undefined> {
  try {
    const d = await open();
    return await new Promise((resolve, reject) => {
      const req = d.transaction(PEAKS).objectStore(PEAKS).get(sig);
      req.onsuccess = () => resolve(req.result instanceof Uint8Array ? req.result : undefined);
      req.onerror = () => reject(req.error);
    });
  } catch { return undefined; }
}
export async function putPeaks(sig: string, peaks: Uint8Array): Promise<void> {
  try {
    const d = await open();
    d.transaction(PEAKS, "readwrite").objectStore(PEAKS).put(peaks, sig);
  } catch { /* 保存できなくても描ける */ }
}
