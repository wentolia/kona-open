import "./style.css";
import { initTheme } from "./theme";
import { initSettings, renderSettings } from "./settings";
import { prefs } from "./prefs";
import { libGroup, setLibGroup, groupKey, groupAlbums, type LibGroup } from "./libgroup";
import { initShortcuts } from "./shortcuts";
import { t, t as tr, translateStatic } from "./i18n";
import { catVoice } from "./cat-voice";
import { signOut, saveDriveConfig } from "./drive";
import { type Album, type Entry, scan, walkHandle, walkFiles, walkDropped, enrichHead, enrichTracks, eachLimited } from "./library";
import { Player, RATE_MIN, RATE_MAX, PITCH_MAX } from "./player";
import { modeButtonHTML } from "./modeui";
import { exportSettings, importSettings, pickSettingsFile } from "./settings-io";
import { loadTagCache, pruneTagCache } from "./tagcache";
import { kvGet, kvSet, stat, recordPlay, logPlay, addListened } from "./store";
import { type ModuleDef, type ModuleType, type ShelfDef, type ShelfKind, type SortKey, MODULES, KINDS, SORTS, MOODS, moodOf, hsl, isShelf, moduleInfo, kindLabel, ratioLabel, snapRatio, accepts, newId, loadLayout, saveLayout } from "./shelves";
import { mountSingle, mountTwin, unwatchRow, folderGap, installWheel } from "./panes";
import { mountModule } from "./modules";
import { setModuleContext, fadeSwap } from "./modctx";
import { stopAtAlbumEnd, albumEndArmed, focusLocked } from "./mod-clock";
import { setCats, randomCoat, breedCoat, setCatsMusic, setCatHooks, catPicksAlbum, toggleWand, wandOn, type Coat } from "./cat";
import { recordPlace } from "./mod-map";
import { initNoise, roomTail } from "./noise";
import { ritual, isPulled } from "./ritual";
import { wakeCatHost, placeWakeCat, catAwake } from "./wakecat";
import { mountMini, type MiniAction } from "./mini";
import { windowRain, setWindowRain, WINDOW_SCENES, windowScene, setWindowScene, roomLightOn, setRoomLight } from "./mod-window";
import { initRoomLight } from "./room-light";
import { initRoomDecor } from "./room-decor";
import { initRoomThings } from "./room-things";
import { initPhoto } from "./photo";
import { openReceipt } from "./receipt";
import { checkAwards } from "./awards";
import { initShelfMarks } from "./shelf-marks";
import "./photo.css";
import "./room-light.css";
import "./header.css";
import { OBJECTS, objectShown, setObjectShown } from "./mod-objects";
import { SHELF_SKINS, shelfSkin, setShelfSkin } from "./shelf-skin";
import { spectrumPrefs, setSpectrumPrefs, type SpectrumPrefs } from "./mod-spectrum";
import { initDriveUI, openDrive, openDriveSaved, driveSaved, driveReady, resumeDrive } from "./drive-ui";
import { isDriveEntry, isKept, keepAlbum, forgetAlbum, driveConfig, driveToken, walkDrive, type DriveEntry } from "./drive";
import { initMobile, renderMobile, mobileActive } from "./mobile";
import { initParty, openParty, partySupported } from "./party";
import { type Drop, loadHome, saveHome, place, removeModule, addModule, MIN_W as MIN_COL, MIN_H as MIN_STACK } from "./layout";

initTheme();

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

let albums: Album[] = [];
let allAlbums: Album[] = [];      // 読み込んだすべて（外したものも含む）
// ライブラリから外したアルバム。ファイルはそのままで、アプリの棚に出さないだけ
const HIDDEN_KEY = "kona.hidden";
const hidden = new Set<string>((() => { try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]") as string[]; } catch { return []; } })());
let rootName = "";
let savedRoot: FileSystemDirectoryHandle | undefined;
let liveRoot: FileSystemDirectoryHandle | undefined;   // いま開いているフォルダのハンドル（ファイル選択で開いたときはなし）
let liveDrive: string | undefined;                      // いま開いている Google Drive のフォルダ（id）
let pop: { rowId: string; key: string; anchor: HTMLElement } | undefined; // 曲目パネルを開いているアルバム
const featured = new Map<string, string>(); // 棚ごとに面陳しているアルバム（背表紙のホバーで切り替わる）
let modules = loadLayout();
const saveMods = () => saveLayout(modules);
const home = loadHome(modules);
const shelfById = (id: string) => modules.find((m): m is ShelfDef => m.id === id && isShelf(m));
const kept = new Map<string, HTMLElement>(); // 描き直しても作り直さないモジュール（再生中など）
let editing: { id: string; anchor: HTMLElement } | undefined; // 設定を開いているモジュール
const queue: string[] = [];       // 次に再生するアルバム
const player = new Player();
initNoise(player);
const byKey = (k: string) => albums.find(a => a.key === k);
setModuleContext({
  player, albums: () => albums, byKey: k => byKey(k),
  play: a => { play(a); },
  colorOf: a => a.color ?? fallbackColor(a),
});

// ---------- フォルダを開く ----------
const canPickDir = "showDirectoryPicker" in window;

async function openHandle(handle: FileSystemDirectoryHandle) {
  await kvSet("root", handle);
  savedRoot = liveRoot = handle; liveDrive = undefined;
  await load(handle.name, walkHandle(handle));
}

async function openFolder() {
  if (canPickDir) {
    try {
      // @ts-expect-error showDirectoryPicker は一部ブラウザの DOM 型定義に未収録
      await openHandle(await window.showDirectoryPicker({ id: "kona", mode: "read" }));
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
      // iframe 内などで使えない場合はファイル選択にフォールバック
    }
  }
  $<HTMLInputElement>("#picker").click();
}

$<HTMLInputElement>("#picker").addEventListener("change", e => {
  const files = (e.target as HTMLInputElement).files;
  if (!files?.length) return;
  const name = files[0].webkitRelativePath.split("/")[0] || "音楽";
  liveRoot = liveDrive = undefined;
  load(name, walkFiles(files));
});
// 上の「開く」: この端末のフォルダか、Google Drive か
function openSourceMenu(anchor: HTMLElement) {
  closeSourceMenu();
  const el = document.createElement("div");
  el.id = "source-menu"; el.className = "pop-menu"; el.setAttribute("role", "menu");
  const saved = driveSaved();
  el.innerHTML = `<button role="menuitem" data-s="local"><b>${t("この端末のフォルダ")}</b></button>
    <button role="menuitem" data-s="drive"><b>Google Drive</b>${saved ? `<span>${esc(saved.name)}</span>` : ""}</button>
    <hr>
    ${partySupported() ? `<button role="menuitem" data-s="party"><b>リスニングパーティー</b><span>同じ曲をいっしょに聴く</span></button>
    <hr>` : ""}
    <button role="menuitem" data-s="export"><b>${t("設定を書き出す")}</b><span>${t("配置・イコライザーなど")}</span></button>
    <button role="menuitem" data-s="export-all"><b>${t("設定と聴いた記録を書き出す")}</b><span>${t("再生回数・聴いた日と場所も")}</span></button>
    <button role="menuitem" data-s="import"><b>${t("設定を読み込む")}</b></button>`;
  el.onclick = e => {
    const s = (e.target as HTMLElement).closest<HTMLElement>("[data-s]")?.dataset.s;
    if (!s) return;
    closeSourceMenu();
    if (s === "local") openFolder();
    else if (s === "drive") openDrive();
    else if (s === "party") openParty();
    else if (s === "export" || s === "export-all") { saveSession(); const n = exportSettings(s === "export-all"); toast(`${n} 項目を書き出しました`); }
    else loadSettingsFile();
  };
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  el.style.right = `${Math.max(16, innerWidth - r.right)}px`;
  el.style.top = `${r.bottom + 6}px`;
  el.querySelector<HTMLButtonElement>("button")?.focus();
}
// 読み込んだ設定は、画面を開き直して全体に反映する（フォルダは読み直さずに済むよう、開き直す前に今の再生を保存）
async function loadSettingsFile() {
  const file = await pickSettingsFile();
  if (!file) return;
  try {
    const n = await importSettings(file);
    toast(`${n} 項目を読み込みました。画面を開き直します`);
    setTimeout(() => location.reload(), 1200);
  } catch (e) { toast(`読み込めませんでした: ${(e as Error).message}`); }
}
const closeSourceMenu = () => document.getElementById("source-menu")?.remove();
addEventListener("pointerdown", e => { if (!(e.target as HTMLElement).closest("#source-menu, #open")) closeSourceMenu(); });
addEventListener("keydown", e => { if (e.key === "Escape") closeSourceMenu(); });
$("#open").addEventListener("click", e => document.getElementById("source-menu") ? closeSourceMenu() : openSourceMenu(e.currentTarget as HTMLElement));

// フォルダを画面に落としても開ける（ハンドルが取れるブラウザでは、次回もそのまま開ける）
const carriesFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files") && !focusLocked();
let dragDepth = 0;
addEventListener("dragenter", e => { if (carriesFiles(e)) { dragDepth++; document.body.classList.add("drop-folder"); } });
addEventListener("dragleave", e => { if (carriesFiles(e) && --dragDepth <= 0) { dragDepth = 0; document.body.classList.remove("drop-folder"); } });
addEventListener("dragover", e => { if (carriesFiles(e)) { e.preventDefault(); e.dataTransfer!.dropEffect = "copy"; } });
addEventListener("drop", async e => {
  if (!carriesFiles(e)) return;
  e.preventDefault();
  dragDepth = 0; document.body.classList.remove("drop-folder");
  const item = [...e.dataTransfer!.items].find(i => i.kind === "file");
  if (!item) return;
  // 非同期の処理より先に、落とされたものを取り出しておく（イベントが終わると読めなくなる）
  const handleP = (item as DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> }).getAsFileSystemHandle?.();
  const entry = item.webkitGetAsEntry();
  const handle = await handleP?.catch(() => null);
  if (handle?.kind === "directory") { await openHandle(handle as FileSystemDirectoryHandle); return; }
  if (entry?.isDirectory) { liveRoot = liveDrive = undefined; await load(entry.name, walkDropped(entry as FileSystemDirectoryEntry)); return; }
  toast("フォルダを落とすと、その中の音楽を開きます");
});

async function reopenSaved() {
  if (!savedRoot) return;
  // @ts-expect-error requestPermission は DOM 型定義に未収録
  const perm = await savedRoot.requestPermission({ mode: "read" });
  if (perm === "granted") { liveRoot = savedRoot; liveDrive = undefined; await load(savedRoot.name, walkHandle(savedRoot)); }
}

let loads = 0;   // 読み込みを始めた回数（起動の途中でフォルダが選ばれたかを見分ける）
async function load(name: string, entries: AsyncIterable<Entry> | Iterable<Entry>) {
  loads++;
  const prevRoot = rootName;
  rootName = name;
  // 読み込みが終わるまでは開始画面に進み具合だけを出し、棚は見せない
  // 1. フォルダの中を探す（全体の数がまだ分からないので、見つかった曲数だけ出す）
  setState("loading");
  progress("フォルダの中を探しています", `${name}`);
  await loadTagCache();
  let found: Album[];
  try { found = await scan(entries, n => progress("フォルダの中を探しています", `${n} 曲`)); }
  catch (e) {
    const msg = (e as Error).name === "DriveAuthError" ? "Google Drive のサインインが切れました。もう一度開いてください。" : `「${name}」を読めませんでした。通信の具合を確かめて、もう一度どうぞ。`;
    if (allAlbums.length) { rootName = prevRoot; setState("ready"); showCount(); toast(msg); return; } // 読み込み済みの棚はそのまま
    setStatus("");
    setState("start", (e as Error).name === "DriveAuthError" ? "Google Drive のサインインが切れました。もう一度開いてください。" : `「${name}」を読めませんでした。通信の具合を確かめて、もう一度どうぞ。`);
    return;
  }
  if (!found.length) { setStatus(""); setState("start", `「${name}」の中に音楽ファイルが見つかりませんでした。別のフォルダを選んでください。`); return; }
  // 2. アルバムごとにジャケットとタグを読む（ここからは全体に対する割合を出す）
  let done = 0;
  progress("ジャケットとタグを読んでいます", `0 / ${found.length} 枚`, 0);
  await eachLimited(found, 4, async a => {
    await enrichHead(a).catch(() => {});
    done++;
    progress("ジャケットとタグを読んでいます", `${done} / ${found.length} 枚`, done / found.length);
  });
  allAlbums = found;
  albums = found.filter(a => !hidden.has(a.key));
  pruneTagCache(new Set(found.map(a => a.key)));
  showCount();
  await catAwake();
  setState("ready");
  showRescan(); lastScan = Date.now();
  restoreSession();
  renderShelves(); renderCenter();
  placeCats();
}

// ---------- フォルダを読み直す: 増えた・減った・中身が替わったアルバムだけを反映する（棚はそのまま） ----------
let rescanning = false;
function showRescan() {
  const b = $<HTMLButtonElement>("#rescan");
  b.hidden = !liveRoot && !liveDrive;
  watchFolder();
}

// ---------- フォルダの見張り: 曲を足したり消したりすると、ひとりでに棚へ反映する ----------
// - 手元のフォルダ: 変更を知らせてくれるブラウザ（FileSystemObserver）なら、変わったときだけ読み直す。
//   ないブラウザでは、画面を見ている間 3 分ごとに読み直す
// - Google Drive: 画面を見ている間 10 分ごとに読み直す（通信を抑えるため）
// どちらも、ほかのアプリから戻ってきたとき（focus）にも読み直す（1 分に 1 回まで）
type Observer = { observe(h: FileSystemHandle, o?: { recursive?: boolean }): Promise<void>; disconnect(): void };
let observer: Observer | undefined, pollTimer = 0, changeTimer = 0;
function watchFolder() {
  observer?.disconnect(); observer = undefined;
  clearInterval(pollTimer); pollTimer = 0;
  const root = liveRoot;
  const FSO = (window as unknown as { FileSystemObserver?: new (cb: () => void) => Observer }).FileSystemObserver;
  if (root && FSO) {
    try {
      const o = new FSO(() => { clearTimeout(changeTimer); changeTimer = window.setTimeout(() => rescan(true), 3000); });
      o.observe(root, { recursive: true }).then(() => { observer = o; }, () => { o.disconnect(); startPolling(3); });
      observer = o;
      return;
    } catch { /* 見張れなければ、ときどき読み直す */ }
  }
  if (root) startPolling(3);
  else if (liveDrive) startPolling(10);
}
function startPolling(minutes: number) {
  clearInterval(pollTimer);
  pollTimer = window.setInterval(() => { if (document.visibilityState === "visible" && Date.now() - lastScan > 50_000) rescan(true); }, minutes * 60_000);
}
let lastScan = 0;
/** quiet: 画面に戻ってきたときの自動の読み直し。許可を求めず、変わりがなければ何も出さない */
async function rescan(quiet = false) {
  const root = liveRoot, drive = liveDrive;
  if ((!root && !drive) || rescanning || document.body.dataset.state !== "ready") return;
  if (root) {
    // @ts-expect-error requestPermission / queryPermission は DOM 型定義に未収録
    const perm = await (quiet ? root.queryPermission({ mode: "read" }) : root.requestPermission({ mode: "read" })).catch(() => "denied");
    if (perm !== "granted") return;
  } else if (!driveToken()) {
    if (!quiet) toast("Google Drive のサインインが切れています。開き直してください");
    return;
  }
  const btn = $<HTMLButtonElement>("#rescan");
  rescanning = true; lastScan = Date.now(); btn.disabled = true;
  if (!quiet) btn.textContent = "読み直しています";
  try {
    let found: Album[];
    try { found = await scan(root ? walkHandle(root) : walkDrive(drive!)); }
    catch { if (!quiet) toast("読み直せませんでした。通信の具合を確かめて、もう一度どうぞ"); return; }
    const old = new Map(allAlbums.map(a => [a.key, a]));
    const files = (a: Album) => [...a.tracks.map(t => t.entry.path)].sort().join("\n") + "\n" + (a.coverEntry?.path ?? "");
    // 中のファイルが同じアルバムは今のものを使い続ける（ジャケット・曲順・再生中の参照がそのまま残る）
    const next = found.map(f => { const o = old.get(f.key); return o && files(o) === files(f) ? o : f; });
    const fresh = next.filter(a => old.get(a.key) !== a);
    await eachLimited(fresh, 4, a => enrichHead(a).catch(() => {}));
    if (liveRoot !== root || liveDrive !== drive) return; // 読み直しの途中で別のフォルダを開いた
    const keep = new Set(next);
    for (const a of allAlbums) if (!keep.has(a) && a !== player.album && a.cover) URL.revokeObjectURL(a.cover);
    const added = next.filter(a => !old.has(a.key)).length;
    const removed = allAlbums.filter(a => !next.some(n => n.key === a.key)).length;
    const changed = fresh.length - added;
    allAlbums = next;
    albums = next.filter(a => !hidden.has(a.key));
    for (let i = queue.length - 1; i >= 0; i--) if (!byKey(queue[i])) queue.splice(i, 1);
    pruneTagCache(new Set(next.map(a => a.key)));
    showCount(); renderShelves();
    const parts = [added && `${added} 枚増えました`, removed && `${removed} 枚減りました`, changed && `${changed} 枚の中身が替わりました`].filter(Boolean);
    if (parts.length || !quiet) toast(parts.length ? parts.join("、") : "変わりはありませんでした");
  } finally {
    rescanning = false; btn.disabled = false; btn.textContent = "読み直す";
  }
}
$("#rescan").addEventListener("click", () => rescan());
// ほかのアプリでフォルダに曲を足して戻ってきたら、ひとりでに反映する（1 分に 1 回まで）
addEventListener("focus", () => { if (prefs().autoRescan && Date.now() - lastScan > 60_000) rescan(true); });

// 開き直しても、再生中のアルバム（曲と位置）と「次に再生」を戻す。再生は止まった状態で
const NOW_KEY = "kona.now", QUEUE_KEY = "kona.queue";
let restored = false;
function restoreSession() {
  try {
    const q: string[] = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    queue.splice(0, queue.length, ...q.filter(k => byKey(k)));
    const now: { k: string; i: number; t: number } | null = JSON.parse(localStorage.getItem(NOW_KEY) ?? "null");
    const a = now && byKey(now.k);
    if (a && !player.album) {
      enrichTracks(a).then(() => player.cue(a, Math.min(now!.i, a.tracks.length - 1), now!.t)).finally(() => setTimeout(() => { restored = true; }, 1500));
      return;
    }
  } catch { /* 壊れた記録は無視 */ }
  restored = true;
}
function saveSession() {
  if (!restored) return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    if (player.album) localStorage.setItem(NOW_KEY, JSON.stringify({ k: player.album.key, i: player.index, t: Math.floor(player.position) }));
  } catch { /* ignore */ }
}
setInterval(saveSession, 5000);
addEventListener("pagehide", saveSession);

