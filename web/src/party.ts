// リスニングパーティー: ホストが鳴らしている音（EQ のあと）を、そのまま参加者に届けて一緒に聴く。
//  - 音は WebRTC の音声（Opus・ステレオ）でホストから各参加者へ直接送る。参加者は曲を持っていなくてよい
//  - つなぐための接続情報は、公開の Nostr リレーを郵便受けにして受け渡す（party-relay.ts）。Kona はサーバーを持たない
//  - 招待リンクを開いて名乗る → ホストが「入れる」を押す → つながる。ホストが入れない限り、リンクを知っていても入れない
//  - ホストが中心の星形。参加者どうしはつながらない（参加者どうしで IP アドレスは見えない）
//  - 参加者は受け取るだけ。マイクは使わず、音は送らない
//  - 参加者はホストの部屋に入る: 部屋の画面は閉じられず（閉じる＝抜ける）、自分のライブラリや再生とは切り離す。
//    音量はパーティー用に別に持つ。入っている間、自分のプレイヤーは鳴らさない
//  - 部屋では入った人がそれぞれ猫になる（party-room.ts）。猫の動き・しぐさ・目線・チャットはホストが中継する
// 画面の文字はすべて esc() か textContent で入れる（相手の名前や曲名を HTML として読ませない）

import "./party.css";
import { ctx, esc } from "./modctx";
import { Mailbox, isRoomKey, newRoomKey, type Letter } from "./party-relay";
import { Room, cleanCoat, cleanName, cleanText, editorHtml, isEmote, isPerms, myCat, wireEditor, type Perms, type Req, type RoomCat } from "./party-room";
import { allTags, currentSet, setLabel, type AlbumSet } from "./tags";
import { albumOf, cleanAlbum, setShareSet, shareSet, cleanRows, cleanTracks, findAlbums, isThumb, nowId, resetIds, snapshotHome, thumbOf, tracksOf, type SnapAlbum, type SnapRow, type SnapTrack } from "./party-home";
import { setPartyEar, type Coat, type Emote } from "./cat";

const NAME_KEY = "kona.party.name";
const VOL_KEY = "kona.party.volume";
const ICE_KEY = "kona.party.ice";
const DEFAULT_ICE = "stun:stun.l.google.com:19302";
const HASH = "#party=";            // 招待リンク（# 以降はどのサーバーにも送られない）
const MAX_PEERS = 8;
const MAX_KNOCKS = 8;              // 返事を待っている「入れてください」の上限（それ以上は黙って捨てる）
const BITRATE = 128_000;           // 送る音の速さ（bps）

interface TrackInfo { title: string; artist: string; album: string }
type Msg =
  | { t: "peers"; host: string; names: string[] }
  | { t: "state"; track?: TrackInfo; playing: boolean; ext: boolean; id?: string }
  | { t: "bye" }
  // 部屋（参加者 → ホスト は id なし。ホストが送り主の id を付けて、ほかの人へ中継する）
  | { t: "cat"; coat: Coat }                                   // 参加者 → ホスト: この猫で入る
  | { t: "you"; id: string }                                   // ホスト → 参加者: あなたの猫の id
  | { t: "cats"; cats: RoomCat[]; perms: Perms }               // ホスト → 参加者: 部屋の様子まるごと
  | { t: "perm"; perms: Perms }                                // ホスト → 参加者: あなたができること
  | { t: "join"; cat: RoomCat } | { t: "part"; id: string }
  | { t: "go"; id?: string; p: number; x: number }
  | { t: "emote"; id?: string; e: Emote }
  | { t: "look"; id?: string; x?: number; y?: number }
  | { t: "say"; id?: string; text: string; to: string[]; req?: Req }
  // ホームの写し・リクエスト（参加者が頼み、ホストが権限を確かめて応える）
  | { t: "want"; w: "home" | "cover" | "tracks" | "find"; id?: string; q?: string }
  | { t: "home"; rows: SnapRow[]; albums: SnapAlbum[] }
  | { t: "albums"; albums: SnapAlbum[] }
  | { t: "cover"; id: string; url: string }
  | { t: "tracks"; id: string; tracks: SnapTrack[] }
  | { t: "found"; list: SnapAlbum[] }
  | { t: "req"; id: string; i?: number };

