// リスニングパーティー: 同じ曲を手元に持っている人どうしで、再生の位置をそろえて一緒に聴く。
//  - サーバーを持たない。WebRTC の接続情報を「招待コード」と「返事のコード」にして、使う人どうしが手で渡し合う
//  - 音は送らない。送るのは曲の情報（曲名・アーティスト・アルバム・曲番号・長さ）と再生位置だけ。各自が手元の曲を鳴らす
//  - ホストが操作し、参加者はそれに合わせる。ホストと参加者は 1 対 1 でつながる（ホストが中心の星形）
// 画面の文字はすべて esc() か textContent で入れる（相手の名前や曲名を HTML として読ませない）

import "./party.css";
import { enrichTracks, type Album } from "./library";
import { ctx, esc, fmt } from "./modctx";

const NAME_KEY = "kona.party.name";
const ICE_KEY = "kona.party.ice";
const DEFAULT_ICE = "stun:stun.l.google.com:19302";
const INVITE = "KONA-I1", REPLY = "KONA-R1";   // コードの頭（招待 / 返事）
const HASH = "#party=";                         // 招待リンク（# 以降はどのサーバーにも送られない）
const DRIFT = 0.3;                              // これ以上ずれたら位置を合わせ直す（秒）
const MAX_PEERS = 8;

interface TrackInfo { title: string; artist: string; album: string; no: number; disc: number; dur: number }
type Msg =
  | { t: "peers"; host: string; names: string[] }
  | { t: "ping"; a: number }
  | { t: "pong"; a: number; b: number }
  | { t: "state"; track?: TrackInfo; playing: boolean; pos: number; rate: number; at: number }
  | { t: "bye" };

// 相手から届いたものは信用しない: 形と大きさを確かめてから使う（壊れたもの・知らないものは捨てる）
const MAX_TEXT = 2000, MAX_NAMES = 64;
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isText = (x: unknown): x is string => typeof x === "string" && x.length <= MAX_TEXT;
function isTrack(x: unknown): x is TrackInfo {
  const o = x as TrackInfo;
  return !!o && typeof o === "object" && isText(o.title) && isText(o.artist) && isText(o.album) && isNum(o.no) && isNum(o.disc) && isNum(o.dur);
}
function asMsg(x: unknown): Msg | undefined {
  const m = x as Record<string, unknown>;
  if (!m || typeof m !== "object") return undefined;
  switch (m.t) {
    case "bye": return { t: "bye" };
    case "ping": return isNum(m.a) ? { t: "ping", a: m.a } : undefined;
    case "pong": return isNum(m.a) && isNum(m.b) ? { t: "pong", a: m.a, b: m.b } : undefined;
    case "peers":
      return isText(m.host) && Array.isArray(m.names) && m.names.length <= MAX_NAMES && m.names.every(isText)
        ? { t: "peers", host: m.host, names: m.names as string[] } : undefined;
    case "state":
      if (typeof m.playing !== "boolean" || !isNum(m.pos) || !isNum(m.rate) || !isNum(m.at)) return undefined;
      if (m.track !== undefined && !isTrack(m.track)) return undefined;
      return { t: "state", track: m.track as TrackInfo | undefined, playing: m.playing, pos: m.pos, rate: m.rate, at: m.at };
  }
  return undefined;
}

interface Peer { pc: RTCPeerConnection; dc?: RTCDataChannel; name: string; open: boolean }

type Role = "idle" | "host" | "guest";
let role: Role = "idle";
let peers: Peer[] = [];          // ホスト: 参加者たち / 参加者: ホストひとり
let pending: Peer | undefined;   // ホスト: 返事を待っている招待 / 参加者: つながるのを待っている返事
let inviteCode = "", replyCode = "";
let hostName = "", guestNames: string[] = [];
let ended = "";                  // 参加者: 切れた理由（画面に出す）
let busy = false;
let timer = 0;