// 開始画面の進捗表示。ratio を渡さないときは、行き来する帯で「作業中」だけを示す
function progress(step: string, detail: string, ratio?: number) {
  const bar = document.getElementById("start-bar");
  if (!bar) return;
  bar.classList.toggle("indeterminate", ratio === undefined);
  bar.style.setProperty("--p", String(ratio ?? 0));
  bar.setAttribute("aria-valuenow", ratio === undefined ? "" : String(Math.round(ratio * 100)));
  if (ratio === undefined) bar.removeAttribute("aria-valuenow");
  $("#start-step").textContent = step;
  $("#start-progress").textContent = detail;
}

function setStatus(s: string) { $("#status").textContent = s; }
function showCount() {
  const total = albums.reduce((n, a) => n + a.tracks.length, 0);
  setStatus(`${rootName} · ${albums.length} 枚 · ${total} 曲`);
}

/** アルバムをライブラリから外す（戻す）。棚・次に再生からも消える。外した直後は「元に戻す」を出す */
function setHidden(keys: string[], hide: boolean, undo = true) {
  for (const k of keys) hide ? hidden.add(k) : hidden.delete(k);
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden])); } catch { /* 保存できなくても動く */ }
  albums = allAlbums.filter(a => !hidden.has(a.key));
  if (hide) for (let i = queue.length - 1; i >= 0; i--) if (hidden.has(queue[i])) queue.splice(i, 1);
  showCount(); closePop(); renderShelves();
  if (hide && undo) toast(`${keys.length} 枚を外しました`, "元に戻す", () => setHidden(keys, false, false));
}

let toastTimer = 0;
function toast(text: string, action?: string, run?: () => void) {
  document.getElementById("toast")?.remove(); clearTimeout(toastTimer);
  const el = document.createElement("div");
  el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status");
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button>${esc(action)}</button>` : ""}`;
  if (action && run) $("button", el).onclick = () => { el.remove(); run(); };
  document.body.append(el);
  toastTimer = window.setTimeout(() => { el.classList.add("toast-out"); setTimeout(() => el.remove(), 300); }, 6000);
}

// Drive のフォルダは、開いたフォルダ（設定に残る id）をあとで読み直せるように覚えておく
initDriveUI({ load: (name, entries) => { liveRoot = undefined; liveDrive = driveConfig()?.folderId; return load(name, entries); }, toast });

// Drive のアルバムを端末に残す（電波のないところでも聴ける・通信量を使わない）
const driveFiles = (a: Album) => [...a.tracks.map(t => t.entry), ...(a.coverEntry ? [a.coverEntry] : [])].filter(isDriveEntry) as DriveEntry[];
const keeping = new Set<string>();
async function toggleKeep(a: Album) {
  const files = driveFiles(a);
  if (isKept(a.key)) { await forgetAlbum(a.key, files); toast(`「${a.title}」を端末から消しました`); renderPop(); renderMobile(); return; }
  if (keeping.has(a.key)) return;
  keeping.add(a.key); renderPop(); renderMobile();
  try {
    await keepAlbum(a.key, files, (d, n) => document.querySelectorAll("#pop .opened-keep, #m-sheet .m-keep").forEach(b => { b.textContent = `残しています ${d}/${n}`; }));
    toast(`「${a.title}」を端末に残しました`);
  } catch { toast(`「${a.title}」を残せませんでした`); }
  finally { keeping.delete(a.key); renderPop(); renderMobile(); }
}

initRoomLight();
initRoomDecor();
initRoomThings();
initParty({ toast: t => toast(t) });

// ---------- スマホ版: タッチ端末の狭い画面では、ホームの代わりに mobile.ts の画面を出す ----------
initMobile({
  player, albums: () => albums, queue,
  play: (a, i) => play(a, i),
  queueChanged: () => renderShelves(),
  colorOf: a => a.color ?? fallbackColor(a),
  art: a => art(a),
  openSource: kind => kind === "local" ? openFolder() : openDrive(),
  driveName: () => driveSaved()?.name,
  keepState: a => !driveFiles(a).length ? undefined : keeping.has(a.key) ? "keeping" : isKept(a.key) ? "kept" : "none",
  toggleKeep: a => { toggleKeep(a); },
  toast: (text, action, run) => toast(text, action, run),
  status: () => $("#status").textContent ?? "",
}, () => placeCats());

// ---------- 開始画面: フォルダを読み込むまでは、空の棚を見せずにここだけを出す ----------
type AppState = "start" | "loading" | "ready";
function setState(state: AppState, note = "") {
  document.body.dataset.state = state;
  if (state === "ready") { document.querySelector("#start .wake-cat")?.remove(); return; } // 起動画面の猫は帰る
  // 起動画面の猫は、開始 → 読み込み中と画面が替わっても同じ子のまま（あくびを最初からやり直さない）
  const cat = document.querySelector<HTMLElement>("#start .wake-cat") ?? wakeCatHost();
  $("#start").innerHTML = `<div class="start-inner">
    <i id="start-cat"></i>
    <div class="start-brand">KONA</div>
    ${state === "loading"
      ? `<p class="start-lead" id="start-step">読み込んでいます</p>
        <div class="start-bar indeterminate" id="start-bar" role="progressbar" aria-label="読み込みの進み具合" aria-valuemin="0" aria-valuemax="100"><i></i></div>
        <p class="start-progress" id="start-progress"></p>`
      : `${note ? `<p class="start-note start-warn">${esc(note)}</p>` : ""}
        <div class="start-actions">
          ${savedRoot ? `<button class="btn primary" id="s-reopen">「${esc(savedRoot.name)}」を開く</button>` : ""}
          ${!savedRoot && driveSaved() ? `<button class="btn primary" id="s-drive-reopen">Drive の「${esc(driveSaved()!.name)}」を開く</button>` : ""}
          <button class="btn ${savedRoot || driveSaved() ? "" : "primary"}" id="s-open">${savedRoot ? "別のフォルダを選ぶ" : "フォルダを選ぶ"}</button>
          <button class="btn" id="s-drive">Google Drive から</button>
        </div>
`}
  </div>`;
  $("#start-cat").replaceWith(cat); placeWakeCat(cat, coats[0]);
  $("#s-open")?.addEventListener("click", openFolder);
  $("#s-reopen")?.addEventListener("click", reopenSaved);
  $("#s-drive")?.addEventListener("click", openDrive);
  $("#s-drive-reopen")?.addEventListener("click", openDriveSaved);
  $<HTMLButtonElement>(savedRoot ? "#s-reopen" : driveSaved() ? "#s-drive-reopen" : "#s-open")?.focus();
}

// ---------- 部品 ----------
function hashOf(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return Math.abs(h); }
function fallbackColor(a: Album) { const h = hashOf(a.key); return `hsl(${h % 360} ${18 + h % 20}% ${30 + (h >> 8) % 20}%)`; }
function isLight(color: string) {
  const m = color.match(/rgb\((\d+) (\d+) (\d+)\)/);
  if (!m) return false;
  const [r, g, b] = m.slice(1).map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

// ジャケットのないアルバム: 設定で「色と題名」「頭文字」「色だけ」
function art(a: Album) {
  if (a.cover) return `<img class="art" alt="" src="${a.cover}">`;
  const how = prefs().blankArt, text = how === "title" ? esc(a.title) : how === "initial" ? esc([...a.title.trim()][0] ?? "") : "";
  return `<div class="art-blank${how === "initial" ? " initial" : ""}" style="background:${a.color ?? fallbackColor(a)}">${text}</div>`;
}

function draggable(b: HTMLElement, a: Album, rowId: string) {
  b.draggable = true;
  b.dataset.key = a.key;
  b.addEventListener("dragstart", e => {
    e.dataTransfer!.setData(DND_ALBUM, a.key);
    // 選んだアルバムのひとつを持ち出したら、選んだものをまとめて運ぶ
    if (selected.has(a.key) && selected.size > 1) e.dataTransfer!.setData(DND_MANY, JSON.stringify([...selected]));
    e.dataTransfer!.setData(DND_FROM, rowId);
    e.dataTransfer!.effectAllowed = "copyMove";
    document.body.classList.add("dragging-album");
    // 次に再生から持ち出したものは、次に再生の外に落とすと棚に戻す（キューから外す）
    if (shelfById(rowId)?.kind === "queue") e.dataTransfer!.setData(DND_RETURN, a.key);
  });
  b.addEventListener("dragend", () => document.body.classList.remove("dragging-album", "return-out"));
}

// 1回のクリックで曲目を開き、ダブルクリックで今の再生に割り込む。Ctrl（Mac は ⌘）/ Shift を押しながらなら選ぶ
function onClicks(el: HTMLElement, single: () => void, double: () => void, key?: string) {
  let t: number | undefined;
  el.onclick = e => {
    clearTimeout(t);
    if (key && (e.ctrlKey || e.metaKey || e.shiftKey)) { e.preventDefault(); pick(key, el, e.shiftKey); return; }
    if (selected.size) clearSelection();
    t = window.setTimeout(single, 220);
  };
  el.ondblclick = e => { if (e.ctrlKey || e.metaKey || e.shiftKey) return; clearTimeout(t); double(); };
}

// ---------- 複数選択: Ctrl / ⌘ クリックで 1 枚ずつ、Shift クリックで前に選んだところからまとめて ----------
const DND_MANY = "application/x-kona-albums";
const selected = new Set<string>();
let pickFrom: string | undefined;
function pick(key: string, el: HTMLElement, range: boolean) {
  if (pop) closePop();
  if (range && pickFrom) {
    // 同じ並び（ライブラリ全体、またはそのモジュール）の中で、前に選んだところから今のところまで
    const scope = el.closest(".lib-shelves, .mod") ?? document;
    const keys = [...new Set([...scope.querySelectorAll<HTMLElement>(".spine[data-key]")].map(x => x.dataset.key!))];
    const i = keys.indexOf(pickFrom), j = keys.indexOf(key);
    if (i >= 0 && j >= 0) for (const k of keys.slice(Math.min(i, j), Math.max(i, j) + 1)) selected.add(k);
    else selected.add(key);
  } else {
    if (selected.has(key)) selected.delete(key); else selected.add(key);
    pickFrom = key;
  }
  paintSelection();
}
function clearSelection() { selected.clear(); pickFrom = undefined; paintSelection(); }
function paintSelection() {
  document.querySelectorAll<HTMLElement>(".spine[data-key], .face[data-key]").forEach(el => el.classList.toggle("selected", selected.has(el.dataset.key!)));
  let bar = document.getElementById("sel-bar");
  if (!selected.size) { bar?.remove(); return; }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "sel-bar"; bar.className = "sel-bar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "選んだアルバム");
    bar.onclick = e => {
      const act = (e.target as HTMLElement).closest<HTMLElement>("[data-a]")?.dataset.a;
      if (act) selectionAction(act);
    };
    document.body.append(bar);
  }
  const inQueue = [...selected].filter(k => queue.includes(k)).length;
  bar.innerHTML = `<span class="sel-n">${selected.size} 枚</span>
    <button data-a="queue">次に再生に入れる</button>
    ${inQueue ? `<button data-a="unqueue">次に再生から外す</button>` : ""}
    <button data-a="hide">ライブラリから外す</button>
    <button data-a="clear" class="sel-x" aria-label="選ぶのをやめる" title="選ぶのをやめる（Esc）">${ICON.close}</button>`;
}
function selectionAction(act: string) {
  const keys = [...selected].filter(k => byKey(k));
  if (act === "queue") {
    const add = keys.filter(k => !queue.includes(k));
    queue.push(...add);
    toast(add.length ? `${add.length} 枚を次に再生に入れました` : "どれもすでに次に再生にあります");
  } else if (act === "unqueue") {
    const n = keys.filter(k => queue.includes(k)).length;
    for (let i = queue.length - 1; i >= 0; i--) if (selected.has(queue[i])) queue.splice(i, 1);
    toast(`${n} 枚を次に再生から外しました`);
  } else if (act === "hide") {
    clearSelection();
    setHidden(keys, true);
    return;
  }
  clearSelection();
  renderShelves();
}
addEventListener("keydown", e => { if (e.key === "Escape" && selected.size) clearSelection(); });

