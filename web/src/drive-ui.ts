// Google Drive の入口: クライアントIDの入力 → サインイン → フォルダを選ぶ。
// 画面の文字はすべて textContent か esc() で入れ、Drive のファイル名をHTMLとして読ませない
import { t, tp } from "./i18n";
import type { Entry } from "./library";
import { driveConfig, saveDriveConfig, redirectUri, driveToken, signIn, signOut, listFolders, walkDrive, DriveAuthError } from "./drive";
import { esc } from "./dom";
import { docHref } from "./doc-link";

const RESUME_KEY = "kona.drive.resume"; // 小窓が開けずにページごと移ったとき、戻ってから続きをする
const CLIENT_RE = /^[\w-]+\.apps\.googleusercontent\.com$/;


interface Host {
  load(name: string, entries: AsyncIterable<Entry>): Promise<void>;
  toast(text: string, action?: string, run?: () => void): void;
}
let host: Host | undefined;

/** main から一度だけ呼ぶ */
export function initDriveUI(h: Host) {
  host = h;
  let last = 0;
  document.addEventListener("kona:drive-auth", () => {
    if (Date.now() - last < 8000) return;
    last = Date.now();
    const c = driveConfig();
    if (c) host?.toast("Google Drive のサインインが切れました", t("サインインし直す"), () => { signIn(c.clientId).catch(() => {}); });
  });
}

/** 前に選んだ Drive のフォルダ（開始画面の「◯◯を開く」用） */
export function driveSaved(): { name: string } | undefined {
  const c = driveConfig();
  return c?.folderId ? { name: c.folderName ?? "Google Drive" } : undefined;
}
/** このタブでサインイン済みか（開き直しでそのまま読めるか） */
export const driveReady = () => !!driveSaved() && !!driveToken();

/** 前に選んだフォルダを開く。サインインが切れていればサインインから */
export async function openDriveSaved() {
  const c = driveConfig();
  if (!c?.folderId) return openDrive();
  if (!driveToken()) {
    try { await withResume("open", () => signIn(c.clientId)); } catch (e) { return failed(e); }
  }
  await host?.load(c.folderName ?? "Google Drive", walkDrive(c.folderId));
}

/** 起動の最後に呼ぶ。サインインでページごと移って戻ってきたなら、続きをする。続けたら true */
export async function resumeDrive(): Promise<boolean> {
  let r: string | null = null;
  try { r = sessionStorage.getItem(RESUME_KEY); sessionStorage.removeItem(RESUME_KEY); } catch { /* ignore */ }
  if (!r || !driveToken()) return false;
  if (r === "open" && driveSaved()) await openDriveSaved(); else openDrive();
  return true;
}

async function withResume<T>(what: "open" | "browse", f: () => Promise<T>) {
  try { sessionStorage.setItem(RESUME_KEY, what); } catch { /* ignore */ }
  try { return await f(); } finally { try { sessionStorage.removeItem(RESUME_KEY); } catch { /* ignore */ } }
}

function failed(e: unknown) {
  const msg = e instanceof DriveAuthError ? t("サインインできませんでした") : t("Google Drive を読めませんでした");
  host?.toast(msg);
}

// ---------- ダイアログ ----------
let dlg: HTMLElement | undefined;
let lastFocus: HTMLElement | null = null;

function close() {
  dlg?.remove(); dlg = undefined;
  removeEventListener("keydown", onKey, true);
  lastFocus?.focus?.();
}
const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };

function frame(): HTMLElement {
  if (!dlg) {
    lastFocus = document.activeElement as HTMLElement | null;
    dlg = document.createElement("div");
    dlg.className = "dlg-back";
    dlg.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
      <div class="dlg-head"><h2 id="dlg-title">Google Drive</h2><button class="dlg-x" aria-label="${t("閉じる")}">×</button></div>
      <div class="dlg-body"></div></div>`;
    dlg.addEventListener("pointerdown", e => { if (e.target === dlg) close(); });
    dlg.querySelector<HTMLElement>(".dlg-x")!.onclick = close;
    document.body.append(dlg);
    addEventListener("keydown", onKey, true);
  }
  return dlg.querySelector<HTMLElement>(".dlg-body")!;
}

/** Drive のフォルダを選んで開く */
export function openDrive() {
  const c = driveConfig();
  if (!c) return setup();
  if (!driveToken()) return signInStep(c.clientId);
  browse([{ id: "root", name: t("マイドライブ") }]);
}

function setup(prev = "") {
  const body = frame();
  body.innerHTML = `
    <p class="dlg-lead">${t("Kona はサーバーを持たず、このブラウザから直接あなたの Drive を読みます。そのための「OAuth クライアントID」を、あなたの Google Cloud で作って入れてください。")}<a href="${docHref("google-drive")}" target="_blank" rel="noopener noreferrer">${t("作り方の手順")}</a></p>
    <dl class="dlg-uris">
      <dt>${t("承認済みの JavaScript 生成元")}</dt><dd><code>${esc(location.origin)}</code><button class="dlg-copy" data-v="${esc(location.origin)}">${t("コピー")}</button></dd>
      <dt>${t("承認済みのリダイレクト URI")}</dt><dd><code>${esc(redirectUri())}</code><button class="dlg-copy" data-v="${esc(redirectUri())}">${t("コピー")}</button></dd>
    </dl>
    <label class="dlg-field"><span>${t("クライアントID")}</span>
      <input id="dlg-client" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="xxxxxxxx.apps.googleusercontent.com" value="${esc(prev)}"></label>
    <p class="dlg-note" id="dlg-err" hidden></p>
    <p class="dlg-note">${t("読み取りだけの権限 drive.readonly で使います。トークンはこのタブの中だけに置き、約 1 時間で切れます。Kona の側には何も送られません。")}</p>
    <div class="dlg-actions"><button class="btn primary" id="dlg-save">${t("保存してサインイン")}</button></div>`;
  body.querySelectorAll<HTMLButtonElement>(".dlg-copy").forEach(b => b.onclick = () => {
    navigator.clipboard?.writeText(b.dataset.v!).then(() => { b.textContent = t("コピーしました"); setTimeout(() => b.textContent = t("コピー"), 1500); }).catch(() => {});
  });
  const input = body.querySelector<HTMLInputElement>("#dlg-client")!;
  const save = () => {
    const id = input.value.trim();
    const err = body.querySelector<HTMLElement>("#dlg-err")!;
    if (!CLIENT_RE.test(id)) { err.hidden = false; err.textContent = t("「…apps.googleusercontent.com」で終わるIDを入れてください"); input.focus(); return; }
    saveDriveConfig({ clientId: id });
    doSignIn(id);
  };
  body.querySelector<HTMLButtonElement>("#dlg-save")!.onclick = save;
  input.onkeydown = e => { if (e.key === "Enter") save(); };
  input.oninput = () => { body.querySelector<HTMLElement>("#dlg-err")!.hidden = true; };
  input.focus();
}

function signInStep(clientId: string, note = "") {
  const body = frame();
  body.innerHTML = `
    ${note ? `<p class="dlg-note dlg-warn">${esc(note)}</p>` : ""}
    <p class="dlg-lead">${t("Google でサインインして、聴きたいフォルダを選びます。")}</p>
    <div class="dlg-actions">
      <button class="btn" id="dlg-change">${t("クライアントIDを変える")}</button>
      <button class="btn primary" id="dlg-signin">${t("Google でサインイン")}</button>
    </div>`;
  body.querySelector<HTMLButtonElement>("#dlg-signin")!.onclick = () => doSignIn(clientId);
  body.querySelector<HTMLButtonElement>("#dlg-change")!.onclick = () => setup(clientId);
  body.querySelector<HTMLButtonElement>("#dlg-signin")!.focus();
}

async function doSignIn(clientId: string) {
  const body = frame();
  body.innerHTML = `<p class="dlg-lead">${t("別の小さな画面で Google にサインインしてください…")}</p>`;
  try {
    await withResume("browse", () => signIn(clientId));
    browse([{ id: "root", name: t("マイドライブ") }]);
  } catch (e) {
    signInStep(clientId, (e as Error).message === "timeout" ? t("時間切れになりました。もう一度どうぞ。") : t("サインインできませんでした。クライアントIDと、Google Cloud に登録した URI を確かめてください。"));
  }
}

type Crumb = { id: string; name: string };

async function browse(path: Crumb[]) {
  const body = frame();
  const here = path[path.length - 1];
  body.innerHTML = `
    <nav class="dlg-crumbs" aria-label="${t("場所")}"></nav>
    <ul class="dlg-folders" aria-busy="true"><li class="dlg-empty">${t("読んでいます…")}</li></ul>
    <div class="dlg-actions">
      <button class="btn dlg-quiet" id="dlg-out">${t("サインアウト")}</button>
      <button class="btn primary" id="dlg-open"></button>
    </div>`;
  const crumbs = body.querySelector<HTMLElement>(".dlg-crumbs")!;
  path.forEach((c, i) => {
    if (i) crumbs.append(Object.assign(document.createElement("span"), { textContent: "›" }));
    const b = document.createElement("button");
    b.textContent = c.name;
    if (i === path.length - 1) b.setAttribute("aria-current", "location");
    else b.onclick = () => browse(path.slice(0, i + 1));
    crumbs.append(b);
  });
  const open = body.querySelector<HTMLButtonElement>("#dlg-open")!;
  open.textContent = tp("「{0}」を開く", here.name);
  open.onclick = () => {
    const c = driveConfig();
    if (!c) return;
    saveDriveConfig({ ...c, folderId: here.id, folderName: here.name });
    close();
    host?.load(here.name, walkDrive(here.id));
  };
  body.querySelector<HTMLButtonElement>("#dlg-out")!.onclick = () => { signOut(); close(); };

  const ul = body.querySelector<HTMLElement>(".dlg-folders")!;
  try {
    const subs = await listFolders(here.id);
    if (!dlg || !body.isConnected) return;
    ul.removeAttribute("aria-busy");
    ul.replaceChildren();
    if (!subs.length) ul.append(Object.assign(document.createElement("li"), { className: "dlg-empty", textContent: t("この中にフォルダはありません") }));
    for (const f of subs) {
      const li = document.createElement("li"), b = document.createElement("button");
      b.textContent = f.name;
      b.onclick = () => browse([...path, f]);
      li.append(b); ul.append(li);
    }
    (ul.querySelector("button") ?? open).focus();
  } catch (e) {
    const c = driveConfig();
    if (e instanceof DriveAuthError && c) return signInStep(c.clientId, t("サインインが切れました。"));
    ul.replaceChildren(Object.assign(document.createElement("li"), { className: "dlg-empty", textContent: t("読めませんでした。少し待ってからもう一度どうぞ。") }));
  }
}