// 参加者の側の同期
let offset = 0;                              // ホストの時計 − 自分の時計（ミリ秒）
let samples: { rtt: number; off: number }[] = [];
let last: Extract<Msg, { t: "state" }> | undefined;
let following = true;                        // ホストに合わせているか（自分で止めたら外れる）
let match: { key: string; album?: Album; index: number; done: boolean; n: number } | undefined;
let marked = 0;                              // 自分（同期）で再生を動かした時刻。直後の変化は手動の操作とみなさない
let lastSeek = 0, drift = 0, playTries = 0, blocked = false;

const now = () => performance.timeOrigin + performance.now();
const myName = () => { try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; } };
const iceText = () => { try { return localStorage.getItem(ICE_KEY) ?? DEFAULT_ICE; } catch { return DEFAULT_ICE; } };
const label = (n: string) => n || "名無し";

// ---------- 接続情報の文字化（圧縮して base64url） ----------
const b64 = (u: Uint8Array) => { let s = ""; for (const c of u) s += String.fromCharCode(c); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const MAX_UNPACKED = 256 * 1024;   // 接続情報は数 KB。貼られたコードを広げすぎない
async function squeeze(data: Uint8Array, mode: "deflate-raw", back = false): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(back ? new DecompressionStream(mode) : new CompressionStream(mode));
  if (!back) return new Uint8Array(await new Response(stream).arrayBuffer());
  const reader = stream.getReader(), parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_UNPACKED) { reader.cancel().catch(() => {}); throw new Error("コードが大きすぎます"); }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
async function pack(head: string, name: string, sdp: string): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify({ n: name.slice(0, 40), s: sdp }));
  if (typeof CompressionStream === "function") return `${head}z.${b64(await squeeze(raw, "deflate-raw"))}`;
  return `${head}u.${b64(raw)}`;
}
async function unpack(head: string, code: string): Promise<{ name: string; sdp: string }> {
  const m = code.replace(/\s+/g, "").match(/^KONA-([IR])1([zu])\.([\w-]+)$/);
  if (!m || `KONA-${m[1]}1` !== head) throw new Error(head === INVITE ? "招待コードではありません" : "返事のコードではありません");
  let raw: Uint8Array = unb64(m[3]);
  if (m[2] === "z") raw = await squeeze(raw, "deflate-raw", true);
  const o = JSON.parse(new TextDecoder().decode(raw));
  if (typeof o?.s !== "string" || o.s.length > MAX_UNPACKED) throw new Error("コードが壊れています");
  return { name: String(o.n ?? "").slice(0, 40), sdp: o.s };
}

// ---------- WebRTC ----------
/** 「stun:… turn:…?username=u&credential=p」を ICE サーバーの設定に。空なら同じ LAN の中だけでつなぐ */
function iceServers(): RTCIceServer[] {
  return iceText().split(/[\s,]+/).filter(Boolean).map(u => {
    const q = u.indexOf("?");
    if (!/^turns?:/.test(u) || q < 0) return { urls: u };
    const p = new URLSearchParams(u.slice(q + 1)), username = p.get("username") ?? undefined, credential = p.get("credential") ?? undefined;
    p.delete("username"); p.delete("credential");
    const rest = p.toString();
    return { urls: u.slice(0, q) + (rest ? `?${rest}` : ""), username, credential };
  });
}
function newPc() { return new RTCPeerConnection({ iceServers: iceServers() }); }
/** 経路の候補を集め終えるまで待つ（候補を全部コードに入れて、やり取りを 1 往復で済ませる） */
function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise(resolve => {
    const done = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", done); resolve(); } };
    pc.addEventListener("icegatheringstatechange", done);
    setTimeout(resolve, 6000);   // STUN に届かないときも、集まった分で進む
  });
}
function wire(peer: Peer, dc: RTCDataChannel) {
  peer.dc = dc;
  dc.onopen = () => { peer.open = true; opened(peer); };
  dc.onclose = () => dropped(peer);
  dc.onmessage = e => {
    if (typeof e.data !== "string" || e.data.length > 65_536) return;
    try { const m = asMsg(JSON.parse(e.data)); if (m) received(peer, m); } catch { /* 壊れたものは捨てる */ }
  };
  peer.pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(peer.pc.connectionState)) dropped(peer); };
}
function send(peer: Peer, m: Msg) { if (peer.open && peer.dc?.readyState === "open") try { peer.dc.send(JSON.stringify(m)); } catch { /* ignore */ } }
const broadcast = (m: Msg) => peers.forEach(p => send(p, m));