function spine(a: Album, rowId: string) {
  const b = document.createElement("button");
  const bg = a.color ?? fallbackColor(a), h = hashOf(a.key);
  b.className = "spine" + (a === player.album ? " playing" : "") + (isPulled(a.key) ? " pulled" : "");
  draggable(b, a, rowId);
  b.style.cssText = `width:${15 + Math.min(11, Math.round(a.tracks.length * .65))}px;height:${66 + h % 24}%;background:${bg};color:${isLight(bg) ? "#15181b" : "#f2f2f0"}`;
  b.title = a.artist ? `${a.title} — ${a.artist}` : a.title;
  // 棚板スキンでは、ジャケットの一部を縦に引き伸ばしてぼかしたものを背表紙の地にする（位置はアルバムごとに固定）
  const tex = a.cover ? `<i class="spine-tex" style="background-image:url('${a.cover}');background-position:${h % 100}% 50%"></i>` : "";
  b.innerHTML = `${tex}<span>${esc(a.title)}</span>`;
  onClicks(b, () => openPop(rowId, a, b), () => interrupt(a), a.key);
  if (selected.has(a.key)) b.classList.add("selected");
  return b;
}

function face(a: Album, label: string, rowId: string) {
  const b = document.createElement("button");
  b.className = "face" + ((a.ratio ?? 1) < 1 ? " tall" : "");
  b.style.setProperty("--ar", String(a.ratio ?? 1));
  draggable(b, a, rowId);
  b.title = a.artist ? `${a.title} — ${a.artist}` : a.title;
  b.innerHTML = art(a) + (label ? `<span class="tag${a === player.album ? " hot" : ""}">${esc(label)}</span>` : "");
  b.addEventListener("dragstart", e => e.dataTransfer!.setData(DND_FACE + rowId, "1"));
  onClicks(b, () => openPop(rowId, a, b), () => interrupt(a), a.key);
  if (selected.has(a.key)) b.classList.add("selected");
  return b;
}

// 曲目パネル: 棚の上か下（広い方）に浮かべて表示する。棚の並びは動かさない
function openPop(rowId: string, a: Album, anchor: HTMLElement) {
  if (editing) closeModuleMenu();
  pop = { rowId, key: a.key, anchor };
  enrichTracks(a).then(renderPop);
  renderPop();
}

function closePop() { pop = undefined; renderPop(); }

function renderPop() {
  let el = document.getElementById("pop");
  const a = pop && byKey(pop.key);
  if (!pop || !a || !pop.anchor.isConnected) { el?.remove(); if (pop && !pop.anchor.isConnected) pop = undefined; return; }
  if (!el) { el = document.createElement("div"); el.id = "pop"; el.className = "pop"; document.body.append(el); }
  const { rowId } = pop;
  const isNow = a === player.album;
  const total = a.tracks.reduce((n, t) => n + (t.duration ?? 0), 0);
  el.innerHTML = `
    <button class="opened-cover" aria-label="${esc(a.title)} を再生">${art(a)}<span class="opened-play">${ICON.play}</span></button>
    <div class="opened-body">
      <div class="opened-head">
        <div><b>${esc(a.title)}</b><span>${esc(a.artist || a.dir)} · ${a.tracks.length} 曲${total ? " · " + fmt(total) : ""}</span></div>
        <span class="opened-actions">
          ${removable(rowId, a) ? `<button class="opened-remove">この棚から外す</button>` : ""}
          ${rowId.startsWith("shelf-") ? `<button class="opened-remove opened-hide">ライブラリから外す</button>` : ""}
          ${driveFiles(a).length ? `<button class="opened-remove opened-keep"${keeping.has(a.key) ? " disabled" : ""}>${keeping.has(a.key) ? "残しています…" : isKept(a.key) ? "端末から消す" : "端末に残す"}</button>` : ""}
          <button class="opened-close" aria-label="閉じる">${ICON.close}</button>
        </span>
      </div>
      <ol class="tracks">${a.tracks.map((t, i) => `
        <li class="${isNow && i === player.index ? "current" : ""}"><button data-i="${i}">
          <span class="no">${String(t.no).padStart(2, "0")}</span><span class="t">${esc(t.title)}</span><span class="dur">${t.duration ? fmt(t.duration) : ""}</span>
        </button></li>`).join("")}</ol>
    </div>`;
  $(".opened-cover", el).onclick = () => play(a);
  $(".opened-close", el).onclick = closePop;
  const rm = $(".opened-remove", el);
  if (rm && !rm.classList.contains("opened-hide") && !rm.classList.contains("opened-keep")) rm.onclick = () => { removeFrom(rowId, a.key); closePop(); renderShelves(); };
  const hide = $(".opened-hide", el);
  if (hide) hide.onclick = () => setHidden([a.key], true);
  const keep = $(".opened-keep", el);
  if (keep) keep.onclick = () => toggleKeep(a);
  $(".tracks", el).onclick = e => {
    const i = (e.target as HTMLElement).closest<HTMLElement>("[data-i]")?.dataset.i;
    if (i !== undefined) play(a, Number(i));
  };
  placePop(el, pop.anchor);
}

function placePop(el: HTMLElement, anchor: HTMLElement) {
  const shelf = (anchor.closest(".mod, .box, .shelf") ?? anchor) as HTMLElement;
  const s = shelf.getBoundingClientRect(), r = anchor.getBoundingClientRect();
  const below = innerHeight - s.bottom, above = s.top - ($(".top")?.getBoundingClientRect().bottom ?? 0);
  const room = Math.max(below, above) - 12;
  el.style.maxHeight = `${Math.max(180, Math.min(380, room))}px`;
  const w = el.offsetWidth;
  el.style.left = `${Math.max(16, Math.min(r.left - 20, innerWidth - w - 16))}px`;
  if (below >= above) { el.style.top = `${s.bottom + 6}px`; el.style.bottom = ""; }
  else { el.style.top = ""; el.style.bottom = `${innerHeight - s.top + 6}px`; }
}

addEventListener("pointerdown", e => {
  if (!pop) return;
  const t = e.target as HTMLElement;
  if (t.closest("#pop, .spine, .face")) return;
  closePop();
});
addEventListener("keydown", e => { if (e.key === "Escape" && pop) closePop(); });
const repositionPop = () => { const el = document.getElementById("pop"); if (el && pop) placePop(el, pop.anchor); };
addEventListener("resize", repositionPop);
addEventListener("scroll", e => { if (!(e.target as HTMLElement).closest?.("#pop")) repositionPop(); }, true);

// 背表紙にカーソルを乗せたら、その棚の面陳をそのアルバムに替える
function feature(row: HTMLElement, rowId: string, a: Album, label: string) {
  if (featured.get(rowId) === a.key && row.querySelector(".face")) return;
  featured.set(rowId, a.key);
  row.querySelector(".face")?.replaceWith(face(a, label, rowId));
  row.querySelectorAll(".spine.featured").forEach(el => el.classList.remove("featured"));
  row.querySelectorAll(`.spine[data-key="${CSS.escape(a.key)}"]`).forEach(el => el.classList.add("featured"));
}

// 段の中身: 面陳の欄は棚の中の決まった位置（pos: 0 左端〜1 右端）に置いたまま動かさない。
// 背表紙は1本の列で、欄の左右の窓を通して見せる（窓の扱いは panes.ts）
function fillRow(row: HTMLElement, rowId: string, c: Contents, pos = 0) {
  unwatchRow(row);
  row.innerHTML = "";
  row.dataset.row = rowId;
  const { list, faces } = c;
  if (!list.length) { return; }
  const chosen = list.find(a => a.key === featured.get(rowId)) ?? [...faces.keys()][0] ?? list[0];
  const at = Math.max(0, Math.min(1, pos));
  const pane = (side: "l" | "r") => {
    const el = document.createElement("div");
    el.className = `spines pane-${side}`;
    list.forEach((a, i) => {
      if (c.folderGaps && i > 0 && groupKey(list[i - 1]) !== groupKey(a)) el.append(folderGap(groupKey(list[i - 1]), groupKey(a)));
      const sp = spine(a, rowId);
      if (a === chosen) sp.classList.add("featured");
      sp.addEventListener("mouseenter", () => feature(row, rowId, a, faces.get(a) ?? ""));
      el.append(sp);
    });
    return el;
  };
  const f = face(chosen, faces.get(chosen) ?? "", rowId);
  row.style.setProperty("--pos", String(at));
  row.classList.toggle("two-panes", at > 0 && at < 1);
  if (at > 0 && at < 1) {
    const l = pane("l"), r = pane("r");
    row.append(l, f, r);
    mountTwin(row, l, r);
  } else {
    const p = pane(at <= 0 ? "r" : "l");
    p.dataset.scroll = rowId;
    if (at <= 0) row.append(f, p); else row.append(p, f);
    mountSingle(p);
  }
  // 次に再生: カーソルが離れたら、次に切り替わるアルバムの面陳に戻す
  if (shelfById(rowId)?.kind === "queue") row.onmouseleave = () => {
    if (pop?.rowId === rowId || document.body.classList.contains("dragging-album")) return;
    const next = upNext();
    if (next && list.includes(next)) feature(row, rowId, next, faces.get(next) ?? "");
  };
}

// 同じアルバムの背表紙が2つの窓にあるとき、いま見えている方を選ぶ
function visibleSpine(scope: ParentNode, key: string) {
  const all = [...scope.querySelectorAll<HTMLElement>(`.spine[data-key="${CSS.escape(key)}"]`)];
  return all.find(el => {
    const r = el.getBoundingClientRect(), p = (el.parentElement ?? el).getBoundingClientRect();
    return r.right > p.left + 2 && r.left < p.right - 2;
  }) ?? all[0];
}

// 描き直しても横スクロール位置を保つ
function keepScroll(fn: () => void) {
  const pos = new Map<string, number>();
  document.querySelectorAll<HTMLElement>("[data-scroll]").forEach(el => pos.set(el.dataset.scroll!, el.scrollLeft));
  const tops = [".lib-shelves", ".home"].map(sel => [sel, $(sel)?.scrollTop ?? 0] as const);
  const focused = document.activeElement instanceof HTMLInputElement && document.activeElement.id ? document.activeElement : undefined;
  const caret = focused?.selectionStart ?? null;
  fn();
  if (focused && !focused.isConnected) {
    const again = document.getElementById(focused.id) as HTMLInputElement | null;
    again?.focus();
    if (again && caret !== null) again.setSelectionRange(caret, caret);
  }
  document.querySelectorAll<HTMLElement>("[data-scroll]").forEach(el => { el.scrollLeft = pos.get(el.dataset.scroll!) ?? 0; });
  tops.forEach(([sel, top]) => { const el = $(sel); if (el) el.scrollTop = top; });
}

// ---------- ホームの棚: 種類ごとの中身 ----------
const ROW_LIMIT = 80;
const DND_ALBUM = "application/x-kona-album", DND_FROM = "application/x-kona-from";
const DND_RETURN = "application/x-kona-return"; // 次に再生から持ち出したアルバム
const DND_FACE = "application/x-kona-face-"; // + 棚の id。面陳の欄を同じ棚の中で動かすとき

function dailyShuffle<T>(xs: T[], key: (x: T) => string): T[] {
  const day = new Date().toDateString();
  return [...xs].sort((a, b) => hashOf(key(a) + day) - hashOf(key(b) + day));
}
const byLast = (x: Album, y: Album) => stat(y.key).last - stat(x.key).last;
const recentFace = (list: Album[]) => {
  const r = [...list].sort(byLast)[0];
  return r && stat(r.key).last ? new Map([[r, "最近聴いた"]]) : new Map<Album, string>();
};

interface Contents { list: Album[]; faces: Map<Album, string>; folderGaps?: boolean }

