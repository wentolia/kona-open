// Spotify: サインインと、保存したアルバムの読み込み。
// 公開する側が何も預からない作り（Google Drive と同じ考え方）:
//  - Client ID は、使う人が自分の Spotify for Developers で作って入力する（Kona にIDは埋め込まない）
//  - サインインは PKCE（クライアントシークレットなし）。サーバーなし。通信先は Spotify だけ
//  - トークンはこのブラウザの中（localStorage）だけに置く。サインアウトで消える
//  - Spotify の中身（曲名・ジャケットなど）は端末に覚えない。開くたびに Spotify から読む（開発者規約に合わせる）

import type { Album, Track, Entry } from "./library";

const CFG_KEY = "kona.spotify", TOKEN_KEY = "kona.spotify.token", PKCE_KEY = "kona.spotify.pkce";
const SCOPES = ["streaming", "user-read-email", "user-read-private", "user-library-read", "user-read-playback-state", "user-modify-playback-state"];
const ACCOUNTS = "https://accounts.spotify.com";
export const API = "https://api.spotify.com/v1";
const CHANNEL = "kona-spotify";

export interface SpotifyConfig { clientId: string }
export const spotifyConfig = (): SpotifyConfig | undefined => { try { const c = JSON.parse(localStorage.getItem(CFG_KEY) ?? "null"); return c?.clientId ? c : undefined; } catch { return undefined; } };
export function saveSpotifyConfig(c: SpotifyConfig | undefined) {
  try { if (c) localStorage.setItem(CFG_KEY, JSON.stringify(c)); else { localStorage.removeItem(CFG_KEY); localStorage.removeItem(TOKEN_KEY); } } catch { /* 保存できなくても動く */ }
}
/** Spotify for Developers の「Redirect URIs」に、これと同じ文字列を登録する */
export const spotifyRedirectUri = () => location.origin + location.pathname;
export const CLIENT_ID_RE = /^[0-9a-f]{32}$/i;

// ---------- トークン ----------
export class SpotifyAuthError extends Error { override name = "SpotifyAuthError"; }
interface Tok { access: string; refresh?: string; exp: number }
const readTok = (): Tok | undefined => { try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null") ?? undefined; } catch { return undefined; } };
const keepTok = (t: Tok) => { try { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch { /* ignore */ } };
export const spotifySignedIn = () => !!readTok()?.refresh || (readTok()?.exp ?? 0) > Date.now();
export function spotifySignOut() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } document.dispatchEvent(new CustomEvent("kona:spotify-out")); }

async function tokenRequest(body: Record<string, string>): Promise<Tok> {
  const res = await fetch(`${ACCOUNTS}/api/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body), referrerPolicy: "no-referrer" });
  if (!res.ok) throw new SpotifyAuthError(`token ${res.status}`);
  const j = await res.json();
  return { access: j.access_token, refresh: j.refresh_token ?? body.refresh_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
}

let refreshing: Promise<string> | undefined;
/** 使えるアクセストークン。切れかけていればリフレッシュする。サインインしていなければ SpotifyAuthError */
export async function spotifyToken(): Promise<string> {
  const t = readTok(), c = spotifyConfig();
  if (t && t.exp > Date.now() + 60_000) return t.access;
  if (!t?.refresh || !c) throw new SpotifyAuthError("no token");
  return refreshing ??= tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh, client_id: c.clientId })
    .then(n => { keepTok(n); return n.access; })
    .catch(e => { spotifySignOut(); throw e instanceof SpotifyAuthError ? e : new SpotifyAuthError("refresh"); })
    .finally(() => { refreshing = undefined; });
}

// ---------- サインイン（PKCE） ----------
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const randomString = (n: number) => b64url(crypto.getRandomValues(new Uint8Array(n)));

/**
 * 起動時に最初に呼ぶ。Spotify から戻ってきたところなら、コードをトークンに替えて URL から消す。
 * 小窓で開いたサインインなら元の画面へ知らせて閉じ、true を返す（そのときは画面を組み立てない）
 */
export async function takeSpotifyRedirect(): Promise<boolean> {
  const q = new URLSearchParams(location.search);
  const code = q.get("code"), state = q.get("state"), err = q.get("error");
  if ((!code && !err) || !state) return false;
  let started: { state: string; verifier: string; popup: boolean; clientId: string } | null = null;
  try { started = JSON.parse(localStorage.getItem(PKCE_KEY) ?? "null"); } catch { /* ignore */ }
  if (!started || started.state !== state) return false; // 自分が始めたサインインでなければ触らない
  try { localStorage.removeItem(PKCE_KEY); } catch { /* ignore */ }
  history.replaceState(null, "", location.pathname + location.hash);
  let error = err ?? "";
  if (code) {
    try { keepTok(await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: spotifyRedirectUri(), client_id: started.clientId, code_verifier: started.verifier })); }
    catch { error = "token"; }
  }
  if (started.popup) {
    try { const ch = new BroadcastChannel(CHANNEL); ch.postMessage({ state, error }); ch.close(); } catch { /* ignore */ }
    window.close();
    return true;
  }
  try { sessionStorage.setItem("kona.spotify.back", error ? "error" : "ok"); } catch { /* ignore */ }
  return false;
}

/** ページごと移ってサインインして戻ってきたところなら、その結果（一度だけ） */
export function spotifyCameBack(): "ok" | "error" | undefined {
  try { const r = sessionStorage.getItem("kona.spotify.back"); sessionStorage.removeItem("kona.spotify.back"); return (r as "ok" | "error") || undefined; } catch { return undefined; }
}

/** サインイン（小窓で Spotify の画面を開く。開けなければ、このページごと移って戻ってくる） */
export async function spotifySignIn(clientId: string): Promise<void> {
  const state = randomString(12), verifier = randomString(48);
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const url = `${ACCOUNTS}/authorize?${new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: spotifyRedirectUri(), scope: SCOPES.join(" "), state, code_challenge_method: "S256", code_challenge: challenge })}`;
  const save = (popup: boolean) => { try { localStorage.setItem(PKCE_KEY, JSON.stringify({ state, verifier, popup, clientId })); } catch { /* ignore */ } };
  save(true);
  const ch = new BroadcastChannel(CHANNEL);
  const w = window.open(url, "_blank", "popup,width=480,height=720");
  if (!w) { ch.close(); save(false); location.assign(url); return new Promise(() => {}); }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ch.close(); reject(new SpotifyAuthError("timeout")); }, 5 * 60_000);
    ch.onmessage = e => {
      if (e.data?.state !== state) return;
      clearTimeout(timer); ch.close();
      if (!e.data.error) resolve(); else reject(new SpotifyAuthError(e.data.error));
    };
  });
}

// ---------- API ----------
export async function spotifyApi(path: string, init: RequestInit = {}, retry = 2): Promise<Response> {
  const tok = await spotifyToken().catch(e => { document.dispatchEvent(new CustomEvent("kona:spotify-auth")); throw e; });
  const res = await fetch(path.startsWith("https://") ? path : API + path, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${tok}` }, referrerPolicy: "no-referrer" });
  if (res.status === 401) {
    // アクセストークンだけ切れたなら、リフレッシュしてもう一度
    try { const t = readTok(); if (t) keepTok({ ...t, exp: 0 }); } catch { /* ignore */ }
    if (retry > 0) return spotifyApi(path, init, retry - 1);
    document.dispatchEvent(new CustomEvent("kona:spotify-auth"));
    throw new SpotifyAuthError("expired");
  }
  if (res.status === 429 && retry > 0) {
    await new Promise(r => setTimeout(r, Math.min(10, Number(res.headers.get("Retry-After")) || 2) * 1000));
    return spotifyApi(path, init, retry - 1);
  }
  if (!res.ok) throw new Error(`Spotify ${res.status}`);
  return res;
}