// ---------- ホスト ----------
async function host() {
  role = "host"; ended = "";
  hostName = myName();
  startTimer();
  await invite();
}
/** 招待をひとつ作る（返事を待っている招待は 1 つだけ） */
async function invite() {
  if (role !== "host" || busy) return;
  busy = true; inviteCode = ""; render();
  try {
    pending?.pc.close();
    const pc = newPc(), peer: Peer = { pc, name: "", open: false };
    wire(peer, pc.createDataChannel("kona", { ordered: true }));
    pending = peer;
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    if (pending !== peer) return;
    inviteCode = await pack(INVITE, hostName, pc.localDescription!.sdp);
  } catch { toastIn("招待を作れませんでした"); }
  finally { busy = false; render(); }
}
async function acceptReply(code: string) {
  if (!pending) return;
  const peer = pending;
  try {
    const r = await unpack(REPLY, code);
    peer.name = r.name;
    await peer.pc.setRemoteDescription({ type: "answer", sdp: r.sdp });
    note("つないでいます…");
  } catch (e) { note((e as Error).message || "返事のコードを読めませんでした", true); }
}

// ---------- 参加者 ----------
async function join(code: string) {
  if (busy) return;
  busy = true;
  let err = "";
  try {
    const inv = await unpack(INVITE, code);
    leave(true);
    role = "guest"; ended = ""; following = true; blocked = false; samples = []; last = undefined; match = undefined;
    hostName = inv.name;
    const pc = newPc(), peer: Peer = { pc, name: inv.name, open: false };
    pc.ondatachannel = e => wire(peer, e.channel);
    pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState)) dropped(peer); };
    pending = peer;
    await pc.setRemoteDescription({ type: "offer", sdp: inv.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    replyCode = await pack(REPLY, myName(), pc.localDescription!.sdp);
    startTimer();
  } catch (e) {
    err = (e as Error).message || "招待コードを読めませんでした";
    if (role === "guest") leave(true);
  } finally { busy = false; render(); if (err) note(err, true); }
}

function opened(peer: Peer) {
  if (pending === peer) pending = undefined;
  if (role === "host") {
    if (!peers.includes(peer)) peers.push(peer);
    inviteCode = "";
    sendPeers();
    send(peer, snapshot());
    toastIn(`${label(peer.name)}が参加しました`);
  } else {
    peers = [peer];
    ping();
  }
  render();
}
function dropped(peer: Peer) {
  if (pending === peer) {
    pending = undefined; peer.pc.close();
    if (role === "guest" && !peers.length) ended = "つながりませんでした";
    else if (role === "host") { inviteCode = ""; toastFn?.("つながりませんでした。招待を作り直してください"); }
    render(); return;
  }
  if (!peers.includes(peer)) return;
  peers = peers.filter(p => p !== peer);
  peer.open = false;
  try { peer.pc.close(); } catch { /* ignore */ }
  if (role === "host") { sendPeers(); toastIn(`${label(peer.name)}が抜けました`); }
  else if (!ended) { ended = "ホストとの接続が切れました"; stopTimer(); }
  render();
}
function received(peer: Peer, m: Msg) {
  if (m.t === "bye") { dropped(peer); return; }
  if (role === "host") {
    if (m.t === "ping") send(peer, { t: "pong", a: m.a, b: now() });
    return;
  }
  if (m.t === "pong") {
    const t = now(), rtt = t - m.a;
    samples.push({ rtt, off: m.b - (m.a + t) / 2 });
    samples = samples.slice(-10);
    offset = samples.reduce((x, y) => y.rtt < x.rtt ? y : x).off;   // 往復が一番短かったときの見積もりを使う
  } else if (m.t === "peers") { hostName = m.host; guestNames = m.names; update(); }
  else if (m.t === "state") { last = m; follow(); }
}
function sendPeers() { broadcast({ t: "peers", host: hostName, names: peers.map(p => p.name) }); }
function ping() { peers.forEach(p => send(p, { t: "ping", a: now() })); }

