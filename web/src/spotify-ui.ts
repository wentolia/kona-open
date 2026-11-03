// Spotify の入口: 設定の「読み込み元」で Client ID を入れてサインイン → 保存したアルバムを棚に並べる。
// 画面の文字はすべて textContent か esc() で入れ、Spotify の曲名などを HTML として読ませない
import type { Album } from "./library";
import type { Player } from "./player";
import { coverInfo, eachLimited } from "./library";
import { docHref } from "./doc-link";
import { spotifyConfig, saveSpotifyConfig, spotifyRedirectUri, spotifySignedIn, spotifySignIn, spotifySignOut, spotifyCameBack, savedAlbums, isSpotifyAlbum, CLIENT_ID_RE, SpotifyAuthError } from "./spotify";
import { spotifyRemote } from "./spotify-play";
import { esc } from "./dom";

const LAST_KEY = "kona.spotify.last"; // 前に開いていたのが Spotify なら、開き直したときもそのまま

type Progress = (n: number, total: number) => void;
interface Host {
  player: Player;
  /** 読み込み（進み具合を出しながら） */
  load(name: string, fetch: (p: Progress) => Promise<Album[]>): Promise<void>;
  toast(text: string, action?: string, run?: () => void): void;
}
let host: Host | undefined;

const MESSAGES: Record<string, string> = {
  account_error: "Spotify の曲を鳴らすには Premium のアカウントが要ります",
  initialization_error: "このブラウザでは Spotify の曲を鳴らせません（パソコンの Chrome・Edge・Firefox などで開いてください）",
  sdk: "Spotify の再生の部品を読み込めませんでした。通信の具合を確かめてください",
  play: "Spotify で再生を始められませんでした。少し待ってからもう一度どうぞ",
  playback_error: "Spotify の曲を再生できませんでした",
};

/** main から一度だけ呼ぶ */
export function initSpotifyUI(h: Host) {
  host = h;
  h.player.remoteFor = a => isSpotifyAlbum(a) ? spotifyRemote : undefined;
  let last = 0;
  const authLost = () => {
    if (Date.now() - last < 8000) return;
    last = Date.now();
    const c = spotifyConfig();
    if (c) host?.toast("Spotify のサインインが切れました", "サインインし直す", () => { spotifySignIn(c.clientId).catch(() => {}); });
  };
  document.addEventListener("kona:spotify-auth", authLost);
  document.addEventListener("kona:spotify-error", e => {
    const kind = (e as CustomEvent<string>).detail;
    if (kind === "authentication_error" || kind === "auth") return authLost();
    if (Date.now() - last < 4000) return;
    last = Date.now();
    host?.toast(MESSAGES[kind] ?? MESSAGES.playback_error);
  });
}

/** Client ID を入れてあるか（開始画面・開くメニューに出すか） */
export const spotifyConfigured = () => !!spotifyConfig();
/** 前に開いていたのが Spotify で、サインインが残っているか */
export const spotifyWasOpen = () => { try { return localStorage.getItem(LAST_KEY) === "1" && spotifySignedIn() && spotifyConfigured(); } catch { return false; } };
/** ほかの読み込み元を開いたら、次の起動で Spotify を開かない */
export function forgetSpotifyOpen() { try { localStorage.removeItem(LAST_KEY); } catch { /* ignore */ } }

/** 保存したアルバムを開く。Client ID がなければ設定へ、サインインが切れていればサインインから */
export async function openSpotify() {
  const c = spotifyConfig();
  if (!c) { location.hash = "#settings"; requestAnimationFrame(() => document.getElementById("set-advanced")?.scrollIntoView({ block: "start" })); return; }
  if (!spotifySignedIn()) {
    try { await spotifySignIn(c.clientId); }
    catch { host?.toast("Spotify にサインインできませんでした。Client ID と Redirect URI を確かめてください"); return; }
  }
  await host?.load("Spotify", async p => {
    const list = await savedAlbums(p);
    // 背表紙の色（ジャケットの平均色）。ジャケットそのものは加工せず、端末にも残さない
    await eachLimited(list, 6, async a => { if (a.cover) Object.assign(a, await coverInfo(a.cover).catch(() => ({}))); a.ratio = 1; });
    return list;
  });
  try { localStorage.setItem(LAST_KEY, "1"); } catch { /* ignore */ }
}