// ブックエンドを置く棚は、並び順を保ったままフォルダごとにまとめる（最初に出てきたフォルダから順に）
function withFolderGaps(d: ShelfDef, c: Contents): Contents {
  if (!d.folderGaps || d.kind === "queue") return c;
  const groups = new Map<string, Album[]>();
  c.list.forEach(a => groups.set(groupKey(a), [...(groups.get(groupKey(a)) ?? []), a]));
  return { ...c, list: [...groups.values()].flat(), folderGaps: true };
}

// 検索: 空白区切りの語をすべて含むもの。artist: / genre: / year: / folder:（a: g: y: f:）で項目を指定できる
const norm = (s: string) => s.normalize("NFKC").toLowerCase();
function matches(a: Album, q: string) {
  return norm(q).split(/\s+/).filter(Boolean).every(tok => {
    const m = tok.match(/^(artist|a|genre|g|year|y|folder|f):(.+)$/);
    if (!m) return norm([a.title, a.artist, a.dir, a.shelf, a.genre ?? "", a.year ?? ""].join(" ")).includes(tok);
    const [, k, v] = m;
    if (k[0] === "y") {
      const [lo, hi = lo] = v.split("-").map(Number);
      return !!a.year && a.year >= lo && a.year <= hi;
    }
    return norm(k[0] === "a" ? a.artist : k[0] === "g" ? a.genre ?? "" : a.shelf).includes(v);
  });
}

function sortAlbums(list: Album[], key: SortKey) {
  const by: Record<SortKey, (x: Album, y: Album) => number> = {
    title: (x, y) => collator.compare(x.title, y.title),
    artist: (x, y) => collator.compare(x.artist, y.artist) || collator.compare(x.title, y.title),
    year: (x, y) => (y.year ?? 0) - (x.year ?? 0),
    // 古い順: 年のないものは最後に。同じ年は題名の順
    yearAsc: (x, y) => (x.year ?? Infinity) - (y.year ?? Infinity) || collator.compare(x.title, y.title),
    plays: (x, y) => stat(y.key).plays - stat(x.key).plays,
    last: byLast,
  };
  return [...list].sort(by[key]);
}

function contentsOf(d: ShelfDef): Contents {
  const played = albums.filter(a => stat(a.key).plays > 0);
  const rest = albums.filter(a => stat(a.key).plays === 0);
  switch (d.kind) {
    case "often": {
      const often = [...played].sort((x, y) => stat(y.key).plays - stat(x.key).plays);
      return { list: [...often, ...rest].slice(0, ROW_LIMIT), faces: new Map(often.slice(0, 2).map(a => [a, `${stat(a.key).plays} 回`] as const)) };
    }
    case "recent": {
      const recent = [...played].sort(byLast);
      return { list: [...recent, ...dailyShuffle(rest, a => a.key)].slice(0, ROW_LIMIT), faces: new Map(recent.filter(a => a !== player.album).slice(0, 1).map(a => [a, "最近聴いた"] as const)) };
    }
    case "queue": {
      // 入れたアルバムだけを並べる。欄には、今のアルバムが終わったときに切り替わる1枚を見せる
      const list = queue.map(byKey).filter(Boolean) as Album[];
      const next = upNext();
      // 切り替わる先が変わったら、ホバーで選んでいた面陳を戻して次の1枚を見せる
      if (next?.key !== lastUpNext.get(d.id)) { lastUpNext.set(d.id, next?.key); featured.delete(d.id); }
      return {
        list, faces: next ? new Map([[next, "次に再生"]]) : new Map(),
      };
    }
    case "folder": {
      const list = albums.filter(a => a.shelf === d.arg);
      return { list, faces: recentFace(list) };
    }
    case "artist": {
      const list = albums.filter(a => a.artist === d.arg);
      return { list, faces: recentFace(list) };
    }
    case "mood": {
      // 同じ気分のアルバムを、色相の順に並べる（色が流れるように）
      const mood = d.arg ?? MOODS[0];
      const list = albums.filter(a => moodOf(a.color) === mood).sort((x, y) => (hsl(x.color)?.[0] ?? 0) - (hsl(y.color)?.[0] ?? 0));
      return { list, faces: recentFace(list) };
    }
    case "manual":
      return { list: (d.albums ?? []).map(byKey).filter(Boolean) as Album[], faces: new Map() };
    case "search": {
      const list = sortAlbums(albums.filter(a => matches(a, d.query ?? "")), d.sort ?? prefs().libSort);
      return { list: list.slice(0, 400), faces: recentFace(list) };
    }
  }
}

function removable(rowId: string, a: Album) {
  const d = shelfById(rowId);
  return d?.kind === "manual" || (d?.kind === "queue" && queue.includes(a.key));
}

function removeFrom(rowId: string, key: string) {
  const d = shelfById(rowId);
  if (!d) return;
  if (d.kind === "queue") { const i = queue.indexOf(key); if (i >= 0) queue.splice(i, 1); }
  if (d.kind === "manual") { d.albums = (d.albums ?? []).filter(k => k !== key); saveMods(); }
}

// アルバムを棚に入れる。同じ棚の中なら並べ替え
function insertInto(d: ShelfDef, key: string, index: number) {
  const list = d.kind === "queue" ? queue : (d.albums ??= []);
  const from = list.indexOf(key);
  if (from >= 0) { list.splice(from, 1); if (from < index) index--; }
  list.splice(Math.max(0, Math.min(index, list.length)), 0, key);
  if (d.kind === "manual") saveMods();
}

function renderShelves() {
  keepScroll(() => { renderModules(); renderLibrary(); });
  applyFocusLock();
  saveSession();
  if (pop) {
    // 描き直しで元の背表紙が入れ替わったら、同じアルバムの背表紙を基準にし直す
    const row = document.querySelector(`[data-row="${CSS.escape(pop.rowId)}"]`);
    pop.anchor = (row && visibleSpine(row, pop.key)) ?? visibleSpine(document, pop.key) ?? pop.anchor;
    renderPop();
  }
  if (editing) renderModuleMenu();
  renderMobile();
}

// ---------- ホーム: 段 → 列 → 重ねたモジュール（配置の形は layout.ts） ----------
function renderModules() {
  const grid = $(".grid");
  if (!grid) return;
  grid.querySelectorAll(":scope > .lrow, :scope > .split-row").forEach(el => el.remove());
  const div = (cls: string, data: Record<string, number> = {}) => {
    const el = document.createElement("div");
    el.className = cls;
    for (const [k, v] of Object.entries(data)) el.dataset[k] = String(v);
    return el;
  };
  home.rows.forEach((r, ri) => {
    const row = div("lrow", { ri });
    row.style.height = `${r.height}px`;
    r.cols.forEach((c, ci) => {
      if (ci) row.append(div("split split-v", { ri, ci }));
      const col = div("lcol", { ri, ci });
      col.style.flex = `${c.w} 1 0px`;
      c.stack.forEach((k, ki) => {
        const d = modules.find(m => m.id === k.id);
        if (!d) return;
        if (ki) col.append(div("split split-h", { ri, ci, ki }));
        const sec = moduleEl(d);
        sec.style.flex = `${k.h} 1 0px`;
        col.append(sec);
      });
      row.append(col);
    });
    grid.append(row);
    grid.append(div("split split-row", { ri }));
  });
}

// どのモジュールにも共通の枠: 上の余白に名前の札（つまみでドラッグ、名前を押すと設定）
function moduleEl(d: ModuleDef) {
  let sec = kept.get(d.id);
  const fresh = !sec;
  if (!sec) {
    sec = document.createElement("section");
    sec.dataset.id = d.id;
    sec.innerHTML = `
      <header class="mod-head">
        <span class="mod-grip" aria-hidden="true">${ICON.grip}</span>
        <button class="mod-title"></button>
      </header>
      <div class="mod-body"></div>`;
    $(".mod-title", sec).onclick = e => {
      if (justDragged) return;
      const t = e.currentTarget as HTMLElement;
      if (editing?.id === d.id) closeModuleMenu(); else openModuleMenu(d, t);
    };
    wireModuleDrag(sec, d);
    if (!isShelf(d)) kept.set(d.id, sec); // 再生中・EQ・波形などは描き直しても作り直さない
  }
  if (isShelf(d)) sec.dataset.kind = d.kind;
  sec.className = `mod mod-${d.type}` + (isShelf(d) && accepts(d.kind) ? " mod-accepts" : "") + (editing?.id === d.id ? " mod-open" : "");
  $(".mod-title", sec).textContent = d.title;
  if (editing?.id === d.id) editing.anchor = $(".mod-title", sec);
  const body = $(".mod-body", sec);
  if (isShelf(d)) shelfBody(body, d);
  else if (d.type === "player") { if (fresh) { body.innerHTML = `<div class="center" id="center"></div>`; queueMicrotask(renderCenter); } }
  else if (fresh) mountModule(d.type, body);
  return sec;
}

function shelfBody(body: HTMLElement, d: ShelfDef) {
  const c = withFolderGaps(d, contentsOf(d));
  body.innerHTML = `
    ${d.kind === "search" ? `<input class="mod-search${d.searchAlign ? ` search-${d.searchAlign}` : ""}" id="q-${d.id}" type="search" placeholder="検索" autocomplete="off" value="${esc(d.query ?? "")}" aria-label="${esc(d.title)}の中を検索">` : ""}
    <div class="row"></div>`;
  const row = $(".row", body);
  // 次に再生の棚は、再生中を欄の左に置けるよう、欄を端に寄せきらない
  const pos = d.facePos ?? 0;
  fillRow(row, d.id, c, pos);
  const q = $<HTMLInputElement>(".mod-search", body);
  if (q) q.oninput = () => {
    d.query = q.value; saveMods();
    fillRow(row, d.id, withFolderGaps(d, contentsOf(d)), pos);
    const mq = document.getElementById("sm-query") as HTMLInputElement | null;
    if (mq && editing?.id === d.id) mq.value = q.value;
  };
  wireFaceMove(row, d);
  if (accepts(d.kind)) wireAlbumDrop(row, d);
}

// モジュールを足す: ヘッダーの「＋」から種類を選ぶ（メニューはボタンのすぐ下に開く）
function openAddMenu(anchor: HTMLElement) {
  closeAddMenu();
  const el = document.createElement("div");
  el.id = "add-menu"; el.className = "pop-menu"; el.setAttribute("role", "menu");
  el.innerHTML = MODULES.map(m => {
    const taken = m.single && modules.some(x => x.type === m.type);
    return `<button role="menuitem" data-type="${m.type}"${m.ready && !taken ? "" : " disabled"}><b>${t(m.label)}</b></button>`;
  }).join("") + `<hr><button role="menuitem" data-cat="pick"${albums.length ? "" : " disabled"}><b>ランダムで1枚</b></button><button role="menuitem" data-cat="wand"${coats.length ? "" : " disabled"}><b>${wandOn() ? "猫じゃらしをしまう" : "猫じゃらしで遊ぶ"}</b></button><button role="menuitem" data-cat="add"><b>${t("猫を呼ぶ")}</b></button><button role="menuitem" data-cat="remove"${coats.length ? "" : " disabled"}><b>${t("猫を帰す")}</b></button>`;
  el.onclick = e => {
    const cat = (e.target as HTMLElement).closest<HTMLElement>("[data-cat]:not([disabled])")?.dataset.cat;
    if (cat === "wand") { closeAddMenu(); toggleWand(); return; } // しまうときは Esc でも
    if (cat === "pick") {
      // 猫がいれば 1 枚くわえてきてもらう。いなければそのまま流す
      closeAddMenu();
      if (!catPicksAlbum()) { const a = albums[Math.floor(Math.random() * albums.length)]; if (a) play(a); }
      return;
    }
    if (cat) { if (cat === "add") { coats.push(randomCoat()); catVoice("meow"); } else coats.pop(); placeCats(true); closeAddMenu(); return; }
    const type = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-type]:not([disabled])")?.dataset.type as ModuleType | undefined;
    if (!type) return;
    closeAddMenu();
    const info = moduleInfo(type);
    const d: ModuleDef = type === "shelf"
      ? { id: newId(), type, kind: "manual", title: "新しい棚", w: 1 / 2, height: info.height, albums: [] }
      : { id: newId(), type, title: tr(info.label), w: 1, height: info.height };
    modules.push(d); addModule(home, d.id, info.height); saveMods(); saveHome(home); renderShelves();
    const t = document.querySelector<HTMLElement>(`.mod[data-id="${d.id}"] .mod-title`);
    if (t) { t.scrollIntoView({ block: "nearest" }); openModuleMenu(d, t); }
  };
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  const z = parseFloat(getComputedStyle(el).zoom) || 1; // 文字の大きさ（zoom）の分だけ位置を割り戻す
  el.style.right = `${Math.max(16, innerWidth - r.right) / z}px`;
  el.style.top = `${(r.bottom + 6) / z}px`;
  el.style.maxHeight = `${Math.max(160, innerHeight - r.bottom - 22) / z}px`; el.style.overflowY = "auto";
}
const closeAddMenu = () => document.getElementById("add-menu")?.remove();
addEventListener("pointerdown", e => { if (!(e.target as HTMLElement).closest("#add-menu, .add-mod")) closeAddMenu(); });

// モジュールの設定: 名前を押すと、そのすぐ下に小さく開く。位置・幅・高さはモジュールを直接動かして変える
function openModuleMenu(d: ModuleDef, anchor: HTMLElement) {
  closePop();
  editing = { id: d.id, anchor };
  renderModuleMenu();
  document.querySelectorAll(".mod-open").forEach(el => el.classList.remove("mod-open"));
  anchor.closest(".mod")?.classList.add("mod-open");
  $<HTMLInputElement>("#sm-title")?.focus();
}

function closeModuleMenu() {
  editing = undefined;
  document.getElementById("module-menu")?.remove();
  document.querySelectorAll(".mod-open").forEach(el => el.classList.remove("mod-open"));
}