/** パーティーを閉じる・抜ける */
function leave(quiet = false) {
  broadcast({ t: "bye" });
  for (const p of [...peers, ...(pending ? [pending] : [])]) { p.open = false; try { p.pc.close(); } catch { /* ignore */ } }
  peers = []; pending = undefined; inviteCode = replyCode = ""; ended = ""; last = undefined; match = undefined;
  role = "idle"; stopTimer();
  if (!quiet) render();
}

function startTimer() {
  stopTimer();
  let n = 0;
  timer = window.setInterval(() => {
    n++;
    if (role === "host") broadcast(snapshot());
    else if (role === "guest" && peers.length) {
      if (n < 6 || n % 10 === 0) ping();   // 最初は細かく時計を合わせ、あとはときどき
      follow();
    }
    update();
  }, 1000);
}
function stopTimer() { clearInterval(timer); timer = 0; }

// ---------- 再生の様子を送る / 合わせる ----------
function snapshot(): Msg {
  const p = ctx().player, a = p.album, t = p.track;
  return {
    t: "state",
    track: a && t ? { title: t.title, artist: a.artist, album: a.title, no: t.no, disc: t.disc, dur: Math.round(p.duration || t.duration || 0) } : undefined,
    playing: p.playing, pos: p.position, rate: p.speed.rate, at: now(),
  };
}
const fold = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
const keyOf = (t: TrackInfo) => [t.album, t.artist, t.title, t.disc, t.no].join("\u0001");

/** 手元のライブラリから同じ曲を探す（アルバム名とアーティスト、曲名か曲番号と長さで） */
async function findTrack(t: TrackInfo): Promise<{ album: Album; index: number } | undefined> {
  const all = ctx().albums(), na = fold(t.album), nr = fold(t.artist), nt = fold(t.title);
  const same = all.filter(a => fold(a.title) === na);
  const cands = [...same.filter(a => !nr || !a.artist || fold(a.artist) === nr), ...same.filter(a => nr && a.artist && fold(a.artist) !== nr)];
  for (const a of cands) {
    await enrichTracks(a).catch(() => {});
    let i = a.tracks.findIndex(x => fold(x.title) === nt);
    if (i < 0) i = a.tracks.findIndex(x => x.no === t.no && x.disc === t.disc && (!t.dur || !x.duration || Math.abs(x.duration - t.dur) < 3));
    if (i >= 0) return { album: a, index: i };
  }
  return undefined;
}

const target = (s: NonNullable<typeof last>) => s.playing ? s.pos + Math.max(0, now() + offset - s.at) / 1000 * s.rate : s.pos;

let following_ = false;
async function follow() {
  const s = last;
  if (role !== "guest" || !s || !following || following_) return;
  following_ = true;
  try {
    const p = ctx().player;
    if (!s.track) { if (p.playing) { mark(); p.toggle(); } return; }
    const key = keyOf(s.track);
    // 曲が替わったら探し直す。見つからなかった曲も、ライブラリが読み込まれたり増えたりしたら探し直す
    const n = ctx().albums().length;
    if (match?.key !== key || (match.done && !match.album && match.n !== n)) {
      match = { key, index: 0, done: false, n };
      const hit = await findTrack(s.track);
      if (match.key !== key) return;
      Object.assign(match, { album: hit?.album, index: hit?.index ?? 0, done: true });
      update();
    }
    if (!match.done) return;
    if (!match.album) { if (p.playing) { mark(); p.toggle(); } return; }
    if (p.album !== match.album || p.index !== match.index) {
      mark(); playTries = 0;
      if (s.playing) await p.playAlbum(match.album, match.index);
      else await p.cue(match.album, match.index, target(s));
      mark(); lastSeek = Date.now();
      return;
    }
    if (!p.duration) return;
    const want = target(s);
    drift = p.position - want;
    if (Math.abs(drift) > DRIFT && Date.now() - lastSeek > 1500 && want < p.duration - 1) {
      mark(); lastSeek = Date.now();
      p.seekTo(want + (s.playing ? 0.04 : 0));
    }
    if (s.playing !== p.playing) {
      mark();
      if (s.playing) { if (++playTries > 2) blocked = true; }
      p.toggle();
    } else if (p.playing) { playTries = 0; blocked = false; }
  } finally { following_ = false; }
}
function mark() { marked = Date.now(); }