// ---------- 保存したアルバム → Kona のアルバム ----------
export interface SpotifyEntry extends Entry { uri: string }
export const isSpotifyEntry = (e: Entry): e is SpotifyEntry => "uri" in e;
export const isSpotifyAlbum = (a?: Album) => a?.remote === "spotify";

interface SImage { url: string; width?: number | null; height?: number | null }
interface STrack { id: string; uri: string; name: string; track_number: number; disc_number: number; duration_ms: number; is_playable?: boolean }
interface SAlbum { id: string; uri: string; name: string; album_type?: string; release_date?: string; images?: SImage[]; artists?: { name: string }[]; external_urls?: { spotify?: string }; tracks?: { items: STrack[]; next: string | null } }

// ジャケットは Spotify の画像サーバーのものだけを使う（文字列を HTML に入れるので、形も確かめる）
const ART_RE = /^https:\/\/i\.scdn\.co\/image\/[\w-]+$/;
const OPEN_RE = /^https:\/\/open\.spotify\.com\/[\w/-]+$/;
const noFile = () => Promise.reject(new Error("Spotify の曲はファイルとして読めません"));

function toAlbum(s: SAlbum, items: STrack[]): Album {
  const img = (s.images ?? []).filter(i => ART_RE.test(i.url)).sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  // 大きすぎない 1 枚（640px ほど）
  const pick = img.find(i => (i.width ?? 640) <= 640) ?? img[0];
  const artist = (s.artists ?? []).map(a => a.name).join(", ");
  const tracks: Track[] = items.filter(t => t && t.uri).map(t => ({
    entry: { path: `spotify/${s.id}/${t.id}`, uri: t.uri, getFile: noFile } as SpotifyEntry,
    title: t.name, no: t.track_number, disc: t.disc_number || 1, duration: t.duration_ms / 1000, format: "Spotify",
  }));
  tracks.sort((x, y) => x.disc - y.disc || x.no - y.no);
  const year = Number(s.release_date?.slice(0, 4));
  return {
    key: s.uri, shelf: "Spotify", dir: s.name, title: s.name, artist,
    year: Number.isFinite(year) && year > 0 ? year : undefined,
    tracks, cover: pick?.url, ratio: 1, tagged: true,
    remote: "spotify", link: OPEN_RE.test(s.external_urls?.spotify ?? "") ? s.external_urls!.spotify : `https://open.spotify.com/album/${encodeURIComponent(s.id)}`,
  };
}

/** 保存したアルバム（「ライブラリ」のアルバム）をすべて読む */
export async function savedAlbums(onProgress?: (n: number, total: number) => void): Promise<Album[]> {
  const out: Album[] = [];
  let next: string | null = "/me/albums?limit=50";
  while (next) {
    const page: { items: { album: SAlbum }[]; next: string | null; total: number } = await (await spotifyApi(next)).json();
    for (const { album } of page.items) {
      const items = [...(album.tracks?.items ?? [])];
      let more = album.tracks?.next ?? null;
      while (more) { const p: { items: STrack[]; next: string | null } = await (await spotifyApi(more)).json(); items.push(...p.items); more = p.next; }
      out.push(toAlbum(album, items));
    }
    onProgress?.(out.length, page.total);
    next = page.next;
  }
  return out;
}