function renderModuleMenu() {
  const d = editing && modules.find(m => m.id === editing!.id);
  if (!editing || !d || !editing.anchor.isConnected) { closeModuleMenu(); return; }
  let el = document.getElementById("module-menu");
  if (!el) { el = document.createElement("div"); el.id = "module-menu"; el.className = "module-menu"; document.body.append(el); }
  const opt = (v: string, label: string, sel: boolean) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
  const shelfFields = () => {
    if (!isShelf(d)) return "";
    const folders = [...new Set(albums.map(a => a.shelf))].sort(collator.compare);
    const artists = [...new Set(albums.map(a => a.artist).filter(Boolean))].sort(collator.compare);
    const targets: readonly string[] = d.kind === "folder" ? folders : d.kind === "artist" ? artists : d.kind === "mood" ? MOODS : [];
    return `
    <label>中身<select id="sm-kind">${KINDS.map(k => opt(k.kind, k.label, k.kind === d.kind)).join("")}</select></label>
    ${d.kind !== "queue" ? `<label class="sm-check"><input id="sm-folder-gaps" type="checkbox"${d.folderGaps ? " checked" : ""}>${libGroup() === "artist" ? "アーティスト" : "フォルダ"}ごとに隙間をあけて仕切る</label>` : ""}
    ${d.kind === "mood" ? `<label>気分<select id="sm-arg">${MOODS.map(t => opt(t, t, t === (d.arg ?? MOODS[0]))).join("")}</select></label>` : ""}
    ${d.kind === "folder" || d.kind === "artist" ? `<label>${d.kind === "folder" ? "フォルダ" : "アーティスト"}<select id="sm-arg"><option value="">—</option>${targets.map(t => opt(t, t, t === d.arg)).join("")}</select></label>` : ""}
    ${d.kind === "search" ? `
      <label>検索語<input id="sm-query" type="search" autocomplete="off" value="${esc(d.query ?? "")}"></label>
      <label>並び順<select id="sm-sort">${SORTS.map(o => opt(o.key, o.label, o.key === (d.sort ?? prefs().libSort))).join("")}</select></label>` : ""}
    <label>棚の素材（すべての棚）<select id="sm-skin">${SHELF_SKINS.map(k => opt(k.key, k.label, k.key === shelfSkin())).join("")}</select></label>`;
  };
  el.innerHTML = `
    <label>名前<input id="sm-title" value="${esc(d.title)}"></label>
    ${isShelf(d) && d.kind === "search" ? `<label>検索窓の位置<select id="sm-align">${opt("left", "左寄せ", d.searchAlign === "left")}${opt("center", "中央", d.searchAlign === "center")}${opt("right", "右寄せ", !d.searchAlign)}</select></label>` : ""}
    ${shelfFields()}
    ${d.type === "window" ? `<label>景色<select id="sm-scene">${WINDOW_SCENES.map(s => opt(s.key, s.label, s.key === windowScene())).join("")}</select></label>` : ""}
    ${d.type === "window" ? `<label class="sm-check"><input id="sm-rain" type="checkbox"${windowRain() ? " checked" : ""}>雨を降らせる</label>` : ""}
    ${d.type === "window" ? `<label class="sm-check"><input id="sm-room" type="checkbox"${roomLightOn() ? " checked" : ""}>部屋の明かりも時刻で変える</label>` : ""}
    ${d.type === "spectrum" ? (sp => `
      <label>並べ方<select id="sm-spec-shape">${opt("circle", "円", sp.shape === "circle")}${opt("line", "直線", sp.shape === "line")}</select></label>
      <label>形<select id="sm-spec-style">${opt("bars", "バー", sp.style === "bars")}${opt("wave", "波", sp.style === "wave")}</select></label>
      <label>向き<select id="sm-spec-dir">${(sp.shape === "circle" ? [["out", "外側"], ["in", "内側"], ["both", "両側"]] : [["out", "上"], ["in", "下"], ["both", "上下"]]).map(([v, l]) => opt(v, l, sp.dir === v)).join("")}</select></label>
      ${sp.shape === "circle" ? `<label>円の大きさ<input id="sm-spec-size" type="range" min="30" max="100" step="1" value="${Math.round(sp.size * 100)}"></label>` : ""}`)(spectrumPrefs()) : ""}
    ${d.type === "objects" ? `<fieldset class="sm-objects"><legend>置く小物</legend>${OBJECTS.map(o => `<label class="sm-check"><input type="checkbox" data-obj="${o.key}"${objectShown(o.key) ? " checked" : ""}>${o.label}</label>`).join("")}</fieldset>` : ""}
    <div class="sm-actions"><button class="sm-delete">ホームから外す</button><button class="sm-done">閉じる</button></div>`;
  const save = () => { saveMods(); renderShelves(); renderModuleMenu(); };
  const fallback = () => isShelf(d) ? kindLabel(d.kind) : moduleInfo(d.type).label;
  $<HTMLInputElement>("#sm-title", el).oninput = e => {
    d.title = (e.target as HTMLInputElement).value;
    const t = editing?.anchor; if (t) t.textContent = d.title;
  };
  $<HTMLInputElement>("#sm-title", el).onchange = e => { d.title = (e.target as HTMLInputElement).value.trim() || fallback(); save(); };
  $<HTMLInputElement>("#sm-title", el).onkeydown = e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); };
  if (isShelf(d)) {
    $<HTMLSelectElement>("#sm-kind", el).onchange = e => {
      d.kind = (e.target as HTMLSelectElement).value as ShelfKind;
      d.arg = undefined;
      if (d.kind === "manual") d.albums ??= [];
      if (KINDS.some(k => k.label === d.title) || d.title === "新しい棚") d.title = kindLabel(d.kind);
      save();
    };
    const arg = $<HTMLSelectElement>("#sm-arg", el);
    if (arg) arg.onchange = () => { d.arg = arg.value || undefined; if (d.arg && (KINDS.some(k => k.label === d.title) || d.title === "新しい棚")) d.title = d.arg; save(); };
    const mq = $<HTMLInputElement>("#sm-query", el);
    if (mq) mq.oninput = () => {
      const inline = document.getElementById(`q-${d.id}`) as HTMLInputElement | null;
      if (inline) { inline.value = mq.value; inline.dispatchEvent(new Event("input")); }
    };
    const be = $<HTMLInputElement>("#sm-folder-gaps", el);
    if (be) be.onchange = () => { d.folderGaps = be.checked || undefined; save(); };
    const al = $<HTMLSelectElement>("#sm-align", el);
    if (al) al.onchange = () => { d.searchAlign = al.value === "left" || al.value === "center" ? al.value : undefined; save(); };
    const ms = $<HTMLSelectElement>("#sm-sort", el);
    if (ms) ms.onchange = () => { d.sort = ms.value as SortKey; save(); };
    const sk = $<HTMLSelectElement>("#sm-skin", el);
    sk.onchange = () => setShelfSkin(sk.value);
  }
  const rainBox = el.querySelector<HTMLInputElement>("#sm-rain");
  if (rainBox) rainBox.onchange = () => setWindowRain(rainBox.checked);
  for (const key of ["shape", "style", "dir"] as const) {
    const sel = el.querySelector<HTMLSelectElement>(`#sm-spec-${key}`);
    if (sel) sel.onchange = () => { setSpectrumPrefs({ [key]: sel.value } as Partial<SpectrumPrefs>); if (key === "shape") renderModuleMenu(); };
  }
  const specSize = el.querySelector<HTMLInputElement>("#sm-spec-size");
  if (specSize) specSize.oninput = () => setSpectrumPrefs({ size: Number(specSize.value) / 100 });
  const sceneSel = el.querySelector<HTMLSelectElement>("#sm-scene");
  if (sceneSel) sceneSel.onchange = () => setWindowScene(sceneSel.value);
  const roomBox = el.querySelector<HTMLInputElement>("#sm-room");
  if (roomBox) roomBox.onchange = () => setRoomLight(roomBox.checked);
  el.querySelectorAll<HTMLInputElement>("[data-obj]").forEach(cb => cb.onchange = () => setObjectShown(cb.dataset.obj!, cb.checked));
  $(".sm-delete", el).onclick = () => { modules = modules.filter(m => m !== d); removeModule(home, d.id); kept.delete(d.id); closeModuleMenu(); saveMods(); saveHome(home); renderShelves(); };
  $(".sm-done", el).onclick = closeModuleMenu;
  const r = editing.anchor.getBoundingClientRect();
  el.style.left = `${Math.max(16, Math.min(r.left - 8, innerWidth - el.offsetWidth - 16))}px`;
  el.style.top = `${Math.max(16, Math.min(r.bottom + 6, innerHeight - el.offsetHeight - 16))}px`;
}

addEventListener("pointerdown", e => {
  if (!editing) return;
  if ((e.target as HTMLElement).closest("#module-menu, .mod-title")) return;
  closeModuleMenu();
});
addEventListener("keydown", e => { if (e.key === "Escape" && editing) closeModuleMenu(); });

// 右端で幅、下端で高さを自由に変える（幅はよく使う比率の近くでだけ軽く吸い付く）
// 境目をドラッグして大きさを変える: 列の間 → 幅、重ねたモジュールの間 → 高さの配分、段の下 → 段の高さ
function wireSplits(grid: HTMLElement) {
  grid.addEventListener("pointerdown", e => {
    const sp = (e.target as HTMLElement).closest<HTMLElement>(".split");
    if (!sp || e.button !== 0) return;
    e.preventDefault();
    sp.setPointerCapture(e.pointerId);
    const ri = Number(sp.dataset.ri), ci = Number(sp.dataset.ci), ki = Number(sp.dataset.ki);
    const row = home.rows[ri], rowEl = grid.querySelector<HTMLElement>(`.lrow[data-ri="${ri}"]`)!;
    const label = document.createElement("span");
    label.className = "split-label"; document.body.append(label);
    sp.classList.add("split-active");
    const show = (text: string, ev: PointerEvent) => { label.textContent = text; label.style.left = `${ev.clientX + 14}px`; label.style.top = `${ev.clientY + 14}px`; };
    const move = (ev: PointerEvent) => {
      if (sp.classList.contains("split-row")) {
        const minH = Math.max(...row.cols.map(c => c.stack.reduce((n, k) => n + moduleInfo(modules.find(m => m.id === k.id)!.type).minHeight, 0)));
        row.height = Math.round(Math.max(minH, Math.min(1400, ev.clientY - rowEl.getBoundingClientRect().top)));
        rowEl.style.height = `${row.height}px`;
        show(`高さ ${row.height}px`, ev);
      } else if (sp.classList.contains("split-v")) {
        // 段の幅に対する境目の位置で、よく使う比率（1/4・1/3・1/2…）に軽く吸い付く
        const a = row.cols[ci - 1], b = row.cols[ci], rr = rowEl.getBoundingClientRect();
        const before = row.cols.slice(0, ci - 1).reduce((n, c) => n + c.w, 0), pair = a.w + b.w;
        let at = (ev.clientX - rr.left) / rr.width;
        at = snapRatio(at);
        const aw = Math.max(MIN_COL, Math.min(pair - MIN_COL, at - before));
        a.w = aw; b.w = pair - aw;
        const cols = rowEl.querySelectorAll<HTMLElement>(":scope > .lcol");
        cols[ci - 1].style.flex = `${a.w} 1 0px`; cols[ci].style.flex = `${b.w} 1 0px`;
        show(`${ratioLabel(Math.round(a.w * 1000) / 1000)} ｜ ${ratioLabel(Math.round(b.w * 1000) / 1000)}`, ev);
      } else {
        const col = row.cols[ci], a = col.stack[ki - 1], b = col.stack[ki];
        const colEl = rowEl.querySelectorAll<HTMLElement>(":scope > .lcol")[ci], cr = colEl.getBoundingClientRect();
        const before = col.stack.slice(0, ki - 1).reduce((n, k) => n + k.h, 0), pair = a.h + b.h;
        const ah = Math.max(MIN_STACK, Math.min(pair - MIN_STACK, (ev.clientY - cr.top) / cr.height - before));
        a.h = ah; b.h = pair - ah;
        const secs = colEl.querySelectorAll<HTMLElement>(":scope > .mod");
        secs[ki - 1].style.flex = `${a.h} 1 0px`; secs[ki].style.flex = `${b.h} 1 0px`;
        show(`${Math.round(a.h * 100)}% ｜ ${Math.round(b.h * 100)}%`, ev);
      }
    };
    const up = () => {
      sp.removeEventListener("pointermove", move);
      sp.classList.remove("split-active"); label.remove();
      saveHome(home); renderShelves();
    };
    sp.addEventListener("pointermove", move);
    sp.addEventListener("pointerup", up, { once: true });
    sp.addEventListener("pointercancel", up, { once: true });
  });
}

// 名前の札をドラッグしてモジュールを動かす。落とせる場所は青い枠で先に見せる
let justDragged = false;
function wireModuleDrag(sec: HTMLElement, d: ModuleDef) {
  const head = $(".mod-head", sec);
  head.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY;
    let dragging = false, target: { drop: Drop; rect: DOMRect | { left: number; top: number; width: number; height: number } } | undefined;
    const hint = document.createElement("div"); hint.className = "drop-hint";
    const ghost = document.createElement("div"); ghost.className = "drag-ghost"; ghost.textContent = d.title;
    const move = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        dragging = true; closeModuleMenu(); closePop();
        sec.classList.add("mod-dragging"); document.body.classList.add("arranging");
        document.body.append(hint, ghost);
      }
      ghost.style.left = `${ev.clientX + 12}px`; ghost.style.top = `${ev.clientY + 12}px`;
      target = dropTarget(ev.clientX, ev.clientY, d.id);
      hint.hidden = !target;
      if (target) Object.assign(hint.style, { left: `${target.rect.left}px`, top: `${target.rect.top}px`, width: `${target.rect.width}px`, height: `${target.rect.height}px` });
    };
    const end = (commit: boolean) => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", onUp);
      removeEventListener("keydown", onKey);
      hint.remove(); ghost.remove();
      sec.classList.remove("mod-dragging"); document.body.classList.remove("arranging");
      if (!dragging) return;
      justDragged = true; setTimeout(() => { justDragged = false; }, 0);
      if (commit && target) { place(home, d.id, target.drop, d.height || moduleInfo(d.type).height); saveHome(home); renderShelves(); }
    };
    const onUp = () => end(true);
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") end(false); };
    addEventListener("pointermove", move);
    addEventListener("pointerup", onUp);
    addEventListener("keydown", onKey);
  });
}