/** 参加者が自分で止めたり、別のアルバムをかけたりしたら、合わせるのをやめる（「合わせる」で戻る） */
function watchLocal() {
  if (role !== "guest" || !following || !last?.track || !match?.album || Date.now() - marked < 1500) return;
  const p = ctx().player;
  // 曲やアルバムの終わりぎわは、それぞれのプレイヤーが勝手に次へ進むので見逃す（すぐにホストの次の曲が届く）
  const nearEnd = (p.duration && p.duration - p.position < 2) || (last.track.dur && last.track.dur - target(last) < 3) || p.position < 1;
  if ((p.album && p.album !== match.album && !nearEnd) || (!p.playing && last.playing && !nearEnd && !blocked)) { following = false; update(); }
}
function resume() {
  following = true; blocked = false; playTries = 0;
  const p = ctx().player;
  // 押したその場で鳴らす（スマホのブラウザは、操作の直後でないと再生を始めさせない）
  if (last?.playing && match?.album && p.album === match.album && p.index === match.index && !p.playing) { mark(); p.toggle(); }
  follow(); update();
}

// ---------- 画面 ----------
let dlg: HTMLElement | undefined;
let lastFocus: HTMLElement | null = null;
let shown = "";   // いま描いている場面（場面が変わったときだけ作り直し、入力中の文字を消さない）
let toastFn: ((t: string) => void) | undefined;
const toastIn = (t: string) => { if (!dlg) toastFn?.(t); };

function phase(): string {
  if (role === "host") return busy ? "host-making" : pending && inviteCode ? "host-invite" : "host";
  if (role === "guest") return ended ? "guest-ended" : peers.length ? "guest" : replyCode ? "guest-reply" : "guest-making";
  return "idle";
}

export function openParty(code = "") {
  if (!dlg) {
    lastFocus = document.activeElement as HTMLElement | null;
    dlg = document.createElement("div");
    dlg.className = "dlg-back";
    dlg.innerHTML = `<div class="dlg party" role="dialog" aria-modal="true" aria-labelledby="party-title">
      <div class="dlg-head"><h2 id="party-title">リスニングパーティー</h2><button class="dlg-x" aria-label="閉じる">×</button></div>
      <div class="dlg-body"></div></div>`;
    dlg.addEventListener("pointerdown", e => { if (e.target === dlg) closeDlg(); });
    dlg.querySelector<HTMLElement>(".dlg-x")!.onclick = closeDlg;
    document.body.append(dlg);
    addEventListener("keydown", onKey, true);
  }
  shown = "";
  render();
  if (code && role === "idle") { const t = dlg.querySelector<HTMLTextAreaElement>("#party-in"); if (t) t.value = code; }
}
function closeDlg() {
  dlg?.remove(); dlg = undefined; shown = "";
  removeEventListener("keydown", onKey, true);
  lastFocus?.focus?.();
}
const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); closeDlg(); } };

function note(text: string, warn = false) {
  const el = dlg?.querySelector<HTMLElement>("#party-note");
  if (!el) { toastIn(text); return; }
  el.hidden = !text; el.textContent = text; el.classList.toggle("dlg-warn", warn);
}