// 相手から届いたものは信用しない: 形と大きさを確かめてから使う（壊れたもの・知らないものは捨てる）
const MAX_TEXT = 2000, MAX_NAMES = 64;
const START = 0;                   // 入ったときの足場（いちばん上の棚。足場がなければ床）
const MAX_PLAT = 600;              // ホームの写しの足場の数の上限
const isAid = (x: unknown): x is string => typeof x === "string" && /^a\d{1,5}$/.test(x);
const isPlat = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= MAX_PLAT;
const isText = (x: unknown): x is string => typeof x === "string" && x.length <= MAX_TEXT;
const isId = (x: unknown): x is string => typeof x === "string" && /^[hg]\d{0,4}$/.test(x);
const isFrac = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
function asCat(x: unknown): RoomCat | undefined {
  const c = x as Record<string, unknown>, coat = cleanCoat(c?.coat);
  if (!c || !coat || !isId(c.id) || !isPlat(c.plat) || !isFrac(c.fx) || !isEmote(c.emote)) return undefined;
  return { id: c.id, name: cleanName(c.name), coat, plat: c.plat, fx: c.fx, emote: c.emote };
}
function isTrack(x: unknown): x is TrackInfo {
  const o = x as TrackInfo;
  return !!o && typeof o === "object" && isText(o.title) && isText(o.artist) && isText(o.album);
}
function asMsg(x: unknown): Msg | undefined {
  const m = x as Record<string, unknown>;
  if (!m || typeof m !== "object") return undefined;
  switch (m.t) {
    case "bye": return { t: "bye" };
    case "peers":
      return isText(m.host) && Array.isArray(m.names) && m.names.length <= MAX_NAMES && m.names.every(isText)
        ? { t: "peers", host: m.host, names: m.names as string[] } : undefined;
    case "state":
      if (typeof m.playing !== "boolean" || typeof m.ext !== "boolean") return undefined;
      if (m.track !== undefined && !isTrack(m.track)) return undefined;
      return { t: "state", track: m.track as TrackInfo | undefined, playing: m.playing, ext: m.ext, id: isAid(m.id) ? m.id : undefined };
    case "cat": { const coat = cleanCoat(m.coat); return coat ? { t: "cat", coat } : undefined; }
    case "you": return isId(m.id) ? { t: "you", id: m.id } : undefined;
    case "cats": {
      if (!Array.isArray(m.cats) || m.cats.length > MAX_PEERS + 1 || !isPerms(m.perms)) return undefined;
      const cats = m.cats.map(asCat);
      return cats.every(Boolean) ? { t: "cats", cats: cats as RoomCat[], perms: m.perms } : undefined;
    }
    case "join": { const cat = asCat(m.cat); return cat ? { t: "join", cat } : undefined; }
    case "part": return isId(m.id) ? { t: "part", id: m.id } : undefined;
    case "go": return (m.id === undefined || isId(m.id)) && isPlat(m.p) && isFrac(m.x) ? { t: "go", id: m.id, p: m.p, x: m.x } : undefined;
    case "emote": return (m.id === undefined || isId(m.id)) && isEmote(m.e) ? { t: "emote", id: m.id, e: m.e } : undefined;
    case "look":
      if (!(m.id === undefined || isId(m.id))) return undefined;
      return isFrac(m.x) && isFrac(m.y) ? { t: "look", id: m.id, x: m.x, y: m.y } : { t: "look", id: m.id };
    case "say": {
      const text = cleanText(m.text);
      const rq = m.req as Record<string, unknown> | undefined;
      const req = rq && isAid(rq.id) ? { id: rq.id, i: Number.isInteger(rq.i) && (rq.i as number) >= 0 && (rq.i as number) < 1000 ? rq.i as number : undefined, t: cleanText(rq.t), a: cleanText(rq.a), tr: rq.tr === undefined ? undefined : cleanText(rq.tr) } : undefined;
      if (!(text || req) || !(m.id === undefined || isId(m.id)) || !Array.isArray(m.to) || m.to.length > MAX_PEERS || !m.to.every(isId)) return undefined;
      return { t: "say", id: m.id, text, to: m.to as string[], req };
    }
    case "perm": return isPerms(m.perms) ? { t: "perm", perms: m.perms } : undefined;
    case "want": {
      if (m.w === "home") return { t: "want", w: "home" };
      if ((m.w === "cover" || m.w === "tracks") && isAid(m.id)) return { t: "want", w: m.w, id: m.id };
      if (m.w === "find" && typeof m.q === "string" && m.q.trim() && m.q.length <= 60) return { t: "want", w: "find", q: m.q };
      return undefined;
    }
    case "home": {
      const rows = cleanRows(m.rows);
      if (!rows || !Array.isArray(m.albums) || m.albums.length > 300) return undefined;
      return { t: "home", rows, albums: m.albums.map(cleanAlbum).filter((a): a is SnapAlbum => !!a) };
    }
    case "albums": return Array.isArray(m.albums) && m.albums.length <= 300 ? { t: "albums", albums: m.albums.map(cleanAlbum).filter((a): a is SnapAlbum => !!a) } : undefined;
    case "found": return Array.isArray(m.list) && m.list.length <= 20 ? { t: "found", list: m.list.map(cleanAlbum).filter((a): a is SnapAlbum => !!a) } : undefined;
    case "cover": return isAid(m.id) && isThumb(m.url) ? { t: "cover", id: m.id, url: m.url } : undefined;
    case "tracks": { const tracks = cleanTracks(m.tracks); return isAid(m.id) && tracks ? { t: "tracks", id: m.id, tracks } : undefined; }
    case "req": return isAid(m.id) && (m.i === undefined || (Number.isInteger(m.i) && (m.i as number) >= 0 && (m.i as number) < 1000)) ? { t: "req", id: m.id, i: m.i as number | undefined } : undefined;
  }
  return undefined;
}

interface Peer { id: string; pc: RTCPeerConnection; dc?: RTCDataChannel; name: string; open: boolean; timer: number; cid: string; inRoom?: boolean; bucket: number; at: number }

type Role = "idle" | "host" | "guest";
let role: Role = "idle";
let box: Mailbox | undefined;
let peers: Peer[] = [];            // ホスト: 参加者たち（つなぎかけを含む） / 参加者: ホストひとり
let knocks: { id: string; name: string }[] = [];   // ホスト: 入れるかどうかを待っている人
let roomKey = "", hostId = "";     // 招待リンクの中身（部屋の鍵・ホストの使い捨ての公開鍵）
let hostName = "", guestNames: string[] = [];
let relaysOpen = 0;
let ended = "";                    // 参加者: 終わった理由（画面に出す）
let guestStep: "name" | "knock" | "connect" | "in" = "name";
let knockTimer = 0, waitTimer = 0, stateTimer = 0;
let room: Room | undefined;        // 部屋（ホストは自分の部屋。参加者はホストの部屋）
let me = "";                       // 部屋での自分の猫の id（ホストは "h"）
let seq = 0;                       // ホスト: 参加者の猫に配る番号

// 参加者の側の音
let audio: HTMLAudioElement | undefined;
let last: Extract<Msg, { t: "state" }> | undefined;
let blocked = false;               // ブラウザに再生を止められた（押せば鳴る）
let earCtx: AudioContext | undefined;