// ポインタの下で、どこに落とすか: 他のモジュールの端の近く → その側に並べる / 真ん中 → 入れ替え / 段の間・余白 → 新しい段
function dropTarget(x: number, y: number, self: string) {
  const grid = $(".grid"), g = grid.getBoundingClientRect();
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const mod = el?.closest<HTMLElement>(".grid .mod");
  if (mod && mod.dataset.id !== self) {
    const r = mod.getBoundingClientRect(), fx = (x - r.left) / r.width, fy = (y - r.top) / r.height;
    const edges = { left: fx, right: 1 - fx, top: fy, bottom: 1 - fy };
    const [side, dist] = Object.entries(edges).sort((a, b) => a[1] - b[1])[0] as ["left" | "right" | "top" | "bottom", number];
    if (dist > 0.25) return { drop: { kind: "swap", target: mod.dataset.id! } as Drop, rect: r };
    const half = side === "left" ? { left: r.left, top: r.top, width: r.width / 2, height: r.height }
      : side === "right" ? { left: r.left + r.width / 2, top: r.top, width: r.width / 2, height: r.height }
      : side === "top" ? { left: r.left, top: r.top, width: r.width, height: r.height / 2 }
      : { left: r.left, top: r.top + r.height / 2, width: r.width, height: r.height / 2 };
    return { drop: { kind: "side", target: mod.dataset.id!, side } as Drop, rect: half };
  }
  if (mod) return undefined; // 自分の上
  if (x < g.left || x > g.right) return undefined;
  // 段と段の間（または上下の余白）: その位置に新しい段
  const rows = [...grid.querySelectorAll<HTMLElement>(":scope > .lrow")];
  let index = rows.length;
  for (const [i, r] of rows.entries()) { const b = r.getBoundingClientRect(); if (y < b.top + b.height / 2) { index = i; break; } }
  const edge = index < rows.length ? rows[index].getBoundingClientRect().top - 9 : (rows.at(-1)?.getBoundingClientRect().bottom ?? g.top) + 9;
  return { drop: { kind: "row", index } as Drop, rect: { left: g.left, top: edge - 3, width: g.width, height: 6 } };
}

// 面陳の欄を同じ棚の中でドラッグすると、落とした位置に欄を置き直す（端の近くでは端に吸い付く）
function wireFaceMove(row: HTMLElement, d: ShelfDef) {
  const type = DND_FACE + d.id;
  const posAt = (x: number) => {
    const r = row.getBoundingClientRect(), fw = row.querySelector<HTMLElement>(".face")?.offsetWidth ?? 0;
    const p = (x - r.left - fw / 2) / Math.max(1, r.width - fw);
    return p < 0.04 ? 0 : p > 0.96 ? 1 : Math.round(p * 1000) / 1000;
  };
  row.addEventListener("dragover", e => {
    if (!e.dataTransfer!.types.includes(type)) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
    row.style.setProperty("--drop-x", `${e.clientX - row.getBoundingClientRect().left}px`);
    row.classList.add("face-drop");
  });
  row.addEventListener("dragleave", e => { if (!row.contains(e.relatedTarget as Node)) row.classList.remove("face-drop"); });
  row.addEventListener("drop", e => {
    if (!e.dataTransfer!.types.includes(type)) return;
    e.preventDefault(); e.stopPropagation();
    row.classList.remove("face-drop");
    d.facePos = posAt(e.clientX);
    saveMods(); renderShelves();
  });
}

// アルバムを落とした位置（左右どちらの隙間か）から、入れる場所を決める
function dropIndex(row: HTMLElement, d: ShelfDef, x: number, target: EventTarget | null) {
  const pane = (target as HTMLElement | null)?.closest?.(".spines") ?? row.querySelector(".spines") ?? row;
  const items = [...pane.querySelectorAll<HTMLElement>(".spine[data-key]")];
  const i = items.findIndex(el => { const r = el.getBoundingClientRect(); return x < r.left + r.width / 2; });
  return { items, index: i < 0 ? items.length : i };
}

function wireAlbumDrop(row: HTMLElement, d: ShelfDef) {
  const clear = () => row.querySelectorAll(".drop-before, .drop-after").forEach(el => el.classList.remove("drop-before", "drop-after"));
  const own = DND_FACE + d.id;
  row.addEventListener("dragover", e => {
    if (!e.dataTransfer!.types.includes(DND_ALBUM) || e.dataTransfer!.types.includes(own)) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = "copy";
    clear();
    row.classList.add("drop-target");
    const { items, index } = dropIndex(row, d, e.clientX, e.target);
    if (items[index]) items[index].classList.add("drop-before");
    else items.at(-1)?.classList.add("drop-after");
  });
  row.addEventListener("dragleave", e => { if (!row.contains(e.relatedTarget as Node)) { clear(); row.classList.remove("drop-target"); } });
  row.addEventListener("drop", e => {
    const key = e.dataTransfer!.getData(DND_ALBUM);
    clear(); row.classList.remove("drop-target");
    if (!key || e.dataTransfer!.types.includes(own)) return;
    e.preventDefault();
    // 選んだものをまとめて運んできたら、並びを保ったまま落としたところへ入れる
    let keys = [key];
    try { const many = e.dataTransfer!.getData(DND_MANY); if (many) keys = (JSON.parse(many) as string[]).filter(k => byKey(k)); } catch { /* 1 枚だけ */ }
    let at = dropIndex(row, d, e.clientX, e.target).index;
    const list = d.kind === "queue" ? queue : (d.albums ??= []);
    for (const k of keys) { insertInto(d, k, at); at = list.indexOf(k) + 1; }
    if (keys.length > 1) clearSelection();
    renderShelves();
  });
}

// 次に再生の外に落とされたら、キューから外して棚に戻す（他の棚に落とした場合は、その棚に入れたうえで外す）
const overQueue = (t: EventTarget | null) => {
  const id = (t as HTMLElement | null)?.closest?.<HTMLElement>(".mod")?.dataset.id;
  return !!id && shelfById(id)?.kind === "queue";
};
document.addEventListener("dragover", e => {
  if (!e.dataTransfer?.types.includes(DND_RETURN)) return;
  const out = !overQueue(e.target);
  document.body.classList.toggle("return-out", out);
  if (out && !e.defaultPrevented) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
});
document.addEventListener("drop", e => {
  if (!e.dataTransfer?.types.includes(DND_RETURN) || overQueue(e.target)) return;
  e.preventDefault();
  document.body.classList.remove("return-out");
  const key = e.dataTransfer.getData(DND_RETURN), i = queue.indexOf(key);
  if (i >= 0) { queue.splice(i, 1); renderShelves(); }
});

// 箱を段に割り付ける: いったん折り返しで並べて、同じ高さに来た箱ごとに1段（棚板つき）にまとめる
let libResize = () => {};
const libWatch = new ResizeObserver(() => libResize());
function shelveBoxes(kase: HTMLElement, boxes: HTMLElement[]) {
  kase.innerHTML = "";
  const flow = document.createElement("div");
  flow.className = "packed packed-measure";
  flow.append(...boxes);
  kase.append(flow);
  const lines: HTMLElement[][] = [];
  let top = -Infinity;
  for (const b of boxes) {
    if (b.offsetTop > top + 2) { lines.push([]); top = b.offsetTop; }
    lines[lines.length - 1].push(b);
  }
  // 段の右に空きを残さない: 段に収まった箱を、もとの幅に比例して右端まで広げる（背表紙は左に寄せたまま）
  const natural = new Map(boxes.map(b => [b, b.getBoundingClientRect().width]));
  kase.innerHTML = "";
  for (const line of lines) {
    const s = document.createElement("div");
    s.className = "shelf";
    const p = document.createElement("div");
    p.className = "packed";
    for (const b of line) b.style.flexGrow = String(Math.max(1, Math.round(natural.get(b)!)));
    p.append(...line);
    s.append(p);
    kase.append(s);
  }
}

let libQuery = "";
// 外したアルバムの一覧（ライブラリの一番下。たたんでおく）
let hiddenOpen = false;
function hiddenList() {
  const list = allAlbums.filter(a => hidden.has(a.key)).sort((x, y) => collator.compare(x.shelf + x.title, y.shelf + y.title));
  if (!list.length) return "";
  return `<details class="lib-hidden"${hiddenOpen ? " open" : ""}><summary>外したアルバム <span class="count">${list.length}</span></summary>
    <ul>${list.map(a => `<li><span class="t">${esc(a.title)}</span><span class="d">${esc(a.shelf)}</span><button data-k="${esc(a.key)}">戻す</button></li>`).join("")}</ul>
    ${list.length > 1 ? `<button class="lib-hidden-all">すべて戻す</button>` : ""}</details>`;
}
function renderLibrary() {
  const v = $("#view-library");
  if (!albums.length) { v.innerHTML = ""; return; }
  const byArtist = libGroup() === "artist", what = byArtist ? "アーティスト" : "フォルダ";
  v.innerHTML = `<div class="lib"><nav class="side" aria-label="${what}"><h2>${what}</h2></nav><div class="lib-shelves">
    <div class="lib-bar"><div class="lib-group" role="group" aria-label="${t("括り方")}">
      <button data-g="folder" aria-pressed="${!byArtist}">${t("フォルダ")}</button><button data-g="artist" aria-pressed="${byArtist}">${t("アーティスト")}</button></div><input class="mod-search lib-search" id="lib-q" type="search" placeholder="検索" autocomplete="off" aria-label="ライブラリを検索" value="${esc(libQuery)}"></div>
    <div class="case"></div>${hiddenList()}</div></div>`;
  const side = $(".side", v), kase = $(".case", v);
  $<HTMLInputElement>("#lib-q", v).oninput = e => { libQuery = (e.target as HTMLInputElement).value; keepScroll(renderLibrary); };
  v.querySelectorAll<HTMLButtonElement>(".lib-group button").forEach(b => b.onclick = () => {
    if (b.dataset.g === libGroup()) return;
    setLibGroup(b.dataset.g as LibGroup); // 棚とライブラリの描き直しは "kona:prefs" で
    $(".lib-shelves")?.scrollTo({ top: 0 });
    $<HTMLButtonElement>(`.lib-group [data-g="${libGroup()}"]`)?.focus();
  });
  const hl = v.querySelector<HTMLDetailsElement>(".lib-hidden");
  if (hl) {
    hl.ontoggle = () => { hiddenOpen = hl.open; };
    hl.onclick = e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!b) return;
      setHidden(b.dataset.k ? [b.dataset.k] : allAlbums.filter(a => hidden.has(a.key)).map(a => a.key), false);
    };
  }

  // 検索語があれば、当てはまるアルバムだけを残す（当てはまらないフォルダは箱ごと出さない）
  // アーティストごとのときは、タグのアルバムアーティスト（なければアーティスト）でまとめる
  const groups = new Map<string, Album[]>();
  const sorted = groupAlbums(sortAlbums(albums.filter(a => matches(a, libQuery)), prefs().libSort));
  sorted.forEach(([k, list]) => groups.set(k, list));
  const names = sorted.map(([k]) => k);
  const label = (name: string, n: number) => `<b>${esc(name)}</b><span class="count">${n}</span>`;
  const faceOf = (list: Album[]) => {
    const r = [...list].sort((x, y) => stat(y.key).last - stat(x.key).last)[0];
    return stat(r.key).last ? new Map([[r, "最近聴いた"]]) : new Map<Album, string>();
  };
  const id = (name: string) => "shelf-" + (byArtist ? "a" : "") + hashOf(name);

  // フォルダの大きさに関係なく、フォルダごとの箱を左から詰めて並べ、入りきらなければ次の段へ
  const boxes = names.map(name => {
    const list = groups.get(name)!;
    const box = document.createElement("div");
    box.className = "box"; box.id = id(name);
    box.innerHTML = `<div class="shelf-label">${label(name, list.length)}<button class="box-hide" aria-label="${esc(name)} をライブラリから外す" title="${byArtist ? "まとめて外す" : "フォルダごと外す"}">${ICON.close}</button></div><div class="row"></div>`;
    $(".box-hide", box).onclick = () => setHidden(list.map(a => a.key), true);
    fillRow($(".row", box), id(name), { list, faces: faceOf(list) });
    return box;
  });
  shelveBoxes(kase, boxes);
  libWatch.disconnect();
  let lastW = kase.clientWidth;
  libWatch.observe(kase);
  libResize = () => { if (Math.abs(kase.clientWidth - lastW) > 1) { lastW = kase.clientWidth; shelveBoxes(kase, boxes); } };
  for (const name of names) {
    const b = document.createElement("button");
    b.innerHTML = `<span>${esc(name)}</span><span class="n">${groups.get(name)!.length}</span>`;
    b.onclick = () => document.getElementById(id(name))?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    side.append(b);
  }
}

function renderHomeFrame() {
  $("#view-home").innerHTML = `<div class="home"><div class="grid"></div></div>`;
  const add = $<HTMLButtonElement>("#add-mod"); // ヘッダーの「＋」
  add.onclick = () => document.getElementById("add-menu") ? closeAddMenu() : openAddMenu(add);
  wireSplits($(".grid"));
}

function renderCenter() {
  const center = $("#center");
  if (!center) return;
  const a = player.album;
  const build = () => {
    if (!a) center.innerHTML = "";
    else center.innerHTML = `<div class="jacket${(a.ratio ?? 1) < 1 ? " tall" : ""}" style="--ar:${a.ratio ?? 1}">${art(a)}</div><div class="np np-host"></div>`;
    renderNP();
  };
  // アルバムが替わったときは、ジャケットごと薄く消えてから現れる
  const k = a?.key ?? "", was = center.dataset.k;
  center.dataset.k = k;
  if (was !== undefined && was !== k) fadeSwap(center, build); else build();
}