const codeBox = (id: string, code: string, link = false) => `
  <textarea class="party-code" id="${id}" readonly rows="3" spellcheck="false">${esc(code)}</textarea>
  <div class="party-row">
    <button class="btn" data-copy="${id}">コードをコピー</button>
    ${link ? `<button class="btn" data-link>招待リンクをコピー</button>` : ""}
    ${"share" in navigator ? `<button class="btn" data-share="${id}">送る…</button>` : ""}
  </div>`;

const PRIVACY = `<p class="dlg-note">音は送りません。送るのは曲名・アーティスト・アルバム名・再生位置だけで、各自が手元の同じ曲を鳴らします。つながるとお互いの IP アドレスが相手に見えるので、知っている人とだけ使ってください。</p>`;

function render() {
  renderPill();
  if (!dlg) return;
  const ph = phase();
  if (ph === shown) { update(); return; }
  shown = ph;
  const body = dlg.querySelector<HTMLElement>(".dlg-body")!;
  const h = (s: string) => { body.innerHTML = s; };
  if (ph === "idle") h(`
    <p class="dlg-lead">同じ曲を手元に持っている人どうしで、再生の位置をそろえて一緒に聴きます。Kona はサーバーを持たないので、招待コードと返事のコードを、メッセージアプリなどで手渡しで交換してつなぎます。</p>
    <label class="dlg-field"><span>あなたの名前（相手に見えます）</span><input id="party-name" type="text" maxlength="40" autocomplete="nickname" value="${esc(myName())}"></label>
    <div class="dlg-actions"><button class="btn primary" id="party-host">パーティーを開く</button></div>
    <hr class="party-hr">
    <label class="dlg-field"><span>招待コードを受け取ったら（招待リンクを開いたときは入っています）</span>
      <textarea class="party-code" id="party-in" rows="3" spellcheck="false" placeholder="${INVITE}…"></textarea></label>
    <p class="dlg-note" id="party-note" hidden></p>
    <div class="dlg-actions"><button class="btn" id="party-join">参加する</button></div>
    ${PRIVACY}
    <details class="party-ice"><summary>つなぎ方の設定</summary>
      <label class="dlg-field"><span>STUN / TURN サーバー（空白区切り。空にすると同じ LAN の中だけでつなぐ）</span>
        <input id="party-ice" type="text" spellcheck="false" autocapitalize="off" value="${esc(iceText())}" placeholder="stun:… turn:…?username=…&amp;credential=…"></label>
      <p class="dlg-note">既定は Google の公開 STUN（相手までの道を調べるのに、あなたの IP アドレスが Google に届きます）。家庭のルーターどうしでつながらないときは、自分で用意した TURN を書いてください。</p>
    </details>`);
  else if (ph === "host-making" || ph === "guest-making") h(`<p class="dlg-lead party-wait">${ph === "host-making" ? "招待コードを作っています…" : "返事のコードを作っています…"}</p>`);
  else if (ph === "host-invite") h(`
    <p class="dlg-lead"><b>1.</b> この招待コード（またはリンク）を、一緒に聴く人に送ります。</p>
    ${codeBox("party-out", inviteCode, true)}
    <label class="dlg-field"><span><b>2.</b> 相手から返ってきた返事のコードを貼ります</span>
      <textarea class="party-code" id="party-in" rows="3" spellcheck="false" placeholder="${REPLY}…"></textarea></label>
    <p class="dlg-note" id="party-note" hidden></p>
    <div class="dlg-actions"><button class="btn primary" id="party-accept">つなぐ</button></div>
    <div class="party-people" id="party-people"></div>
    <div class="dlg-actions">${peers.length ? `<button class="btn" id="party-cancel">招待をやめる</button>` : ""}<button class="btn" id="party-leave">パーティーを閉じる</button></div>`);
  else if (ph === "host") h(`
    <p class="dlg-lead">あなたの再生に、みんなが合わせています。いつもどおりに曲を選んで操作してください。</p>
    <div class="party-people" id="party-people"></div>
    <div class="dlg-actions"><button class="btn" id="party-more" ${peers.length >= MAX_PEERS ? "disabled" : ""}>もう一人招く</button><button class="btn" id="party-leave">パーティーを閉じる</button></div>`);
  else if (ph === "guest-reply") h(`
    <p class="dlg-lead"><b>${esc(label(hostName))}</b>さんのパーティー。この返事のコードを相手に送り返してください。相手が貼ると、つながります。</p>
    ${codeBox("party-out", replyCode)}
    <p class="dlg-note party-wait" id="party-note">相手がつなぐのを待っています…</p>
    <div class="dlg-actions"><button class="btn" id="party-leave">やめる</button></div>`);
  else if (ph === "guest") h(`
    <p class="dlg-lead"><b>${esc(label(hostName))}</b>さんの再生に合わせて聴いています。</p>
    <div class="party-now" id="party-now"></div>
    <div class="party-people" id="party-people"></div>
    <div class="dlg-actions"><button class="btn primary" id="party-follow" hidden>合わせる</button><button class="btn" id="party-leave">抜ける</button></div>`);
  else if (ph === "guest-ended") h(`
    <p class="dlg-lead">${esc(ended)}。</p>
    <div class="dlg-actions"><button class="btn primary" id="party-done">閉じる</button></div>`);

  const $ = <T extends HTMLElement>(s: string) => body.querySelector<T>(s);
  const name = $<HTMLInputElement>("#party-name");
  if (name) name.onchange = () => { try { localStorage.setItem(NAME_KEY, name.value.trim()); } catch { /* ignore */ } };
  const ice = $<HTMLInputElement>("#party-ice");
  if (ice) ice.onchange = () => { try { localStorage.setItem(ICE_KEY, ice.value.trim()); } catch { /* ignore */ } };
  const keepName = () => name?.onchange?.(new Event("change"));
  $<HTMLButtonElement>("#party-host")?.addEventListener("click", () => { keepName(); host(); });
  $<HTMLButtonElement>("#party-join")?.addEventListener("click", () => {
    keepName();
    const v = $<HTMLTextAreaElement>("#party-in")!.value.trim();
    if (!v) { note("招待コードを貼ってください", true); return; }
    join(v);
  });
  $<HTMLButtonElement>("#party-accept")?.addEventListener("click", () => {
    const v = $<HTMLTextAreaElement>("#party-in")!.value.trim();
    if (!v) { note("返事のコードを貼ってください", true); return; }
    acceptReply(v);
  });
  $<HTMLButtonElement>("#party-more")?.addEventListener("click", () => invite());
  $<HTMLButtonElement>("#party-cancel")?.addEventListener("click", () => { pending?.pc.close(); pending = undefined; inviteCode = ""; render(); });
  $<HTMLButtonElement>("#party-leave")?.addEventListener("click", () => leave());
  $<HTMLButtonElement>("#party-done")?.addEventListener("click", () => { leave(); closeDlg(); });
  $<HTMLButtonElement>("#party-follow")?.addEventListener("click", resume);
  body.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach(b => b.onclick = () => copy(b, $<HTMLTextAreaElement>(`#${b.dataset.copy}`)!.value));
  body.querySelectorAll<HTMLButtonElement>("[data-link]").forEach(b => b.onclick = () => copy(b, inviteLink()));
  body.querySelectorAll<HTMLButtonElement>("[data-share]").forEach(b => b.onclick = () => {
    const isInvite = role === "host";
    navigator.share?.(isInvite ? { title: "Kona のリスニングパーティー", url: inviteLink() } : { text: replyCode }).catch(() => {});
  });
  update();
}
function inviteLink() { return `${location.origin}${location.pathname}${HASH}${inviteCode}`; }
function copy(b: HTMLButtonElement, text: string) {
  const was = b.textContent;
  navigator.clipboard?.writeText(text).then(() => { b.textContent = "コピーしました"; setTimeout(() => b.textContent = was, 1500); })
    .catch(() => { const t = b.closest(".dlg-body")?.querySelector<HTMLTextAreaElement>("#party-out"); t?.select(); });
}