const myName = () => { try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; } };
const iceText = () => { try { return localStorage.getItem(ICE_KEY) ?? DEFAULT_ICE; } catch { return DEFAULT_ICE; } };
const label = (n: string) => n || "名無し";
const partyVol = () => { try { const v = Number(localStorage.getItem(VOL_KEY) ?? 0.8); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8; } catch { return 0.8; } };

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
/** 経路の候補を集め終えるまで待つ（候補を全部入れて、やり取りを 1 往復で済ませる） */
function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise(resolve => {
    const done = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", done); resolve(); } };
    pc.addEventListener("icegatheringstatechange", done);
    setTimeout(resolve, 6000);   // STUN に届かないときも、集まった分で進む
  });
}
/** Opus を音楽向けに: ステレオで、ビットレートを上げ、無音の間引き（DTX）をしない */
function musicSdp(sdp: string): string {
  const pt = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i)?.[1];
  if (!pt) return sdp;
  return sdp.replace(new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`), (_, p: string) => {
    const kept = p.split(";").filter(x => !/^(stereo|sprop-stereo|maxaveragebitrate|usedtx|cbr)=/.test(x.trim()));
    return `a=fmtp:${pt} ${[...kept, "stereo=1", "sprop-stereo=1", `maxaveragebitrate=${BITRATE}`, "usedtx=0"].join(";")}`;
  });
}
async function describe(pc: RTCPeerConnection, d: RTCSessionDescriptionInit) {
  await pc.setLocalDescription({ type: d.type, sdp: musicSdp(d.sdp ?? "") });
  await gathered(pc);
  return pc.localDescription!.sdp;
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

function openBox(key: string, onLetter: (l: Letter) => void): Mailbox {
  const b = new Mailbox(key, onLetter);
  b.onStatus = n => { relaysOpen = n; update(); };
  b.open().catch(() => {});
  return b;
}

// ---------- ホスト ----------
function host() {
  leave(true);
  role = "host"; ended = ""; hostName = myName();
  // 音の取り出し口は、押したその場で作る（AudioContext は操作の直後でないと動かないことがある）
  ctx().player.partyTrack();
  me = "h"; seq = 0;
  room = makeRoom(true);
  room.cats.set("h", { id: "h", name: cleanName(hostName), coat: myCat(), plat: START, fx: .5, emote: "sit" });
  room.setPerms(ALL);
  resetIds(); setShareSet(pickedSet === undefined ? currentSet() : pickedSet); defaults = { chat: false, request: false }; overrides.clear();
  newLink();
  stateTimer = window.setInterval(() => broadcast(snapshot()), 3000);
  render();
}
/** 招待リンクを作る（作り直すと前のリンクでは入れない。いまいる人はそのまま） */
function newLink() {
  box?.close();
  roomKey = newRoomKey(); knocks = []; relaysOpen = 0;
  box = openBox(roomKey, hostLetter);
  hostId = box.me;
  render();
}
function hostLetter(l: Letter) {
  if (role !== "host") return;
  if (l.note.t === "knock") {
    if (peers.some(p => p.id === l.from)) return;   // つなぎかけの人の、くり返しの「入れてください」
    const k = knocks.find(x => x.id === l.from);
    if (k) return;
    if (knocks.length >= MAX_KNOCKS) return;
    knocks.push({ id: l.from, name: l.note.name.slice(0, 40) });
    toastIn(`${label(l.note.name)}さんが入りたがっています`);
    render();
  } else if (l.note.t === "answer") {
    const peer = peers.find(p => p.id === l.from && !p.open);
    if (peer && peer.pc.signalingState === "have-local-offer") peer.pc.setRemoteDescription({ type: "answer", sdp: musicSdp(l.note.sdp) }).catch(() => dropped(peer));
  }
}
async function admit(id: string) {
  const k = knocks.find(x => x.id === id);
  if (!k || !box) return;
  knocks = knocks.filter(x => x !== k);
  if (peers.length >= MAX_PEERS) { box.send(id, { t: "no" }); render(); return; }
  const pc = newPc(), peer: Peer = { id, pc, name: k.name, open: false, timer: 0, cid: `g${++seq}`, bucket: 20, at: performance.now() };
  peers.push(peer);
  wire(peer, pc.createDataChannel("kona", { ordered: true }));
  const track = ctx().player.partyTrack();
  const tr = pc.addTransceiver(track ?? "audio", { direction: "sendonly", streams: track ? [new MediaStream([track])] : [] });
  // つながらないまま 40 秒たったらあきらめる
  peer.timer = window.setTimeout(() => { if (!peer.open) { dropped(peer); toastFn?.(`${label(peer.name)}さんとつながりませんでした`); } }, 40_000);
  render();
  try {
    const sdp = await describe(pc, await pc.createOffer());
    if (!peers.includes(peer)) return;
    await box.send(id, { t: "offer", name: hostName, sdp });
    const p = tr.sender.getParameters();
    if (p.encodings?.length) { p.encodings[0].maxBitrate = BITRATE; tr.sender.setParameters(p).catch(() => {}); }
  } catch { dropped(peer); }
}
function refuse(id: string) {
  knocks = knocks.filter(x => x.id !== id);
  box?.send(id, { t: "no" });
  render();
}

// ---------- 部屋 ----------
// 権限: 部屋の既定と、人ごとの上書き（ホストだけが持ち、確かめるのもホスト）
let defaults: Perms = { chat: false, request: false };
const overrides = new Map<string, Partial<Perms>>();
const ALL: Perms = { chat: true, request: true };
const permsOf = (cid: string): Perms => cid === "h" ? ALL : { ...defaults, ...overrides.get(cid) };
const can = (peer: Peer, k: keyof Perms) => permsOf(peer.cid)[k];

function makeRoom(isHost: boolean): Room {
  return new Room({
    me, host: isHost,
    go(p, x) { if (blocked) playParty(); room?.go(me, p, x); isHost ? relay({ t: "go", id: me, p, x }) : toHost({ t: "go", p, x }); },
    emote(e) { if (blocked) playParty(); room?.emote(me, e); isHost ? relay({ t: "emote", id: me, e }) : toHost({ t: "emote", e }); },
    look(pt) { const m: Msg = pt ? { t: "look", x: pt[0], y: pt[1] } : { t: "look" }; isHost ? relay({ ...m, id: me } as Msg) : toHost(m); },
    say(text, to) {
      if (!isHost) return toHost({ t: "say", text, to });
      deliver({ t: "say", id: me, text, to });
    },
    exit() { if (isHost) room?.close(); else { leave(); closeDlg(); } },
    want(w) {
      if (!isHost) return toHost(w.t === "find" ? { t: "want", w: "find", q: w.q } : w.t === "home" ? { t: "want", w: "home" } : { t: "want", w: w.t, id: w.id });
      // ホストは手元で用意する
      if (w.t === "home") { const h = snapshotHome(); if (h) room?.setHome(h.rows, h.albums); }
      else if (w.t === "cover") thumbOf(w.id).then(u => { if (u) room?.setCover(w.id, u); });
      else if (w.t === "tracks") tracksOf(w.id).then(t => { if (t) room?.setTracks(w.id, t); });
      else if (w.t === "find") room?.showFound(findAlbums(w.q));
    },
    request(id, i) { toHost({ t: "req", id, i }); },
    perm: isHost ? (k, val, guest) => {
      if (guest) { const o = { ...overrides.get(guest) }; if (val === undefined) delete o[k]; else o[k] = val; overrides.set(guest, o); }
      else defaults = { ...defaults, [k]: !!val };
      for (const p of peers) if (p.inRoom && (!guest || p.cid === guest)) send(p, { t: "perm", perms: permsOf(p.cid) });
    } : undefined,
    permsOf: isHost ? () => ({ defaults, guests: overrides }) : undefined,
    play: isHost ? (id, i) => { const a = albumOf(id); if (a) ctx().player.playAlbum(a, i); } : undefined,
    volume: isHost ? undefined : { get: partyVol, set: v => { try { localStorage.setItem(VOL_KEY, String(v)); } catch { /* ignore */ } applyOut(); } },
  });
}
const toHost = (m: Msg) => { const h = peers[0]; if (h) send(h, m); };
/** ホスト: 部屋に入っている参加者（except 以外）に送る */
function relay(m: Msg, except?: Peer) { for (const p of peers) if (p.inRoom && p !== except) send(p, m); }
/** ホスト: チャットを届ける。全員宛てなら全員に、個別なら宛先と送り主にだけ（ホストの画面にも、宛先か送り主のときだけ出す） */
function deliver(m: Extract<Msg, { t: "say" }>) {
  if (!room) return;
  const to = m.to.filter(id => room!.cats.has(id) && id !== m.id);
  if (m.to.length && !to.length) return;
  const line = { from: m.id!, text: m.text, to, at: Date.now(), req: m.req }, out: Msg = { ...m, to };
  for (const p of peers) if (p.inRoom && (!to.length || to.includes(p.cid) || p.cid === m.id)) send(p, out);
  if (!to.length || to.includes("h") || m.id === "h") room.said(line);
}
/** ホスト: ホームの写しを送る（アルバムは 300 枚ずつ） */
function sendHome(peer: Peer) {
  const h = snapshotHome();
  if (!h) return;
  send(peer, { t: "home", rows: h.rows, albums: h.albums.slice(0, 300) });
  for (let i = 300; i < h.albums.length; i += 300) send(peer, { t: "albums", albums: h.albums.slice(i, i + 300) });
}
/** ホスト: 参加者から届いた部屋のこと。送り主の猫の id を付け、権限を確かめてから映し、中継する */
function hostRoom(peer: Peer, m: Msg) {
  if (!room) return;
  // 送りすぎを抑える（目線は 1 秒に 20 回ほど、ほかはもっと少なく）
  const t = performance.now();
  peer.bucket = Math.min(40, peer.bucket + (t - peer.at) / 50); peer.at = t;
  const cost = m.t === "look" ? 1 : m.t === "want" ? (m.w === "home" ? 30 : m.w === "find" ? 6 : 2) : m.t === "say" || m.t === "req" ? 10 : 3;
  if (peer.bucket < cost) return;
  peer.bucket -= cost;
  const id = peer.cid;
  if (m.t === "cat") {
    if (peer.inRoom) return;
    const cat: RoomCat = { id, name: cleanName(peer.name), coat: m.coat, plat: START, fx: .15 + Math.random() * .7, emote: "sit" };
    room.add(cat);
    peer.inRoom = true;
    send(peer, { t: "you", id });
    send(peer, { t: "cats", cats: [...room.cats.values()], perms: permsOf(id) });
    relay({ t: "join", cat }, peer);
    sendHome(peer);
    return;
  }
  if (!peer.inRoom) return;
  if (m.t === "go") { room.go(id, m.p, m.x); relay({ t: "go", id, p: m.p, x: m.x }, peer); }
  else if (m.t === "emote") { room.emote(id, m.e); relay({ t: "emote", id, e: m.e }, peer); }
  else if (m.t === "look") { const pt = m.x !== undefined ? [m.x, m.y!] as [number, number] : undefined; room.look(id, pt); relay({ t: "look", id, x: m.x, y: m.y }, peer); }
  else if (m.t === "say") { if (can(peer, "chat") && m.text) deliver({ t: "say", id, text: m.text, to: m.to }); }
  else if (m.t === "want") {
    // 部屋はホームの写しなので、棚・ジャケット・曲目はだれでも見られる。探すのはリクエストできる人だけ
    if (m.w === "home") sendHome(peer);
    else if (m.w === "find" && can(peer, "request")) send(peer, { t: "found", list: findAlbums(m.q!) });
    else if (m.w === "cover" && albumOf(m.id!)) thumbOf(m.id!).then(url => { if (url) send(peer, { t: "cover", id: m.id!, url }); });
    else if (m.w === "tracks" && albumOf(m.id!)) tracksOf(m.id!).then(tracks => { if (tracks) send(peer, { t: "tracks", id: m.id!, tracks }); });
  }
  else if (m.t === "req") {
    const a = albumOf(m.id);
    if (!a || !can(peer, "request")) return;
    const tr = m.i !== undefined ? a.tracks[m.i] : undefined;
    if (m.i !== undefined && !tr) return;
    const req: Req = { id: m.id, i: m.i, t: a.title.slice(0, 200), a: (a.artist ?? "").slice(0, 200), tr: tr ? (tr.title ?? "").slice(0, 200) : undefined };
    deliver({ t: "say", id, text: "", to: [], req });
    toastIn(`${label(peer.name)}さんから「${req.tr ?? req.t}」のリクエスト`);
  }
}
/** 参加者: ホストから届いた部屋のこと */
function guestRoom(m: Msg) {
  if (m.t === "you") {
    me = m.id;
    room?.close();
    room = makeRoom(false);
    return;
  }
  if (!room) return;
  if (m.t === "cats") {
    room.cats.clear();
    m.cats.forEach(c => room!.cats.set(c.id, c));
    room.setPerms(m.perms);
    closeDlg();
    room.open();
    update();
  }
  else if (m.t === "perm") room.setPerms(m.perms);
  else if (m.t === "join") room.add(m.cat);
  else if (m.t === "part" && m.id !== me) room.remove(m.id);
  else if (m.t === "go" && m.id && m.id !== me) room.go(m.id, m.p, m.x);
  else if (m.t === "emote" && m.id && m.id !== me) room.emote(m.id, m.e);
  else if (m.t === "look" && m.id && m.id !== me) room.look(m.id, m.x !== undefined ? [m.x, m.y!] : undefined);
  else if (m.t === "say" && m.id) room.said({ from: m.id, text: m.text, to: m.to, at: Date.now(), req: m.req });
  else if (m.t === "home") room.setHome(m.rows, m.albums);
  else if (m.t === "albums") room.addAlbums(m.albums);
  else if (m.t === "cover") room.setCover(m.id, m.url);
  else if (m.t === "tracks") room.setTracks(m.id, m.tracks);
  else if (m.t === "found") room.showFound(m.list);
}
function openRoom() { if (role === "host" && room) { closeDlg(); room.open(); update(); } }

// ---------- 参加者 ----------
function startGuest(key: string, host: string) {
  leave(true);
  role = "guest"; ended = ""; guestStep = "name"; roomKey = key; hostId = host; hostName = "";
  render();
}
function knock() {
  if (role !== "guest" || guestStep !== "name") return;
  guestStep = "knock"; relaysOpen = 0;
  box = openBox(roomKey, guestLetter);
  // ホストが席を外していても届くよう、返事があるまで少しずつ間をあけてくり返す
  let n = 0;
  const again = () => { if (role === "guest" && guestStep === "knock") { box?.send(hostId, { t: "knock", name: myName() }); knockTimer = window.setTimeout(again, Math.min(15_000, 3000 + n++ * 1000)); } };
  knockTimer = window.setTimeout(again, 800);
  waitTimer = window.setTimeout(() => { if (role === "guest" && guestStep !== "in") end(relaysOpen ? "ホストから返事がありませんでした" : "仲介のリレーにつながりませんでした"); }, 5 * 60_000);
  quiet();
  blocked = false;
  render();
}
async function guestLetter(l: Letter) {
  // ホスト（招待リンクに書かれた公開鍵）からの知らせだけを読む。部屋の鍵を知るほかの人がホストをかたれないように
  if (role !== "guest" || l.from !== hostId) return;
  if (l.note.t === "no") { end("ホストが入れませんでした"); return; }
  if (l.note.t !== "offer" || guestStep !== "knock") return;
  guestStep = "connect"; clearTimeout(knockTimer);
  hostName = l.note.name;
  const pc = newPc(), peer: Peer = { id: l.from, pc, name: l.note.name, open: false, timer: 0, cid: "h", bucket: 0, at: 0 };
  peers = [peer];
  pc.ondatachannel = e => wire(peer, e.channel);
  pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState)) dropped(peer); };
  pc.ontrack = e => hear(e.streams[0] ?? new MediaStream([e.track]));
  render();
  try {
    await pc.setRemoteDescription({ type: "offer", sdp: l.note.sdp });
    // 受け取るだけ（マイクは使わない）
    pc.getTransceivers().forEach(t => { if (t.receiver.track.kind === "audio") t.direction = "recvonly"; });
    const sdp = await describe(pc, await pc.createAnswer());
    await box?.send(hostId, { t: "answer", sdp });
    peer.timer = window.setTimeout(() => { if (!peer.open) end("つながりませんでした（回線の組み合わせによってはつながりません。つなぎ方の設定で TURN を足すとつながることがあります）"); }, 40_000);
  } catch { end("つながりませんでした"); }
}
function hear(stream: MediaStream) {
  if (!audio) { audio = new Audio(); audio.autoplay = true; }
  audio.srcObject = stream;
  applyOut();
  // 部屋の猫の耳: 届いた音の大きさから拍を拾う（リズムをとる）
  try {
    earCtx?.close().catch(() => {});
    earCtx = new AudioContext();
    const an = earCtx.createAnalyser(), buf = new Float32Array(1024);
    an.fftSize = 1024;
    earCtx.createMediaStreamSource(stream).connect(an);
    setPartyEar(() => { an.getFloatTimeDomainData(buf); let n = 0; for (const v of buf) n += v * v; return Math.sqrt(n / buf.length); });
  } catch { /* 拍が拾えなくても、ゆったりしたリズムでとる */ }
  playParty();
}
function playParty() {
  if (!audio) return;
  audio.play().then(() => { blocked = false; update(); }).catch(() => { blocked = true; update(); });
}
/** 参加者の音量はパーティー用に別に持つ（2 乗のカーブ）。出力先だけは、この端末の設定（スピーカーかイヤホンか）にそろえる */
function applyOut() {
  if (!audio) return;
  const v = partyVol();
  audio.volume = v * v;
  const a = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void>; sinkId?: string };
  const sink = ctx().player.sink;
  if (a.setSinkId && a.sinkId !== sink) a.setSinkId(sink).catch(() => {});
}
/** 部屋にいる間は、自分のプレイヤーを鳴らさない（メディアキーなどで鳴り出しても止める） */
function quiet() { const p = ctx().player; if (p.playing) p.toggle(); }

function opened(peer: Peer) {
  clearTimeout(peer.timer);
  if (role === "host") {
    sendPeers();
    send(peer, snapshot());
    room?.cats.set("h", { ...room.cats.get("h")!, name: cleanName(hostName) });
    toastIn(`${label(peer.name)}さんが参加しました`);
  } else {
    guestStep = "in"; clearTimeout(waitTimer);
    send(peer, { t: "cat", coat: myCat() });   // この猫で部屋に入る
    // つながったら郵便受けは閉じる（参加者はもうリレーを使わない）
    box?.close(); box = undefined;
  }
  render();
}
function dropped(peer: Peer) {
  if (!peers.includes(peer)) return;
  clearTimeout(peer.timer);
  peers = peers.filter(p => p !== peer);
  const was = peer.open;
  peer.open = false;
  try { peer.pc.close(); } catch { /* ignore */ }
  if (role === "host") {
    sendPeers();
    if (peer.inRoom) { room?.remove(peer.cid); relay({ t: "part", id: peer.cid }); }
    if (was) toastIn(`${label(peer.name)}さんが抜けました`);
  }
  else end(was ? "ホストとの接続が切れました" : "つながりませんでした");
  render();
}
function received(peer: Peer, m: Msg) {
  if (m.t === "bye") { dropped(peer); return; }
  if (role === "host") { hostRoom(peer, m); return; }   // ホストが参加者から受け取るのは、抜けますと部屋のことだけ
  if (m.t === "peers") { hostName = m.host; guestNames = m.names; update(); }
  else if (m.t === "state") { last = m; update(); }
  else guestRoom(m);
}
function sendPeers() { broadcast({ t: "peers", host: hostName, names: peers.filter(p => p.open).map(p => p.name) }); }
function snapshot(): Msg {
  const p = ctx().player, a = p.album, t = p.track;
  return { t: "state", track: a && t ? { title: t.title, artist: a.artist, album: a.title } : undefined, playing: p.playing, ext: p.external, id: a ? nowId() : undefined };
}

function end(why: string) {
  const keep = role === "guest";
  leave(true);
  if (keep) { role = "guest"; ended = why; }
  render();
  if (keep && !dlg) openParty();   // 部屋の画面は閉じたので、終わった理由をダイアログで知らせる
}
/** パーティーを閉じる・抜ける */
function leave(quiet = false) {
  broadcast({ t: "bye" });
  for (const p of peers) { clearTimeout(p.timer); p.open = false; try { p.pc.close(); } catch { /* ignore */ } }
  box?.close(); box = undefined;
  clearTimeout(knockTimer); clearTimeout(waitTimer); clearInterval(stateTimer);
  if (audio) { audio.pause(); audio.srcObject = null; }
  setPartyEar(); earCtx?.close().catch(() => {}); earCtx = undefined;
  room?.close(); room = undefined; me = "";
  peers = []; knocks = []; roomKey = hostId = ""; ended = ""; last = undefined; guestNames = []; relaysOpen = 0;
  role = "idle";
  if (!quiet) render();
}

// ---------- 画面 ----------
let dlg: HTMLElement | undefined;
let lastFocus: HTMLElement | null = null;
let shown = "";   // いま描いている場面（場面が変わったときだけ作り直し、入力中の文字を消さない）
let toastFn: ((t: string) => void) | undefined;
const toastIn = (t: string) => { if (!dlg) toastFn?.(t); };

function phase(): string {
  if (role === "host") return "host";
  if (role === "guest") return ended ? "guest-ended" : `guest-${guestStep}`;
  return "idle";
}

export function openParty() {
  if (!dlg) {
    lastFocus = document.activeElement as HTMLElement | null;
    dlg = document.createElement("div");
    dlg.className = "dlg-back";
    dlg.innerHTML = `<div class="dlg party" role="dialog" aria-modal="true" aria-labelledby="party-title">
      <div class="dlg-head"><h2 id="party-title">リスニングパーティー</h2><button class="dlg-x" aria-label="閉じる">×</button></div>
      <div class="dlg-body"></div></div>`;
    dlg.addEventListener("pointerdown", e => { if (e.target === dlg && !inRoom()) closeDlg(); });
    dlg.querySelector<HTMLElement>(".dlg-x")!.onclick = () => { if (inRoom()) leave(); closeDlg(); };
    document.body.append(dlg);
    addEventListener("keydown", onKey, true);
  }
  shown = "";
  render();
}
function closeDlg() {
  dlg?.remove(); dlg = undefined; shown = "";
  removeEventListener("keydown", onKey, true);
  lastFocus?.focus?.();
}
// 参加者は部屋の中にいる: 背景を押しても Esc でも閉じない（閉じるのは「抜ける」か ×）
const inRoom = () => role === "guest" && !ended;
const onKey = (e: KeyboardEvent) => {
  // 部屋の外（自分のプレイヤー）への近道キーは届かせない
  if (inRoom()) { if (e.key === "Escape" || !dlg?.contains(e.target as Node)) e.stopPropagation(); return; }
  if (e.key === "Escape") { e.stopPropagation(); closeDlg(); }
};

const PRIVACY = `<p class="dlg-note">つなぐための情報は、公開の Nostr リレーを通して暗号化して受け渡します（鍵は招待リンクの中だけにあり、リレーには読めません）。つながるとホストと参加者の間でお互いの IP アドレスが見えるので、知っている人とだけ使ってください。参加者どうしはつながりません。</p>`;
const nameField = () => `<label class="dlg-field"><span>あなたの名前（相手に見えます）</span><input id="party-name" type="text" maxlength="40" autocomplete="nickname" value="${esc(myName())}"></label>`;
/** 送るアルバムのセット（タグ）を選ぶ欄。タグがなければ出さない */
const setKey = (s: AlbumSet | null) => !s ? "" : `${s.not ? "-" : "+"}${s.tag}`;
const SHARE = (s: AlbumSet | null) => {
  const tags = allTags();
  if (!tags.length) return "";
  const opt = (v: AlbumSet | null) => `<option value="${esc(setKey(v))}"${setKey(v) === setKey(s) ? " selected" : ""}>${esc(setLabel(v))}</option>`;
  return `<label class="dlg-field"><span>見せるアルバム（タグで絞る。外のアルバムは棚・ジャケット・曲目・検索・リクエストのどれにも出しません）</span>
    <select id="party-set">${opt(null)}${tags.map(t => opt({ tag: t, not: false })).join("")}${tags.map(t => opt({ tag: t, not: true })).join("")}</select></label>`;
};
const parseSet = (v: string): AlbumSet | null => !v ? null : { tag: v.slice(1), not: v[0] === "-" };
let pickedSet: AlbumSet | null | undefined;   // 開く前に選んだセット（未選択なら上の帯のセット）
/** ホスト: 送るアルバムのセットを変え、部屋にいる人へホームの写しを送り直す */
function changeShare(s: AlbumSet | null) {
  pickedSet = s;
  if (role !== "host") return;
  setShareSet(s);
  const h = snapshotHome();
  if (h) room?.setHome(h.rows, h.albums);
  for (const p of peers) if (p.inRoom) sendHome(p);
}
const ICE = () => `<details class="party-ice"><summary>つなぎ方の設定</summary>
  <label class="dlg-field"><span>STUN / TURN サーバー（空白区切り。空にすると同じ LAN の中だけでつなぐ）</span>
    <input id="party-ice" type="text" spellcheck="false" autocapitalize="off" value="${esc(iceText())}" placeholder="stun:… turn:…?username=…&amp;credential=…"></label>
  <p class="dlg-note">既定は Google の公開 STUN（相手までの道を調べるのに、あなたの IP アドレスが Google に届きます）。家庭のルーターどうしでつながらないときは、自分で用意した TURN を書いてください。</p>
</details>`;

function render() {
  renderPill();
  if (!dlg) return;
  const ph = phase();
  if (ph === shown) { update(); return; }
  shown = ph;
  const body = dlg.querySelector<HTMLElement>(".dlg-body")!;
  const h = (s: string) => { body.innerHTML = s; };
  const x = dlg.querySelector<HTMLElement>(".dlg-x")!;
  x.setAttribute("aria-label", inRoom() ? "抜ける" : "閉じる");
  dlg.classList.toggle("party-room", inRoom());
  if (ph === "idle") h(`
    <p class="dlg-lead">あなたが流している音を、そのまま友だちに届けて一緒に聴きます。相手は曲を持っていなくても聴けます（少し遅れて届きます。Spotify の曲は届けられません）。入った人は猫になって、あなたのホーム（の写し）に集まります。</p>
    ${nameField()}
    ${SHARE(pickedSet === undefined ? currentSet() : pickedSet)}
    ${editorHtml()}
    <div class="dlg-actions"><button class="btn primary" id="party-host">パーティーを開く</button></div>
    <p class="dlg-note">参加するときは、ホストから届いた招待リンクを開いてください。</p>
    ${PRIVACY}${ICE()}`);
  else if (ph === "host") h(`
    <p class="dlg-lead">この招待リンクを、一緒に聴く人に送ってください。開いた人が名乗ると、ここに出ます。「入れる」を押した人だけがつながります。</p>
    <input class="party-code" id="party-out" readonly value="${esc(inviteLink())}">
    <div class="party-row">
      <button class="btn" data-copy>リンクをコピー</button>
      ${"share" in navigator ? `<button class="btn" data-share>送る…</button>` : ""}
      <button class="btn" id="party-renew">リンクを作り直す</button>
    </div>
    <p class="dlg-note party-wait" id="party-relay"></p>
    <div class="party-knocks" id="party-knocks"></div>
    <div class="party-people" id="party-people"></div>
    ${SHARE(shareSet())}
    <p class="dlg-note">いつもどおりに曲を選んで操作してください。EQ をかけた音がそのまま届きます。</p>
    <div class="dlg-actions"><button class="btn primary" id="party-room">みんなのいるホームを開く</button><button class="btn" id="party-leave">パーティーを閉じる</button></div>`);
  else if (ph === "guest-name") h(`
    <p class="dlg-lead">リスニングパーティーに招かれています。名前と猫を決めて名乗ると、ホストに「入れてください」が届きます。入っている間は、ホストのホーム（の写し）で猫になって、ホストの流す音だけを聴きます（あなたのライブラリや再生には触れません）。</p>
    ${nameField()}
    ${editorHtml()}
    <div class="dlg-actions"><button class="btn primary" id="party-knock">入れてもらう</button><button class="btn" id="party-leave">やめる</button></div>
    ${PRIVACY}${ICE()}`);
  else if (ph === "guest-knock" || ph === "guest-connect") h(`
    <p class="dlg-lead party-wait" id="party-relay"></p>
    <div class="dlg-actions"><button class="btn" id="party-leave">やめる</button></div>`);
  else if (ph === "guest-in") h(`
    <p class="dlg-lead party-wait"><b>${esc(label(hostName))}</b>さんのホームに入っています…</p>
    <div class="dlg-actions"><button class="btn" id="party-leave">やめる</button></div>`);
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
  $<HTMLButtonElement>("#party-knock")?.addEventListener("click", () => { keepName(); knock(); });
  $<HTMLButtonElement>("#party-renew")?.addEventListener("click", () => { newLink(); shown = ""; render(); });
  $<HTMLButtonElement>("#party-leave")?.addEventListener("click", () => leave());
  $<HTMLButtonElement>("#party-done")?.addEventListener("click", () => { leave(); closeDlg(); });
  $<HTMLButtonElement>("#party-room")?.addEventListener("click", openRoom);
  const pick = $<HTMLSelectElement>("#party-set");
  if (pick) pick.onchange = () => changeShare(parseSet(pick.value));
  wireEditor(body, () => name?.value.trim() ?? myName());
  body.querySelector<HTMLButtonElement>("[data-copy]")?.addEventListener("click", e => copy(e.currentTarget as HTMLButtonElement, inviteLink()));
  body.querySelector<HTMLButtonElement>("[data-share]")?.addEventListener("click", () => navigator.share?.({ title: "Kona のリスニングパーティー", url: inviteLink() }).catch(() => {}));
  // 入れる・断るは、描き直しても効くよう委ねる
  body.onclick = e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-admit],[data-refuse]");
    if (!b) return;
    if (b.dataset.admit) admit(b.dataset.admit); else if (b.dataset.refuse) refuse(b.dataset.refuse);
  };
  update();
}
function inviteLink() { return `${location.origin}${location.pathname}${HASH}${roomKey}.${hostId}`; }
function copy(b: HTMLButtonElement, text: string) {
  const was = b.textContent;
  navigator.clipboard?.writeText(text).then(() => { b.textContent = "コピーしました"; setTimeout(() => b.textContent = was, 1500); })
    .catch(() => dlg?.querySelector<HTMLInputElement>("#party-out")?.select());
}

/** 場面はそのままで、動く部分（リレー・入りたい人・参加者・再生中）だけを書き換える */
function update() {
  renderPill();
  // 棚にないアルバムが流れ始めたら、札に出せるよう題名だけ足しておく
  if (room && role === "guest" && last?.id && last.track && !room.albums.has(last.id)) room.addAlbums([{ id: last.id, t: last.track.album, a: last.track.artist, c: "#555", n: 0 }]);
  room?.setNow(nowText(), role === "host" ? (ctx().player.album ? nowId() : undefined) : last?.id);
  if (!dlg) return;
  const out = dlg.querySelector<HTMLInputElement>("#party-out");
  if (out && out.value !== inviteLink()) out.value = inviteLink();
  const relay = dlg.querySelector<HTMLElement>("#party-relay");
  if (relay) relay.textContent = role === "host"
    ? (relaysOpen ? `仲介のリレー ${relaysOpen} つにつながっています` : "仲介のリレーにつないでいます…")
    : guestStep === "connect" ? `${label(hostName)}さんとつないでいます…`
    : relaysOpen ? "ホストが入れてくれるのを待っています…" : "仲介のリレーにつないでいます…";
  const kn = dlg.querySelector<HTMLElement>("#party-knocks");
  if (kn) kn.innerHTML = knocks.map(k => `<div class="party-knock"><span><b>${esc(label(k.name))}</b>さんが入りたがっています</span>
      <button class="btn primary" data-admit="${esc(k.id)}" ${peers.length >= MAX_PEERS ? "disabled" : ""}>入れる</button><button class="btn" data-refuse="${esc(k.id)}">断る</button></div>`).join("");
  const people = dlg.querySelector<HTMLElement>("#party-people");
  if (people) {
    const list = role === "host" ? [`${label(hostName)}（あなた・ホスト）`, ...peers.map(p => label(p.name) + (p.open ? "" : "（つないでいます…）"))]
      : [`${label(hostName)}（ホスト）`, ...guestNames.map(n => label(n))];
    people.innerHTML = `<span class="dlg-note">参加している人 ${list.length}</span><ul>${list.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`;
  }
}

/** 部屋の下の帯に出す「いま流れているもの」 */
function nowText(): string {
  const st = role === "host" ? snapshot() as Extract<Msg, { t: "state" }> : last, t = st?.track;
  if (role === "guest" && blocked) return "ブラウザに音を止められました。画面のどこかを押すと鳴ります";
  if (!st) return "待っています…";
  if (!t) return role === "host" ? "何も流していません" : "ホストは何も流していません";
  const what = `${t.title} — ${[t.artist, t.album].filter(Boolean).join(" · ")}`;
  if (st.ext) return `${what}（Spotify の曲は届けられません）`;
  return `${st.playing ? "♪ " : "一時停止中 · "}${what}`;
}

// パーティーを開いている間だけ、ホストの上の帯に人数の札を出す（押すとパーティーの画面）。参加者は部屋の画面の中にいるので出さない
function renderPill() {
  let pill = document.getElementById("party-pill") as HTMLButtonElement | null;
  const on = role === "host";
  if (!on) { pill?.remove(); return; }
  if (!pill) {
    pill = document.createElement("button");
    pill.id = "party-pill"; pill.className = "party-pill";
    pill.onclick = () => openParty();
  }
  // スマホ版の画面が出ていればその上の帯、そうでなければ PC の上の帯
  const m = document.querySelector<HTMLElement>(".m .m-top .m-more");
  const anchor = m?.offsetParent ? m : document.getElementById("invite");
  if (anchor && pill.nextElementSibling !== anchor) anchor.before(pill);
  const live = peers.filter(p => p.open).length;
  const n = live + 1;
  pill.innerHTML = `<i></i>${knocks.length ? `${n}人 · ${knocks.length}人待ち` : `${n}人`}`;
  pill.title = "リスニングパーティー（ホスト）";
  pill.setAttribute("aria-label", pill.title);
}

/** main から一度だけ呼ぶ。招待リンクから開いたなら、参加の画面を出す */
export function initParty(opts: { toast: (t: string) => void }) {
  toastFn = opts.toast;
  if (!partySupported()) return;
  ctx().player.on(() => {
    if (role === "host") broadcast(snapshot());
    else if (inRoom() && guestStep !== "name") quiet();
  });
  addEventListener("pagehide", () => broadcast({ t: "bye" }));
  if (location.hash.startsWith(HASH)) {
    const [key, id] = decodeURIComponent(location.hash.slice(HASH.length)).split(".");
    // リンクは開いたらすぐ消す（履歴や画面に部屋の鍵を残さない）
    history.replaceState(null, "", location.pathname + location.search + "#home");
    if (key && isRoomKey(key) && /^[0-9a-f]{64}$/.test(id ?? "")) { startGuest(key, id); setTimeout(() => openParty(), 300); }
    else setTimeout(() => toastFn?.("招待リンクが壊れています"), 300);
  }
}
export const partySupported = () => "RTCPeerConnection" in window && "crypto" in window && !!crypto.subtle;