// ---------- 再生中バー ----------
// ---------- 速さとピッチ: 再生バーの小さな札から。ふだんは「1×」を薄く出すだけ ----------
const speedLabel = () => {
  const { rate, pitch } = player.speed;
  return `${+rate.toFixed(2)}×${pitch ? ` ${pitch > 0 ? "+" : "−"}${Math.abs(pitch)}` : ""}`;
};
const speedButton = () => {
  const { rate, pitch } = player.speed, changed = rate !== 1 || pitch !== 0;
  return `<button class="b-speed${changed ? " on" : ""}" aria-label="速さとピッチ（いま ${speedLabel()}）" title="速さとピッチ">${speedLabel()}</button>`;
};
function openSpeed(anchor: HTMLElement) {
  closeSpeed();
  const el = document.createElement("div");
  el.id = "speed-pop"; el.className = "pop-menu speed-pop";
  const paint = () => {
    const { rate, pitch } = player.speed;
    $(".sp-rate-v", el).textContent = `${rate.toFixed(2)}×`;
    $(".sp-pitch-v", el).textContent = pitch ? `${pitch > 0 ? "+" : "−"}${Math.abs(pitch)} 半音` : "0 半音";
    $<HTMLInputElement>(".sp-rate", el).value = String(rate);
    $<HTMLInputElement>(".sp-pitch", el).value = String(pitch);
  };
  el.innerHTML = `<label class="sp-row"><span>速さ</span><b class="sp-rate-v"></b>
      <input class="sp-rate" type="range" min="${RATE_MIN}" max="${RATE_MAX}" step="0.05" aria-label="速さ（音程は変えない）"></label>
    <label class="sp-row"><span>ピッチ</span><b class="sp-pitch-v"></b>
      <input class="sp-pitch" type="range" min="${-PITCH_MAX}" max="${PITCH_MAX}" step="1" aria-label="ピッチ（速さは変えない）"></label>
    <button class="sp-reset"><b>もとに戻す</b></button>`;
  const rate = $<HTMLInputElement>(".sp-rate", el), pitch = $<HTMLInputElement>(".sp-pitch", el);
  rate.oninput = () => { player.setSpeed({ rate: Number(rate.value) }); paint(); };
  pitch.oninput = () => { player.setSpeed({ pitch: Number(pitch.value) }); paint(); };
  // ダブルクリックでそのつまみだけ戻す
  rate.ondblclick = () => { player.setSpeed({ rate: 1 }); paint(); };
  pitch.ondblclick = () => { player.setSpeed({ pitch: 0 }); paint(); };
  $(".sp-reset", el).onclick = () => { player.setSpeed({ rate: 1, pitch: 0 }); paint(); };
  document.body.append(el);
  paint();
  const r = anchor.getBoundingClientRect();
  el.style.right = `${Math.max(16, innerWidth - r.right)}px`;
  el.style.bottom = `${innerHeight - r.top + 8}px`;
  rate.focus();
}
const closeSpeed = () => document.getElementById("speed-pop")?.remove();
addEventListener("pointerdown", e => { if (!(e.target as HTMLElement).closest("#speed-pop, .b-speed")) closeSpeed(); });
addEventListener("keydown", e => { if (e.key === "Escape") closeSpeed(); });

const modeButton = () => modeButtonHTML(player.mode, "b-mode");

const ICON = {
  receipt: '<svg viewBox="0 0 16 16"><path fill-rule="evenodd" d="M3 1h10v14l-1.66-1.2L9.66 15 8 13.8 6.34 15l-1.68-1.2L3 15zm2 3v1.2h6V4zm0 2.8V8h6V6.8zm0 2.8v1.2h4V9.6z"/></svg>',
  prev: '<svg viewBox="0 0 16 16"><path d="M3 2h2v12H3zM14 2v12L6 8z"/></svg>',
  next: '<svg viewBox="0 0 16 16"><path d="M11 2h2v12h-2zM2 2v12l8-6z"/></svg>',
  play: '<svg viewBox="0 0 16 16"><path d="M4 2v12l10-6z"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><path d="M3 2h4v12H3zM9 2h4v12H9z"/></svg>',
  vol: '<svg viewBox="0 0 16 16"><path d="M2 6h3l4-3v10L5 10H2z"/><path d="M11 5.2a4 4 0 0 1 0 5.6l-.9-.9a2.7 2.7 0 0 0 0-3.8zM12.8 3.4a6.5 6.5 0 0 1 0 9.2l-.9-.9a5.2 5.2 0 0 0 0-7.4z"/></svg>',
  mute: '<svg viewBox="0 0 16 16"><path d="M2 6h3l4-3v10L5 10H2z"/><path d="M11 5.5l1 -1 1.5 1.5 1.5-1.5 1 1L14.5 7l1.5 1.5-1 1-1.5-1.5L12 9.5l-1-1L12.5 7z"/></svg>',
  plus: '<svg viewBox="0 0 16 16"><path d="M7 2h2v5h5v2H9v5H7V9H2V7h5z"/></svg>',
  grip: '<svg viewBox="0 0 10 14"><circle cx="2.5" cy="2" r="1.3"/><circle cx="7.5" cy="2" r="1.3"/><circle cx="2.5" cy="7" r="1.3"/><circle cx="7.5" cy="7" r="1.3"/><circle cx="2.5" cy="12" r="1.3"/><circle cx="7.5" cy="12" r="1.3"/></svg>',
  close: '<svg viewBox="0 0 16 16"><path d="M3.5 2.1 8 6.6l4.5-4.5 1.4 1.4L9.4 8l4.5 4.5-1.4 1.4L8 9.4l-4.5 4.5-1.4-1.4L6.6 8 2.1 3.5z"/></svg>',
};

// 再生中のアルバム情報と曲目。ホームの中央と、ライブラリ画面の下部の両方に描く
function renderNP() {
  document.querySelectorAll<HTMLElement>(".np-host").forEach(np => {
    const a = player.album, t = player.track;
    if (np.closest(".swap-out")) return; // 差し替えの途中。現れるときに描く
    if (!a || !t) { np.innerHTML = ""; delete np.dataset.k; return; }
    // アルバムが替わったら全体を、曲だけなら曲名の欄を、フェードで差し替える
    const prevAlbum = np.dataset.k?.split("#")[0], prevKey = np.dataset.k, k = `${a.key}#${player.index}`;
    np.dataset.k = k;
    if (prevAlbum !== undefined && prevAlbum !== a.key && np.childElementCount) { fadeSwap(np, renderNP); return; }
    if (prevKey !== undefined && prevKey !== k) np.dataset.swapAt = String(performance.now());
    const meta = [a.artist, a.year, a.genre].filter(Boolean).map(x => esc(String(x))).join(" · ");
    // ライブラリ画面の下の再生バーには、ジャケットも出す（ホームは再生中モジュールが出す）
    np.innerHTML = `${np.classList.contains("np-footer") ? `<div class="np-art${(a.ratio ?? 1) < 1 ? " tall" : ""}" style="--ar:${a.ratio ?? 1}">${art(a)}</div>` : ""}
      <div class="np-main">
        <div class="np-meta">
          <div class="np-album">${esc(a.title)}</div>
          <div class="np-sub">${meta}</div>
          <div class="np-title"><span class="np-no">${String(t.no).padStart(2, "0")} / ${a.tracks.length}</span>${esc(t.title)}</div>
        </div>
        <div class="np-bar"><span class="np-pos">0:00</span><div class="np-track"><div class="np-fill"></div></div><span class="np-dur">0:00</span></div>
        <div class="np-row">
          <div class="np-ctrl">
            <button class="b-prev" aria-label="前の曲">${ICON.prev}</button>
            <button class="b-play play" aria-label="${player.playing ? "一時停止" : "再生"}">${player.playing ? ICON.pause : ICON.play}</button>
            <button class="b-next" aria-label="次の曲">${ICON.next}</button>
            ${modeButton()}
          </div>
          <div class="np-vol">
            <button class="b-receipt" aria-label="レシートにする" title="レシートにする">${ICON.receipt}</button>
            ${speedButton()}
            <button class="b-mute" aria-label="${player.isMuted ? "消音を解除" : "消音"}">${player.isMuted ? ICON.mute : ICON.vol}</button>
            <input class="np-vol-range" type="range" min="0" max="100" step="1" value="${Math.round(player.volume * 100)}" aria-label="音量">
          </div>
        </div>
      </div>
      <ol class="tracks np-tracks" aria-label="曲目">${a.tracks.map((tr, i) => `
        <li class="${i === player.index ? "current" : ""}"><button data-i="${i}">
          <span class="no">${String(tr.no).padStart(2, "0")}</span><span class="t">${esc(tr.title)}</span><span class="dur">${tr.duration ? fmt(tr.duration) : ""}</span>
        </button></li>`).join("")}</ol>`;
    // 曲名の欄は描き直されても、フェードの途中から続ける
    const since = performance.now() - Number(np.dataset.swapAt ?? -1e9);
    if (since < 500) { const m = $(".np-meta", np); m.style.animationDelay = `${-since}ms`; m.classList.add("swap-in"); }
    $(".np-tracks", np).onclick = e => {
      const i = (e.target as HTMLElement).closest<HTMLElement>("[data-i]")?.dataset.i;
      if (i !== undefined) player.playAlbum(a, Number(i));
    };
    const cur = $(".np-tracks .current", np);
    if (cur) { const list = cur.closest<HTMLElement>(".np-tracks")!; list.scrollLeft = cur.offsetLeft - list.offsetLeft - 20; }
    const range = $<HTMLInputElement>(".np-vol-range", np);
    const paint = () => document.querySelectorAll<HTMLElement>(".np-vol").forEach(v => {
      const r = $<HTMLInputElement>(".np-vol-range", v), m = $(".b-mute", v);
      if (r !== range || document.activeElement !== r) r.value = String(Math.round(player.volume * 100));
      r.style.setProperty("--fill", `${player.isMuted ? 0 : player.volume * 100}%`);
      m.innerHTML = player.isMuted ? ICON.mute : ICON.vol;
      m.setAttribute("aria-label", player.isMuted ? "消音を解除" : "消音");
    });
    range.oninput = () => { player.setVolume(Number(range.value) / 100); paint(); };
    $(".b-mute", np).onclick = () => { player.toggleMute(); paint(); };
    paint();
    $(".b-prev", np).onclick = () => player.prev();
    $(".b-play", np).onclick = () => player.toggle();
    $(".b-next", np).onclick = () => player.next();
    $(".b-mode", np).onclick = () => player.cycleMode();   // 描き直しは player.on から
    $(".b-receipt", np).onclick = () => openReceipt(() => ({ album: player.album, index: player.index, position: player.position }));
    $(".b-speed", np).onclick = e => document.getElementById("speed-pop") ? closeSpeed() : openSpeed(e.currentTarget as HTMLElement);
    $(".np-track", np).onclick = e => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      player.seek((e.clientX - r.left) / r.width);
    };
  });
  tick();
}

function tick() {
  document.querySelectorAll<HTMLElement>(".np-host").forEach(np => {
    const p = $(".np-pos", np);
    if (!p) return;
    p.textContent = fmt(player.position);
    $(".np-dur", np).textContent = fmt(player.duration);
    $(".np-fill", np).style.width = player.duration ? `${player.position / player.duration * 100}%` : "0";
  });
}
setInterval(tick, 500);

// ---------- 再生 ----------
/** index を省くとアルバムの頭から（シャッフル中は、ばらばらの順の 1 曲目から） */
async function play(a: Album, index?: number) {
  await enrichTracks(a);
  // どの棚から選んでも、再生中が切り替わるだけ。「次に再生」の中身は変えない
  if (a !== player.album) {
    startRitual(a);
    recordPlay(a.key);
    const ev = logPlay(a.key);
    if (modules.some(m => m.type === "map")) recordPlace(ev);
  }
  await player.playAlbum(a, index);
}