/** 場面はそのままで、動く部分（参加者・再生中・ずれ）だけを書き換える */
function update() {
  renderPill();
  if (!dlg) return;
  const people = dlg.querySelector<HTMLElement>("#party-people");
  if (people) {
    const list = role === "host" ? [`${label(hostName)}（あなた・ホスト）`, ...peers.map(p => label(p.name))]
      : [`${label(hostName)}（ホスト）`, ...guestNames.map(n => n === myName() ? `${label(n)}（あなた）` : label(n))];
    people.innerHTML = `<span class="dlg-note">参加している人 ${list.length}</span><ul>${list.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`;
  }
  const nowEl = dlg.querySelector<HTMLElement>("#party-now");
  if (nowEl) {
    const t = last?.track;
    let state = "";
    if (!last) state = "待っています…";
    else if (!t) state = "ホストは何も再生していません";
    else if (!match?.done) state = "手元の曲を探しています…";
    else if (!match.album) state = "この曲は手元にありません（流れている間は鳴らしません）";
    else if (!following) state = "合わせるのをやめています";
    else if (blocked) state = "再生できませんでした。「合わせる」を押してください";
    else if (!last.playing) state = "一時停止中";
    else state = `合わせています（ずれ ${Math.abs(drift) < 0.05 ? "0.0" : Math.abs(drift).toFixed(1)} 秒）`;
    nowEl.innerHTML = t
      ? `<b>${esc(t.title)}</b><span>${esc([t.artist, t.album].filter(Boolean).join(" · "))}</span><span class="party-state">${esc(state)}${last ? ` · ${fmt(target(last))}` : ""}</span>`
      : `<span class="party-state">${esc(state)}</span>`;
    const btn = dlg.querySelector<HTMLButtonElement>("#party-follow");
    if (btn) btn.hidden = following && !blocked;
  }
}

