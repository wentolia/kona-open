// Google Drive から曲を読む。
// 公開する側が何も預からない作り:
//  - OAuth クライアントIDは、使う人が自分の Google Cloud で作って入力する（Kona にIDは埋め込まない）
//  - サーバーなし。トークンはこのブラウザのタブの中（sessionStorage）だけに置き、1 時間で切れる。リフレッシュトークンは持たない
//  - 外部のスクリプトは読まない（Google のライブラリも使わず、OAuth の画面へ直接移って戻ってくる）
//  - 権限は読み取りだけ（drive.readonly）。通信先は Google の API だけ

import type { Entry } from "./library";

const CFG_KEY = "kona.drive", TOKEN_KEY = "kona.drive.token", STATE_KEY = "kona.drive.state", KEPT_KEY = "kona.drive.kept";
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const API = "https://www.googleapis.com/drive/v3";
const CACHE = "kona-drive";

export interface DriveConfig { clientId: string; folderId?: string; folderName?: string }
export const driveConfig = (): DriveConfig | undefined => { try { const c = JSON.parse(localStorage.getItem(CFG_KEY) ?? "null"); return c?.clientId ? c : undefined; } catch { return undefined; } };
export function saveDriveConfig(c: DriveConfig | undefined) { try { if (c) localStorage.setItem(CFG_KEY, JSON.stringify(c)); else localStorage.removeItem(CFG_KEY); } catch { /* 保存できなくても動く */ } }

/** OAuth の戻り先。Google Cloud の「承認済みのリダイレクト URI」に、これと同じ文字列を登録する */
export const redirectUri = () => location.origin + location.pathname;

// ---------- サインイン ----------
export class DriveAuthError extends Error { override name = "DriveAuthError"; }

export function driveToken(): string | undefined {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? "null");
    return t && t.exp > Date.now() + 30_000 ? t.token : undefined;
  } catch { return undefined; }
}
const keepToken = (token: string, sec: number) => { try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, exp: Date.now() + sec * 1000 })); } catch { /* ignore */ } };

function authUrl(clientId: string, state: string) {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri(), response_type: "token", scope: SCOPE, include_granted_scopes: "false", state, prompt: "select_account" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

// Google のサインイン画面は別のオリジンなので、小窓と元の画面は window.opener でつながらない。
// 同じオリジンどうしの BroadcastChannel で受け渡す
const CHANNEL = "kona-drive";

/**
 * 起動時に最初に呼ぶ。Google から戻ってきたところなら、トークンを受け取って URL から消す。
 * 小窓で開いたサインインなら元の画面へ渡して閉じ、true を返す（そのときは画面を組み立てない）
 */
export function takeAuthRedirect(): boolean {
  const h = new URLSearchParams(location.hash.slice(1));
  const token = h.get("access_token"), state = h.get("state"), err = h.get("error");
  if (!token && !err) return false;
  history.replaceState(null, "", location.pathname + location.search);
  let started: { state: string; popup: boolean } | null = null;
  try { started = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null"); localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
  if (!state || !started || state !== started.state) return false; // 自分が始めたサインインでなければ捨てる
  const exp = Number(h.get("expires_in") ?? 3600);
  if (started.popup) {
    try { const ch = new BroadcastChannel(CHANNEL); ch.postMessage({ token, exp, state, error: err }); ch.close(); } catch { /* ignore */ }
    window.close();
    return true;
  }
  if (token) keepToken(token, exp);
  return false;
}

/** サインイン（小窓で Google の画面を開く。開けなければ、このページごと移って戻ってくる） */
export function signIn(clientId: string): Promise<string> {
  const state = Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(36)).join("");
  const url = authUrl(clientId, state);
  const save = (popup: boolean) => { try { localStorage.setItem(STATE_KEY, JSON.stringify({ state, popup })); } catch { /* ignore */ } };
  save(true);
  const ch = new BroadcastChannel(CHANNEL);
  const w = window.open(url, "_blank", "popup,width=480,height=680");
  if (!w) { ch.close(); save(false); location.assign(url); return new Promise(() => {}); }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ch.close(); reject(new DriveAuthError("timeout")); }, 5 * 60_000);
    ch.onmessage = e => {
      if (e.data?.state !== state) return;
      clearTimeout(timer); ch.close();
      if (e.data.token) { keepToken(e.data.token, e.data.exp); resolve(e.data.token); }
      else reject(new DriveAuthError(e.data.error || "denied"));
    };
  });
}

export function signOut() { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } }

// ---------- API ----------
async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const tok = driveToken();
  if (!tok) { document.dispatchEvent(new CustomEvent("kona:drive-auth")); throw new DriveAuthError("no token"); }
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${tok}` }, referrerPolicy: "no-referrer" });
  if (res.status === 401) { signOut(); document.dispatchEvent(new CustomEvent("kona:drive-auth")); throw new DriveAuthError("expired"); }
  if (!res.ok && res.status !== 206) throw new Error(`Drive ${res.status}`);
  return res;
}

interface DFile { id: string; name: string; mimeType: string; size?: string; modifiedTime?: string }
const FOLDER = "application/vnd.google-apps.folder";

async function list(q: string): Promise<DFile[]> {
  const out: DFile[] = [];
  let page: string | undefined;
  do {
    const p = new URLSearchParams({ q, pageSize: "1000", fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime)", orderBy: "folder,name_natural", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
    if (page) p.set("pageToken", page);
    const r = await (await call(`${API}/files?${p}`)).json();
    out.push(...r.files); page = r.nextPageToken;
  } while (page);
  return out;
}
const inFolder = (id: string) => `'${id.replace(/'/g, "\\'")}' in parents and trashed = false`;