/** 起動の最後に呼ぶ。サインインでページごと移って戻ってきたなら続きを。続けたら true */
export async function resumeSpotify(): Promise<boolean> {
  const back = spotifyCameBack();
  if (back === "error") { host?.toast("Spotify にサインインできませんでした。Client ID と Redirect URI を確かめてください"); return false; }
  if (back === "ok" || spotifyWasOpen()) { await openSpotify(); return true; }
  return false;
}

export const isSpotifyError = (e: unknown) => e instanceof SpotifyAuthError;

// ---------- 設定の「読み込み元」 ----------
export function spotifySettingsHTML(t: (s: string) => string): string {
  const c = spotifyConfig(), signed = spotifySignedIn();
  return `
    <p class="set-note">${t("自分の Spotify for Developers で作った Client ID を入れると、保存したアルバムを棚に並べて聴けます（Premium が必要）。")}<a href="${docHref("spotify")}" target="_blank" rel="noopener noreferrer">${t("作り方の手順")}</a></p>
    <dl class="dlg-uris set-uris">
      <dt>Redirect URI</dt><dd><code>${esc(spotifyRedirectUri())}</code><button type="button" class="set-btn" id="set-sp-copy">${t("コピー")}</button></dd>
    </dl>
    <form class="set-row set-save" id="set-sp-form"><span>Client ID</span>
      <input id="set-sp-client" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="32" placeholder="0123456789abcdef0123456789abcdef" value="${esc(c?.clientId ?? "")}">
      <button class="set-btn">${c ? t("保存") : t("保存してサインイン")}</button></form>
    <p class="set-note set-warn" id="set-sp-err" hidden></p>
    ${c ? `<div class="set-source"><b>${signed ? t("サインイン中") : t("サインインしていません")}</b><span>Spotify</span></div>
    <div class="set-row set-btns">
      <button type="button" class="set-btn" id="set-sp-open">${signed ? t("保存したアルバムを開く") : t("サインインして開く")}</button>
      ${signed ? `<button type="button" class="set-btn" id="set-sp-out">${t("サインアウト")}</button>` : ""}
      <button type="button" class="set-btn danger" id="set-sp-forget">${t("Client ID を消す")}</button>
    </div>` : ""}
    <p class="set-note">${t("Spotify の曲は DRM で守られているため、イコライザー・波形・音量の正規化・クロスフェード・環境音は効きません。曲名やジャケットは端末に残さず、開くたびに Spotify から読みます。写真ではジャケットをいつも隠します。")}</p>`;
}

export function wireSpotifySettings(root: HTMLElement, again: () => void) {
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s);
  q<HTMLButtonElement>("#set-sp-copy")?.addEventListener("click", e => {
    const b = e.currentTarget as HTMLButtonElement;
    navigator.clipboard?.writeText(spotifyRedirectUri()).then(() => { const was = b.textContent; b.textContent = "✓"; setTimeout(() => b.textContent = was, 1500); }).catch(() => {});
  });
  q<HTMLFormElement>("#set-sp-form")?.addEventListener("submit", e => {
    e.preventDefault();
    const input = q<HTMLInputElement>("#set-sp-client")!, err = q<HTMLElement>("#set-sp-err")!, id = input.value.trim();
    if (!CLIENT_ID_RE.test(id)) { err.hidden = false; err.textContent = "Client ID は 32 文字の英数字です（Spotify for Developers のアプリの「Basic Information」にあります）"; input.focus(); return; }
    const was = spotifyConfig()?.clientId;
    if (was !== id) { spotifySignOut(); saveSpotifyConfig({ clientId: id }); }
    again();
    if (was !== id || !spotifySignedIn()) openSpotify();
  });
  q("#set-sp-open")?.addEventListener("click", () => { openSpotify(); });
  q("#set-sp-out")?.addEventListener("click", () => { spotifySignOut(); forgetSpotifyOpen(); again(); });
  q("#set-sp-forget")?.addEventListener("click", () => { spotifySignOut(); saveSpotifyConfig(undefined); forgetSpotifyOpen(); again(); });
}