// 聴きはじめの儀式: 選んだ背表紙（見えていなければ同じアルバムの見えている背表紙・面陳）を棚から抜き出し、再生中の欄へ運ぶ
function startRitual(a: Album) {
  if (document.visibilityState !== "visible" || mobileActive() || document.body.dataset.state !== "ready") return;
  const seen = (el?: Element | null): el is HTMLElement => {
    if (!(el instanceof HTMLElement) || !el.isConnected || el.closest("[hidden]")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  const view = $(location.hash === "#library" ? "#view-library" : "#view-home");
  const mine = pop?.key === a.key, sp = visibleSpine(view, a.key);
  const src = [mine ? pop!.anchor : undefined, sp && seenInPane(sp) ? sp : undefined,
    view.querySelector(`.face[data-key="${CSS.escape(a.key)}"]`), mine ? document.querySelector("#pop .opened-cover") : undefined].find(seen);
  if (!src) return;
  ritual({ key: a.key, src, cover: a.cover, color: a.color ?? fallbackColor(a), ratio: a.ratio ?? 1 },
    () => [...document.querySelectorAll<HTMLElement>("#center .jacket > :is(.art, .art-blank), .np-footer .np-art > :is(.art, .art-blank)")].find(el => seen(el)));
}
// 背表紙が棚の窓の中で見えているか（窓の外へ流れている背表紙からは抜き出さない）
function seenInPane(el: HTMLElement) {
  const r = el.getBoundingClientRect(), p = (el.parentElement ?? el).getBoundingClientRect();
  return r.right > p.left + 2 && r.left < p.right - 2;
}

// ダブルクリック: その場で再生を切り替える
async function interrupt(a: Album) {
  closePop();
  await play(a);
}

// 今のアルバムが終わったときに切り替わる先: 「次に再生」の中から選んで聴いていればその次、そうでなければ先頭
const lastUpNext = new Map<string, string | undefined>();
function upNext() {
  const i = player.album ? queue.indexOf(player.album.key) : -1;
  const key = i >= 0 ? queue[i + 1] : queue[0];
  return key ? byKey(key) : undefined;
}

// アルバムを最後まで聴いたら、聴き終えた分を「次に再生」から外して次へ切り替える
// アルバムの境目でも間を空けないよう、切り替わる先の 1 曲目を先に読み込ませる
player.nextAlbum = () => upNext();
player.onTrackError = (_a, t) => toast(`「${t.title}」は再生できないので飛ばしました`);
// アルバムリピート中も、スリープタイマー「アルバムの終わり」では止める
player.onAlbumLoop = () => !stopAtAlbumEnd();
player.onAlbumEnd = () => {
  if (stopAtAlbumEnd()) { renderShelves(); return; } // スリープタイマー「アルバムの終わり」
  const next = upNext();
  const done = player.album ? queue.indexOf(player.album.key) : -1;
  if (done >= 0) queue.splice(done, 1);
  if (next) play(next);
  else renderShelves();
};

let lastAlbum: Album | undefined, lastIndex = -1;
player.on(() => {
  setCatsMusic(player.playing);
  const changed = player.album !== lastAlbum;
  if (changed) { lastAlbum = player.album; renderCenter(); }
  if (changed || player.index !== lastIndex) { lastIndex = player.index; renderShelves(); }
  renderNP();
});

installWheel();

// 曲の終わりの余韻: アルバムを聴き終えて、続きがなく止まるとき（スリープタイマー「アルバムの終わり」も）は、
// 部屋の音（重ねている環境音・時計の秒針・窓の外の雨）だけを少し残してから消す
player.onLinger = (ctx, input) => roomTail(ctx, input, { rain: windowRain() });
{
  const albumEnd = player.onAlbumEnd;
  player.onAlbumEnd = () => {
    const stops = albumEndArmed() || !upNext();
    albumEnd?.();
    if (stops) player.linger();
  };
}

// 聴いた時間を数える（聴いた距離のモジュール用）
// 目じるしに届いたら証書を作る（awards.ts）
setInterval(() => { if (player.playing) { addListened(1); checkAwards(player.album); } }, 1000);

// キーボード: 割り当ては設定ページで変えられる（shortcuts.ts）
initShortcuts(id => {
  const pos = player.position;
  switch (id) {
    case "toggle": return player.toggle();
    case "next": return player.next();
    case "prev": return player.prev();
    case "fwd": return player.seekTo(Math.min(player.duration, pos + 10));
    case "back": return player.seekTo(Math.max(0, pos - 10));
    case "volUp": return player.setVolume(Math.min(1, player.volume + .05));
    case "volDown": return player.setVolume(Math.max(0, player.volume - .05));
    case "mute": return player.toggleMute();
    case "home": case "library": case "settings": if (!focusLocked() || id === "home") location.hash = `#${id}`; return;
    case "search": {
      if (location.hash === "#settings") location.hash = "#home";
      const q = document.querySelector<HTMLInputElement>(location.hash === "#library" ? "#lib-q" : "#view-home .mod-search");
      q?.focus(); q?.select(); return;
    }
    case "mini": return setMini(!document.body.hasAttribute("data-mini"));
  }
});

// ---------- 最小表示と小窓 ----------
// 最小表示: ジャケット・曲名・シーク・曲の操作だけにする。ウィンドウを低くしたときも自動でこの表示になる（CSS）
// 小窓: 常に手前に出るミニプレイヤー（Document Picture-in-Picture。Chrome / Edge のみ）
const MINI_KEY = "kona.mini";
const MINI_SIZE = { width: 420, height: 132 };
const standalone = () => matchMedia("(display-mode: standalone)").matches;
let sizeBeforeMini: { w: number; h: number } | undefined;
const W = {
  expand: '<svg viewBox="0 0 16 16"><path d="M2 2h5v1.5H3.5V7H2zM14 14H9v-1.5h3.5V9H14z"/></svg>',
  pip: '<svg viewBox="0 0 16 16"><path d="M1.5 2.5h13v11h-13zM3 4v8h10V4z"/><path d="M8 8h4.5v4H8z"/></svg>',
  back: '<svg viewBox="0 0 16 16"><path d="M1.5 2.5h13v11h-13zM3 4v8h10V4z"/><path d="M5 6h4.5v1.5H7.6l3 3-1 1-3-3v1.9H5z"/></svg>',
};
// @ts-expect-error documentPictureInPicture は DOM 型定義に未収録
const dpip: { requestWindow(o: { width: number; height: number }): Promise<Window>; window: Window | null } | undefined = window.documentPictureInPicture;
const miniDeps = (actions: MiniAction[]) => ({ player, art, esc, fmt, actions });

function setMini(on: boolean) {
  document.body.toggleAttribute("data-mini", on);
  try { localStorage.setItem(MINI_KEY, on ? "1" : ""); } catch { /* ignore */ }
  // タスクバーに置いたアプリのウィンドウなら、ウィンドウごと小さくする（ブラウザのタブでは何もしない）
  if (!standalone()) return;
  try {
    if (on) { sizeBeforeMini = { w: outerWidth, h: outerHeight }; resizeTo(MINI_SIZE.width, MINI_SIZE.height + (outerHeight - innerHeight)); }
    else if (sizeBeforeMini) { resizeTo(sizeBeforeMini.w, sizeBeforeMini.h); sizeBeforeMini = undefined; }
    else if (innerHeight < 400) resizeTo(Math.max(outerWidth, 1100), 760);
  } catch { /* 大きさを変えられない環境 */ }
}

async function openPip() {
  if (!dpip) return;
  if (dpip.window) { dpip.window.focus(); return; }
  const w = await dpip.requestWindow(MINI_SIZE).catch(() => undefined);
  if (!w) return;
  // 本体のスタイルを小窓に写す（読めない外部のスタイルシートはリンクで）
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = w.document.createElement("style");
      style.textContent = Array.from(sheet.cssRules).map(r => r.cssText).join("\n");
      w.document.head.append(style);
    } catch {
      if (!sheet.href) continue;
      const link = w.document.createElement("link");
      link.rel = "stylesheet"; link.href = sheet.href;
      w.document.head.append(link);
    }
  }
  w.document.title = "Kona";
  w.document.body.classList.add("pip");
  const root = w.document.createElement("section");
  w.document.body.append(root);
  const off = mountMini(root, miniDeps([{ cls: "act-back", label: "元のウィンドウに戻る", icon: W.back, run: () => { window.focus(); w.close(); } }]));
  w.addEventListener("pagehide", off, { once: true });
}

mountMini($("#mini"), miniDeps([
  ...(dpip ? [{ cls: "act-pip", label: "小窓で手前に出す", icon: W.pip, run: () => { openPip(); } }] : []),
  { cls: "act-expand", label: "元の表示に戻す", icon: W.expand, run: () => setMini(false) },
]));
$("#to-mini").onclick = () => setMini(true);
initPhoto({ toast });
initShelfMarks();
$("#to-pip").hidden = !dpip;
$("#to-pip").onclick = () => { openPip(); };
try { if (localStorage.getItem(MINI_KEY)) document.body.toggleAttribute("data-mini", true); } catch { /* ignore */ }
// 対応ブラウザでは、再生中にタブを離れたとき自動で小窓に出せる（ブラウザの設定で許可したとき）
if (dpip && "mediaSession" in navigator) {
  try { navigator.mediaSession.setActionHandler("enterpictureinpicture" as MediaSessionAction, () => { openPip(); }); } catch { /* 対応していない */ }
}

// タスクバーに置けるように（PWA）。オフラインでも開けるよう、読んだ画面のファイルを手元に残す
if ("serviceWorker" in navigator && location.protocol !== "file:" && import.meta.env.PROD) {
  // main は boot から後で読まれるので、load がもう済んでいることもある
  const reg = () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); };
  if (document.readyState === "complete") reg(); else addEventListener("load", reg, { once: true });
}

// ---------- 猫: ホームの棚を歩き回る。追加メニューから呼んだり帰したりでき、何匹でも置ける ----------
const CATS_KEY = "kona.cats";
let coats: Coat[] = (() => {
  try {
    const saved = localStorage.getItem(CATS_KEY);
    if (saved) return JSON.parse(saved) as Coat[];
    return localStorage.getItem("kona.cat") === "off" ? [] : [randomCoat()];
  } catch { return [randomCoat()]; }
})();
function placeCats(animate = false) {
  try { localStorage.setItem(CATS_KEY, JSON.stringify(coats)); } catch { /* ignore */ }
  const grid = $(".grid");
  // スマホ版ではホームを出さないので猫も休ませる。「猫を出さない」のときも
  if (grid) setCats(grid, mobileActive() || prefs().catsHidden ? [] : coats, animate);
}
// 猫がよく聴くアルバムをくわえて、「次に再生」へ運んでくる
setCatHooks({
  pick() {
    if (prefs().catMischief === "off") return undefined;
    const top = albums.filter(a => stat(a.key).plays > 0 && !queue.includes(a.key) && a !== player.album)
      .sort((x, y) => stat(y.key).plays - stat(x.key).plays).slice(0, 12);
    const a = top[Math.floor(Math.random() * top.length)];
    return a && { key: a.key, art: a.cover ?? a.color ?? fallbackColor(a) };
  },
  deliver(key) {
    // 「そのまま再生する」なら、運んできたアルバムをすぐにかける
    const a = byKey(key);
    if (prefs().catMischief === "play" && a) { play(a); return; }
    if (!queue.includes(key)) { queue.push(key); renderShelves(); }
  },
  random() {
    const a = albums[Math.floor(Math.random() * albums.length)];
    return a && { key: a.key, art: a.cover ?? a.color ?? fallbackColor(a) };
  },
  play(key) { const a = byKey(key); if (a) play(a); },
  // 猫ごとのお気に入り: はじめて聞かれたときに決めて、毛並みと一緒に覚える（外したアルバムなら選び直す）
  favorite(coat) {
    if (coat.fav && byKey(coat.fav)) return coat.fav;
    if (!albums.length) return undefined;
    coat.fav = albums[Math.floor(Math.random() * albums.length)].key;
    try { localStorage.setItem(CATS_KEY, JSON.stringify(coats)); } catch { /* ignore */ }
    return coat.fav;
  },
  nowPlaying: () => player.album?.key,
  albumTitle: key => byKey(key)?.title,
  tasteOf: key => { const a = byKey(key); return a ? a.genre?.trim() || a.artist?.trim() || a.title : undefined; },
  saveCoats: () => { try { localStorage.setItem(CATS_KEY, JSON.stringify(coats)); } catch { /* ignore */ } },
  level: () => { const [l, r] = player.levels(); return (l + r) / 2; },
});

// ---------- 設定ページ ----------
initSettings($("#view-settings"), {
  player,
  cats: () => coats,
  addCat: () => { coats.push(randomCoat()); catVoice("meow"); placeCats(true); },
  removeCat: i => { coats.splice(i, 1); placeCats(true); },
  changeCat: (i, ch) => {
    const c = coats[i];
    if (!c) return;
    if (ch.name !== undefined) c.name = ch.name || undefined;
    // 品種を替えると毛並みも選び直す（性格・お気に入り・名前はそのまま）
    if (ch.breed && ch.breed !== (c.breed ?? "mix")) coats[i] = { ...breedCoat(ch.breed), p: c.p, fav: c.fav, name: c.name };
    placeCats();
  },
  source: () => {
    const kind = !rootName ? "none" : liveRoot ? "local" : driveSaved()?.name === rootName ? "drive" : "files";
    return { name: rootName, kind, canRescan: !!liveRoot };
  },
  rescan: () => rescan(),
  openSource: anchor => openSourceMenu(anchor),
  forgetSource: async () => {
    await kvSet("root", null);
    const c = driveConfig();
    if (c) saveDriveConfig({ clientId: c.clientId });
    signOut();
    try { localStorage.removeItem(NOW_KEY); localStorage.removeItem(QUEUE_KEY); } catch { /* ignore */ }
    location.hash = "#home"; location.reload();
  },
  drive: () => { const c = driveConfig(); return { configured: !!c, folder: c?.folderName, signedIn: !!driveToken() }; },
  driveSignOut: () => signOut(),
  keptAlbums: () => allAlbums.filter(a => isKept(a.key)).map(a => {
    const files = driveFiles(a);
    return { key: a.key, title: a.title, bytes: files.reduce((n, f) => n + (f.size || 0), 0), forget: async () => { await forgetAlbum(a.key, files); renderMobile(); } };
  }),
  exportSettings: records => { saveSession(); const n = exportSettings(records); toast(`${n} ${t("項目を書き出しました")}`); },
  importSettings: () => { loadSettingsFile(); },
  toast: text => toast(text),
  redraw: () => { renderShelves(); renderCenter(); if (location.hash === "#library") renderLibrary(); },
});
document.addEventListener("kona:prefs", e => {
  const keys = (e as CustomEvent<string[]>).detail;
  if (keys.includes("catsHidden")) placeCats(true);
  if (keys.includes("libGroup")) { renderShelves(); if (location.hash === "#library") keepScroll(renderLibrary); renderMobile(); }
});
translateStatic();

// ---------- ポモドーロの鍵: 時計と再生の画面（再生中モジュール・下の再生バー）以外を触れなくする ----------
function applyFocusLock() {
  const on = focusLocked();
  document.body.classList.toggle("focus-lock", on);
  if (on) { if (pop) closePop(); closeAddMenu(); closeModuleMenu(); if (location.hash === "#library" || location.hash === "#settings") location.hash = "#home"; }
  const free = (el: Element) => el.matches(".mod-clock, .mod-player");
  document.querySelectorAll(".grid .mod").forEach(el => el.toggleAttribute("inert", on && !free(el)));
  document.querySelectorAll(".grid .mod-head, .add-mod, .top .tabs, #open, #rescan, #view-library, #view-settings").forEach(el => el.toggleAttribute("inert", on));
}
document.addEventListener("kona:focus", applyFocusLock);

// ---------- ルーティング ----------
function route() {
  if (focusLocked() && (location.hash === "#library" || location.hash === "#settings")) { location.hash = "#home"; return; }
  const view = location.hash === "#library" ? "library" : location.hash === "#settings" ? "settings" : "home";
  document.body.dataset.view = view;
  for (const v of ["home", "library", "settings"]) {
    $(`#view-${v}`).hidden = v !== view;
    $(`#tab-${v}`).toggleAttribute("aria-current", false);
  }
  $(`#tab-${view}`).setAttribute("aria-current", "page");
  if (view === "settings") renderSettings();
}
addEventListener("hashchange", route);

// ---------- 起動 ----------
async function boot() {
  renderHomeFrame(); renderShelves(); route();
  const started = loads;
  savedRoot = await kvGet<FileSystemDirectoryHandle>("root").catch(() => undefined);
  // 許可が残っていれば（Chrome の「毎回許可」など）そのまま読み込む。なければ開始画面でフォルダを選んでもらう
  // @ts-expect-error queryPermission は DOM 型定義に未収録
  const perm = savedRoot && await savedRoot.queryPermission?.({ mode: "read" }).catch(() => "denied");
  // 起動の準備中に、もうフォルダが選ばれていたらそちらを優先する（開始画面に戻さない）
  if (loads !== started) return;
  if (savedRoot && perm === "granted") { liveRoot = savedRoot; liveDrive = undefined; await load(savedRoot.name, walkHandle(savedRoot)); }
  else {
    setState("start");
    // サインインから戻ってきたところなら続きを。同じタブで開き直したなら、前の Drive のフォルダをそのまま
    if (!await resumeDrive() && !savedRoot && driveReady()) await openDriveSaved();
  }
}
boot();