// 参加している間だけ、上の帯に人数の札を出す（押すとパーティーの画面）
function renderPill() {
  let pill = document.getElementById("party-pill") as HTMLButtonElement | null;
  const on = role !== "idle";
  if (!on) { pill?.remove(); return; }
  if (!pill) {
    pill = document.createElement("button");
    pill.id = "party-pill"; pill.className = "party-pill";
    pill.onclick = () => openParty();
  }
  // スマホ版の画面が出ていればその上の帯、そうでなければ PC の上の帯
  const m = document.querySelector<HTMLElement>(".m .m-top .m-more");
  const anchor = m?.offsetParent ? m : document.getElementById("rescan");
  if (anchor && pill.nextElementSibling !== anchor) anchor.before(pill);
  const n = role === "host" ? peers.length + 1 : peers.length ? guestNames.length + 1 : 0;
  const off = role === "guest" && (!!ended || (!!last && (!following || blocked || (match?.done && !match.album))));
  pill.classList.toggle("off", off);
  pill.innerHTML = `<i></i>${ended ? "切れました" : n ? `${n}人` : "待機中"}`;
  pill.title = role === "host" ? "リスニングパーティー（ホスト）" : `${label(hostName)}さんのパーティー`;
  pill.setAttribute("aria-label", pill.title);
}

/** main から一度だけ呼ぶ。招待リンクから開いたなら、参加の画面を出す */
export function initParty(opts: { toast: (t: string) => void }) {
  toastFn = opts.toast;
  if (!("RTCPeerConnection" in window)) return;
  ctx().player.on(() => {
    if (role === "host") broadcast(snapshot());
    else watchLocal();
  });
  addEventListener("pagehide", () => broadcast({ t: "bye" }));
  if (location.hash.startsWith(HASH)) {
    const code = decodeURIComponent(location.hash.slice(HASH.length));
    history.replaceState(null, "", location.pathname + location.search + "#home");
    setTimeout(() => openParty(code), 300);
  }
}
export const partySupported = () => "RTCPeerConnection" in window;