/** フォルダの中のフォルダ（選ぶ画面用） */
export async function listFolders(parent = "root"): Promise<{ id: string; name: string }[]> {
  return (await list(`${inFolder(parent)} and mimeType = '${FOLDER}'`)).map(f => ({ id: f.id, name: f.name }));
}

const AUDIO = /\.(flac|mp3|m4a|aac|alac|wav|ogg|oga|opus|aif|aiff|webm)$/i, IMAGE = /\.(jpe?g|png|webp)$/i;

/** 選んだフォルダの中を、ローカルのフォルダと同じ形（パス付きの項目）でたどる */
export async function* walkDrive(folderId: string, prefix = ""): AsyncGenerator<Entry> {
  const files = await list(inFolder(folderId));
  const subs: DFile[] = [];
  for (const f of files) {
    const path = prefix ? `${prefix}/${f.name}` : f.name;
    if (f.mimeType === FOLDER) subs.push({ ...f, name: path });
    else if (AUDIO.test(f.name) || IMAGE.test(f.name)) yield driveEntry(f, path);
  }
  for (const s of subs) yield* walkDrive(s.id, s.name);
}

// ---------- 中身を取る（端末のキャッシュ → 直近のメモリ → Drive） ----------
const recent = new Map<string, File>(); // 直近の数曲（波形と再生で二度取らない）
const cacheReq = (id: string) => new Request(`${location.origin}/__kona_drive__/${encodeURIComponent(id)}`);
const mimeOf = (name: string) => ({ flac: "audio/flac", mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", alac: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", aif: "audio/aiff", aiff: "audio/aiff", webm: "audio/webm", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[name.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";

async function fromCache(id: string): Promise<Blob | undefined> {
  try { const r = await (await caches.open(CACHE)).match(cacheReq(id)); return r ? await r.blob() : undefined; } catch { return undefined; }
}
async function toCache(id: string, blob: Blob) { try { await (await caches.open(CACHE)).put(cacheReq(id), new Response(blob)); } catch { /* 容量が足りないなどは諦める */ } }

async function download(f: DFile, persist: boolean): Promise<File> {
  const hit = recent.get(f.id);
  if (hit) return hit;
  let blob = await fromCache(f.id);
  if (!blob) {
    blob = await (await call(`${API}/files/${encodeURIComponent(f.id)}?alt=media&supportsAllDrives=true`)).blob();
    if (persist) await toCache(f.id, blob);
  }
  const file = new File([blob], f.name.split("/").pop()!, { type: mimeOf(f.name) });
  recent.set(f.id, file);
  while (recent.size > 3) recent.delete(recent.keys().next().value!);
  return file;
}

export interface DriveEntry extends Entry { id: string; size: number; modified: string; head(bytes: number): Promise<ArrayBuffer>; prefetch(): void; mime: string }

function driveEntry(f: DFile, path: string): DriveEntry {
  const image = IMAGE.test(f.name);
  return {
    path, id: f.id, size: Number(f.size ?? 0), modified: f.modifiedTime ?? "", mime: mimeOf(f.name),
    // 画像（ジャケット）は小さいので、いつも端末に残す
    getFile: () => download(f, image),
    // タグを読むのに要る先頭だけ。端末に残した曲ならそこから
    async head(bytes: number) {
      const c = recent.get(f.id) ?? await fromCache(f.id);
      if (c) return c.slice(0, bytes).arrayBuffer();
      return (await call(`${API}/files/${encodeURIComponent(f.id)}?alt=media&supportsAllDrives=true`, { headers: { Range: `bytes=0-${bytes - 1}` } })).arrayBuffer();
    },
    prefetch() { if (!recent.has(f.id)) download(f, false).catch(() => {}); },
  };
}
export const isDriveEntry = (e: Entry): e is DriveEntry => "head" in e && "id" in e;

// ---------- 端末に残す（アルバム単位） ----------
const keptSet = () => { try { return new Set<string>(JSON.parse(localStorage.getItem(KEPT_KEY) ?? "[]")); } catch { return new Set<string>(); } };
const saveKept = (s: Set<string>) => { try { localStorage.setItem(KEPT_KEY, JSON.stringify([...s])); } catch { /* ignore */ } };
export const isKept = (albumKey: string) => keptSet().has(albumKey);

export async function keepAlbum(albumKey: string, entries: DriveEntry[], onProgress?: (done: number, total: number) => void) {
  await navigator.storage?.persist?.().catch(() => false);
  let done = 0;
  for (const e of entries) {
    if (!await fromCache(e.id)) { const f = await e.getFile(); await toCache(e.id, f); }
    onProgress?.(++done, entries.length);
  }
  const s = keptSet(); s.add(albumKey); saveKept(s);
}
export async function forgetAlbum(albumKey: string, entries: DriveEntry[]) {
  try { const c = await caches.open(CACHE); await Promise.all(entries.map(e => c.delete(cacheReq(e.id)))); } catch { /* ignore */ }
  const s = keptSet(); s.delete(albumKey); saveKept(s);
}
