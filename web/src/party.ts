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

import { t, t as tr, t as tx, tp } from "./i18n";
import "./party.css";
import { ctx, esc } from "./modctx";
import { Mailbox, b64, isRoomKey, newRoomKey, unb64, type Letter } from "./party-relay";
import { Room, startSpot, cleanCoat, cleanName, cleanText, editorHtml, isEmote, isPerms, myCat, wireEditor, type Perms, type Req, type RoomCat } from "./party-room";
import { allTags, currentSet, setLabel, type AlbumSet } from "./tags";
import { albumOf, cleanAlbum, cleanSize, sizeOf, setShareSet, shareSet, cleanRows, cleanTracks, cleanLook, snapLook, findAlbums, idFor, isThumb, nowId, resetIds, safeColor, snapshotHome, snapAlbum, thumbOf, tracksOf, type HomeSource, type SnapAlbum, type SnapLook, type SnapRow, type SnapSize, type SnapTrack } from "./party-home";
import { HostVoice, GuestVoice } from "./party-voice";
import { MirrorPlayer, MirrorHistory, type NowState } from "./party-mirror";
import { currentPeaks } from "./modules";
import { BANDS } from "./eq";
import { playLog, stat, listenedSeconds, type PlayEvent } from "./store";
import type { Album } from "./library";
import { setPartyEar, setCatsAway, type Coat, type Emote } from "./cat";
import { hereLand, isLand, landName } from "./region";
import { giftable, giftToday, gave, receiveGift } from "./presents";
import { itemOf } from "./items";
import { iceServers, relayHTML, relayReady, relayStatusHTML, wireRelay } from "./party-ice";

const NAME_KEY = "kona.party.name";
const VOL_KEY = "kona.party.volume";
const LAND_KEY = "kona.party.land";   // ご当地の品: ホストの土地を参加者に届けるか（既定は届けない）
const HASH = "#party=";            // 招待リンク（# 以降はどのサーバーにも送られない）
const MAX_PEERS = 8;
const MAX_KNOCKS = 8;              // 返事を待っている「入れてください」の上限（それ以上は黙って捨てる）
const BITRATE = 128_000;           // 送る音の速さ（bps）

interface TrackInfo { title: string; artist: string; album: string }
type Msg =
  | { t: "peers"; host: string; names: string[] }
  | { t: "state"; track?: TrackInfo; playing: boolean; ext: boolean; id?: string; land?: string }   // land: ホストの土地のコードだけ（ご当地の品。region.ts）
  | { t: "bye" }
  | { t: "out" }                                              // ホスト → 参加者: 退出させる
  // 部屋（参加者 → ホスト は id なし。ホストが送り主の id を付けて、ほかの人へ中継する）
  | { t: "cat"; coat: Coat }                                   // 参加者 → ホスト: この猫で入る
  | { t: "you"; id: string }                                   // ホスト → 参加者: あなたの猫の id
  | { t: "cats"; cats: RoomCat[]; perms: Perms }               // ホスト → 参加者: 部屋の様子まるごと
  | { t: "talk"; ids: string[] }                              // ホスト → 参加者: いま話している人
  | { t: "perm"; perms: Perms }                                // ホスト → 参加者: あなたができること
  | { t: "join"; cat: RoomCat } | { t: "part"; id: string }
  | { t: "go"; id?: string; p: number; x: number }
  | { t: "emote"; id?: string; e: Emote }
  | { t: "look"; id?: string; x?: number; y?: number }
  | { t: "say"; id?: string; text: string; to: string[]; req?: Req }
  // ホームの写し・リクエスト（参加者が頼み、ホストが権限を確かめて応える）
  | { t: "want"; w: "home" | "cover" | "tracks" | "find"; id?: string; q?: string }
  | { t: "home"; rows: SnapRow[]; albums: SnapAlbum[]; look?: SnapLook; size?: SnapSize }
  | { t: "albums"; albums: SnapAlbum[] }
  | { t: "cover"; id: string; url: string }
  | { t: "tracks"; id: string; tracks: SnapTrack[] }
  | { t: "found"; list: SnapAlbum[] }
  | { t: "req"; id: string; i?: number }
  | { t: "gift"; id?: string; to?: string; key: string }                // 贈りもの（参加者 → ホスト → 相手。presents.ts）
  // 再生の写し（ホスト → 部屋にいる参加者）: いまの再生・曲の波形・聴いた記録（ホストが見せると決めたときだけ）
  | ({ t: "np" } & NowState)
  | { t: "peaks"; k: string; d: string }
  | { t: "hist"; on: boolean; ev?: number[]; pl?: number[]; ls?: number };

// 相手から届いたものは信用しない: 形と大きさを確かめてから使う（壊れたもの・知らないものは捨てる）
const MAX_TEXT = 2000, MAX_NAMES = 64;
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
const fin = (x: unknown, a: number, b: number): x is number => typeof x === "number" && Number.isFinite(x) && x >= a && x <= b;
function asNow(m: Record<string, unknown>): Msg | undefined {
  const eq = m.eq as Record<string, unknown> | undefined;
  if (!Number.isInteger(m.i) || !fin(m.i, 0, 999) || !fin(m.pos, 0, 1e6) || !fin(m.dur, 0, 1e6) || typeof m.on !== "boolean") return undefined;
  if (!eq || typeof eq.on !== "boolean" || !Array.isArray(eq.g) || eq.g.length !== BANDS.length || !eq.g.every(g => fin(g, -24, 24))) return undefined;
  const out: { t: "np" } & NowState = { t: "np", i: m.i as number, pos: m.pos, dur: m.dur, on: m.on, eq: { on: eq.on, g: eq.g as number[] } };
  if (fin(m.sr, 8000, 768000)) out.sr = m.sr;
  if (m.nz === "off" || m.nz === "track" || m.nz === "album") out.nz = m.nz;
  if (fin(m.ng, -60, 60)) out.ng = m.ng;
  if (m.md === "normal" || m.md === "album" || m.md === "track" || m.md === "shuffle") out.md = m.md;
  if (isAid(m.id)) out.id = m.id;
  const al = m.album as Record<string, unknown> | undefined;
  if (isAid(m.id) && al && typeof al === "object" && isText(al.t) && isText(al.a) && Array.isArray(al.tr) && al.tr.length <= 300) {
    const tr = (al.tr as Record<string, unknown>[]).map(t => t && typeof t === "object" ? { t: cleanText(t.t), no: Number.isInteger(t.no) && fin(t.no, 0, 9999) ? t.no as number : 0, d: fin(t.d, 0, 1e5) ? t.d as number : 0, f: typeof t.f === "string" ? t.f.slice(0, 60) : undefined } : undefined);
    if (tr.every(Boolean)) {
      out.album = { t: (al.t as string).slice(0, 200), a: (al.a as string).slice(0, 200), y: fin(al.y, 0, 9999) ? al.y : undefined, g: typeof al.g === "string" ? al.g.slice(0, 60) : undefined, c: safeColor(al.c), r: fin(al.r, .2, 5) ? al.r : undefined, tr: tr as NonNullable<NowState["album"]>["tr"] };
    }
  }
  return out;
}
function asMsg(x: unknown): Msg | undefined {
  const m = x as Record<string, unknown>;
  if (!m || typeof m !== "object") return undefined;
  switch (m.t) {
    case "bye": return { t: "bye" };
    case "out": return { t: "out" };
    case "peers":
      return isText(m.host) && Array.isArray(m.names) && m.names.length <= MAX_NAMES && m.names.every(isText)
        ? { t: "peers", host: m.host, names: m.names as string[] } : undefined;
    case "state":
      if (typeof m.playing !== "boolean" || typeof m.ext !== "boolean") return undefined;
      if (m.track !== undefined && !isTrack(m.track)) return undefined;
      return { t: "state", track: m.track as TrackInfo | undefined, playing: m.playing, ext: m.ext, id: isAid(m.id) ? m.id : undefined, land: isLand(m.land) ? m.land : undefined };
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
    case "talk": return Array.isArray(m.ids) && m.ids.length <= 32 && m.ids.every(i => typeof i === "string" && /^(h|g\d{1,4})$/.test(i)) ? { t: "talk", ids: m.ids as string[] } : undefined;
    case "want": {
      if (m.w === "home") return { t: "want", w: "home" };
      if ((m.w === "cover" || m.w === "tracks") && isAid(m.id)) return { t: "want", w: m.w, id: m.id };
      if (m.w === "find" && typeof m.q === "string" && m.q.trim() && m.q.length <= 60) return { t: "want", w: "find", q: m.q };
      return undefined;
    }
    case "home": {
      const rows = cleanRows(m.rows);
      if (!rows || !Array.isArray(m.albums) || m.albums.length > 300) return undefined;
      return { t: "home", rows, albums: m.albums.map(cleanAlbum).filter((a): a is SnapAlbum => !!a), look: cleanLook(m.look), size: cleanSize(m.size) };
    }
    case "albums": return Array.isArray(m.albums) && m.albums.length <= 300 ? { t: "albums", albums: m.albums.map(cleanAlbum).filter((a): a is SnapAlbum => !!a) } : undefined;
    case "found": return Array.isArray(m.list) && m.list.length <= 20 ? { t: "found", list: m.list.map(cleanAlbum).filter((a): a is SnapAlbum => !!a) } : undefined;
    case "cover": return isAid(m.id) && isThumb(m.url) ? { t: "cover", id: m.id, url: m.url } : undefined;
    case "tracks": { const tracks = cleanTracks(m.tracks); return isAid(m.id) && tracks ? { t: "tracks", id: m.id, tracks } : undefined; }
    case "np": return asNow(m);
    case "peaks": return typeof m.k === "string" && /^a\d{1,5}#\d{1,3}$/.test(m.k) && typeof m.d === "string" && m.d.length <= 4000 && /^[\w-]*$/.test(m.d) ? { t: "peaks", k: m.k, d: m.d } : undefined;
    case "hist": {
      if (typeof m.on !== "boolean") return undefined;
      if (!m.on) return { t: "hist", on: false };
      const ints = (x: unknown, n: number) => Array.isArray(x) && x.length <= n && x.every(v => Number.isInteger(v) && v >= 0) ? x as number[] : undefined;
      const ev = ints(m.ev, 8000), pl = ints(m.pl, 4000);
      if (!ev || !pl || ev.length % 2 || pl.length % 2 || typeof m.ls !== "number" || !Number.isFinite(m.ls) || m.ls < 0) return undefined;
      return { t: "hist", on: true, ev, pl, ls: m.ls };
    }
    case "gift": return typeof m.key === "string" && /^[a-z0-9-]{1,40}$/.test(m.key) && (m.id === undefined || isId(m.id)) && (m.to === undefined || isId(m.to))
      ? { t: "gift", id: m.id as string | undefined, to: m.to as string | undefined, key: m.key } : undefined;
    case "req": return isAid(m.id) && (m.i === undefined || (Number.isInteger(m.i) && (m.i as number) >= 0 && (m.i as number) < 1000)) ? { t: "req", id: m.id, i: m.i as number | undefined } : undefined;
  }
  return undefined;
}

interface Peer { id: string; pc: RTCPeerConnection; voice?: RTCRtpTransceiver; dc?: RTCDataChannel; name: string; open: boolean; timer: number; cid: string; inRoom?: boolean; bucket: number; at: number; npId?: string }

type Role = "idle" | "host" | "guest";
let role: Role = "idle";
let box: Mailbox | undefined;
let peers: Peer[] = [];            // ホスト: 参加者たち（つなぎかけを含む） / 参加者: ホストひとり
let knocks: { id: string; name: string }[] = [];   // ホスト: 入れるかどうかを待っている人
const outed = new Set<string>();   // ホスト: 退出させた人の名乗りの公開鍵（このパーティーの間は「入れてください」を捨てる）
let roomKey = "", hostId = "";     // 招待リンクの中身（部屋の鍵・ホストの使い捨ての公開鍵）
let hostName = "", guestNames: string[] = [];
let relaysOpen = 0;
let ended = "";                    // 参加者: 終わった理由（画面に出す）
let endTip: "" | "lan" | "turn" = "";  // 参加者: つながらなかったときの案内
let guestStep: "name" | "knock" | "connect" | "in" = "name";
let knockTimer = 0, waitTimer = 0, stateTimer = 0;
// 再生の写し
let sizeKey = "";                  // ホスト: 最後に確かめたホームの寸法
let npQueued = 0, ticks = 0, peaksKey = "", lastPeaks: Msg | undefined;
let hostLook: SnapLook | undefined;   // 参加者: ホストのホームの見た目の設定
let mirror: MirrorPlayer | undefined, mhist: MirrorHistory | undefined;   // 参加者: ホストの再生の写し
let room: Room | undefined;        // 部屋（ホストは自分の部屋。参加者はホストの部屋）
let me = "";                       // 部屋での自分の猫の id（ホストは "h"）
let seq = 0;                       // ホスト: 参加者の猫に配る番号

// 参加者の側の音
let audio: HTMLAudioElement | undefined;
let last: Extract<Msg, { t: "state" }> | undefined;
let blocked = false;               // ブラウザに再生を止められた（押せば鳴る）
let earCtx: AudioContext | undefined;
let talkTimer = 0;
let voiceHost: HostVoice | undefined, voiceGuest: GuestVoice | undefined, lastTalk = "";   // 通話
let ears: { meters: AnalyserNode[]; spec: AnalyserNode } | undefined;
let earVol: GainNode | undefined, earOn = false, offEq: (() => void) | undefined;   // 参加者: 手元の EQ・音量を通して鳴らす経路

const myName = () => { try { return localStorage.getItem(NAME_KEY) ?? ""; } catch { return ""; } };
const label = (n: string) => n || t("名無し");
const partyVol = () => { try { const v = Number(localStorage.getItem(VOL_KEY) ?? 0.8); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8; } catch { return 0.8; } };

// ---------- WebRTC ----------
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
// 自分の側は作られたままの内容で設定し、相手に送る内容だけを音楽向けに書き換える
// （作った内容を書き換えて自分に設定するのは、ブラウザーによっては受け付けない。Safari など）
async function describe(pc: RTCPeerConnection, d: RTCSessionDescriptionInit) {
  await pc.setLocalDescription(d);
  await gathered(pc);
  return musicSdp(pc.localDescription!.sdp);
}
/** つながらなかった理由（参加者に見せる）。どんな経路の候補が出ていたかも添える（原因を調べる手がかり） */
const NO_ROUTE = t("つながりませんでした。おたがいの回線のあいだに通り道が見つかりませんでした");
/** 同じ回線（外から見たアドレスが同じ）らしいか。STUN に届かず分からないときも、同じ回線として案内する */
// IPv6 は端末ごとにアドレスが違う（NAT がない）ので、前半の 64 ビット（同じ回線なら同じ）で比べる
function netOf(ip: string) {
  if (!ip.includes(":")) return `4 ${ip}`;
  const [head, tail = ""] = ip.toLowerCase().split("::"), h = head ? head.split(":") : [], t = tail ? tail.split(":") : [];
  const all = ip.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t] : h;
  return `6 ${all.slice(0, 4).map(x => x.replace(/^0+(?=.)/, "")).join(":")}`;
}
function sameNetwork(pc: RTCPeerConnection) {
  const pub = (sdp?: string) => new Set([...(sdp ?? "").matchAll(/candidate:\S+ \d+ \S+ \d+ (\S+) \d+ typ srflx/g)].map(m => netOf(m[1])));
  const a = pub(pc.localDescription?.sdp), b = pub(pc.remoteDescription?.sdp);
  // IPv4 どうし・IPv6 どうしで比べられないとき（片方にしかない）は分からないので、同じ回線として案内する
  const fam = (s: Set<string>, f: string) => [...s].some(x => x.startsWith(f));
  if (!["4 ", "6 "].some(f => fam(a, f) && fam(b, f))) return true;
  return [...a].some(x => b.has(x));
}
// iPad は Safari・Chrome とも Mac を名乗るので、触れる画面かどうかで見分ける
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Mac/.test(navigator.platform || navigator.userAgent) && navigator.maxTouchPoints > 1);
const isMac = () => !isIOS() && /Mac/.test(navigator.platform || navigator.userAgent);
// 同じ Wi-Fi なのにつながらないときは、たいてい端末がブラウザーに同じ回線の相手との通信（ローカルネットワーク）を許していない
const MAC_STEPS = `<ol class="party-tip-steps">
    <li>${t("「システム設定」→「プライバシーとセキュリティ」→「ローカルネットワーク」を開く")}</li>
    <li>${t("Chrome など、使っているブラウザーをオンにする")}</li>
    <li>${t("ブラウザーを ⌘Q でいったん終了して開き直し、もう一度招待リンクから入る")}</li></ol>`;
const IOS_STEPS = `<ol class="party-tip-steps">
    <li>${t("「設定」→「プライバシーとセキュリティ」→「ローカルネットワーク」か、「設定」→ アプリ → 使っているブラウザー を開く")}</li>
    <li>${t("Chrome など、使っているブラウザーをオンにする。一覧にないときは、一度このページで招待リンクから入り直すと許可を求められます")}</li>
    <li>${t("ブラウザーをアプリの切り替え画面から上にはらって終了し、開き直してもう一度招待リンクから入る")}</li></ol>`;
const lanTip = (open: boolean) => {
  const here = isIOS() ? t("iPad・iPhone") : "Mac", other = isIOS() ? "Mac" : t("iPad・iPhone");
  const mine = isIOS() ? IOS_STEPS : MAC_STEPS, theirs = isIOS() ? MAC_STEPS : IOS_STEPS;
  const known = isIOS() || isMac();
  return `<${open ? "div" : "details"}>${open ? `<p><b>${known ? tp("{0} で同じ Wi-Fi の相手とつながらないとき", here) : t("同じ Wi-Fi の相手とつながらないとき")}</b></p>` : `<summary>${tp("{0} で同じ Wi-Fi なのにつながらないとき", here)}</summary>`}${mine}
    <p>${tp("相手が {0} のときは、相手の端末でも:", other)}</p>${theirs}</${open ? "div" : "details"}>`;
};
function tipHTML() {
  if (endTip === "lan") return `<div class="party-tip">${lanTip(true)}</div>`;
  if (endTip === "turn") return `<div class="party-tip"><p><b>${t("別の回線どうしでつながらないとき")}</b>: ${relayReady() ? t("中継サーバーが設定されていても届かなかったようです。ホストにも中継サーバーを設定してもらうか、「つながるか確かめる」で設定を確かめてください。") : t("ホストに、リスニングパーティーの画面で「中継サーバー」を設定してもらってから、新しい招待リンクで入り直してください。")}</p>
    ${lanTip(false)}</div>`;
  return "";
}
function routes(pc: RTCPeerConnection) {
  const kinds = (sdp?: string) => { const n = { host: 0, srflx: 0, relay: 0 }; for (const m of (sdp ?? "").matchAll(/ typ (host|srflx|prflx|relay)/g)) n[m[1] === "prflx" ? "srflx" : m[1] as "host"]++; return `${n.host}/${n.srflx}/${n.relay}`; };
  return tp("経路の候補 自分 {0}・ホスト {1}", kinds(pc.localDescription?.sdp), kinds(pc.remoteDescription?.sdp));
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
  me = "h"; seq = 0; sizeKey = "";
  room = makeRoom(true);
  room.cats.set("h", { id: "h", name: cleanName(hostName), coat: myCat(), ...startSpot(), emote: "sit" });
  room.setPerms(ALL);
  // ホストは自分のホームのまま。ふだんの猫はパーティーの間だけ帰り、ホストの猫と入ってきた猫がホームに来る
  setCatsAway(true);
  voiceHost?.close(); voiceHost = new HostVoice();
  room.open();
  resetIds(); setShareSet(pickedSet === undefined ? currentSet() : pickedSet); defaults = { chat: false, request: false, voice: false }; overrides.clear();
  newLink();
  peaksKey = ""; lastPeaks = undefined;
  stateTimer = window.setInterval(() => {
    broadcast(snapshot()); sendNow();
    if (++ticks % 10 === 0) for (const p of peers) if (p.inRoom) sendHist(p);
    // ホストの画面の大きさが変わったら、写しを組み直してもらう（参加者はホストの寸法で組んで縮めて見せるので）
    const z = sizeOf(), zk = z ? `${z.w}x${z.h}x${z.gx}x${z.gw}x${z.n}` : "";
    if (zk && sizeKey && zk !== sizeKey) for (const p of peers) if (p.inRoom) sendHome(p);
    if (zk) sizeKey = zk;
  }, 3000);
  // 話している人を、名札の印で知らせる（変わったときだけ送る）
  talkTimer = window.setInterval(() => {
    const ids = voiceHost?.talking() ?? [], k = ids.join(",");
    if (k === lastTalk) return;
    lastTalk = k; room?.setTalking(ids); relay({ t: "talk", ids });
  }, 250);
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
    if (outed.has(l.from)) { box?.send(l.from, { t: "no" }); return; }
    if (peers.some(p => p.id === l.from)) return;   // つなぎかけの人の、くり返しの「入れてください」
    const k = knocks.find(x => x.id === l.from);
    if (k) return;
    if (knocks.length >= MAX_KNOCKS) return;
    knocks.push({ id: l.from, name: l.note.name.slice(0, 40) });
    toastIn(tp("{0}さんが入りたがっています", label(l.note.name)));
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
  // 通話の声: 2 本目の音声。ホストが混ぜた「その人以外の声」を送り、その人の声を受け取る
  peer.voice = pc.addTransceiver("audio", { direction: "sendrecv" });
  voiceHost?.addPeer(peer.cid, peer.voice.sender);
  pc.ontrack = e => { if (e.transceiver === peer.voice) voiceHost?.incoming(peer.cid, e.track, can(peer, "voice")); };
  // つながらないまま 40 秒たったらあきらめる
  peer.timer = window.setTimeout(() => { if (!peer.open) { dropped(peer); toastFn?.(tp("{0}さんとつながりませんでした", label(peer.name))); } }, 40_000);
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
let defaults: Perms = { chat: false, request: false, voice: false };   // 通話も既定は不可（ホストが人ごとか全員に許す）
const overrides = new Map<string, Partial<Perms>>();
const ALL: Perms = { chat: true, request: true, voice: true };
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
    gifts: () => ({ items: giftable(), today: giftToday() }),
    gift(to, key) {
      if (!gave(key)) return false;
      if (isHost) { const p = peers.find(p => p.inRoom && p.cid === to); if (!p) return false; send(p, { t: "gift", id: me, key }); }
      else toHost({ t: "gift", to, key });
      return true;
    },
    perm: isHost ? (k, val, guest) => {
      if (guest) { const o = { ...overrides.get(guest) }; if (val === undefined) delete o[k]; else o[k] = val; overrides.set(guest, o); }
      else defaults = { ...defaults, [k]: !!val };
      for (const p of peers) if (p.inRoom && (!guest || p.cid === guest)) send(p, { t: "perm", perms: permsOf(p.cid) });
      for (const p of peers) voiceHost?.allow(p.cid, can(p, "voice"));
    } : undefined,
    mic: on => isHost ? voiceHost?.setMic(on) ?? Promise.resolve(false) : voiceGuest?.setMic(on) ?? Promise.resolve(false),
    toast: t => toastFn?.(t),
    permsOf: isHost ? () => ({ defaults, guests: overrides }) : undefined,
    kick: isHost ? cid => kick(cid) : undefined,
    play: isHost ? (id, i) => { const a = albumOf(id); if (a) ctx().player.playAlbum(a, i); } : undefined,
    src: () => isHost ? hostSrc() : guestSrc(),
    volume: isHost ? undefined : { get: partyVol, set: v => { try { localStorage.setItem(VOL_KEY, String(v)); } catch { /* ignore */ } applyOut(); } },
  });
}
/** ホストの部屋の写し: モジュールは自分のプレイヤーと記録で動く */
const hostSrc = (): HomeSource => ({ idOf: idFor });
/** 参加者の部屋の写し: ホストの再生の写しで動かす。ライブラリの操作は届かない */
function guestSrc(): HomeSource {
  const byKey = (k: string): Album | undefined => {
    const a = room?.albums.get(k);
    return a ? { key: a.id, shelf: "", dir: "", title: a.t, artist: a.a, year: a.y, color: a.c, tracks: [], tagged: true } : undefined;
  };
  const volume = { get: partyVol, set: (v: number) => { try { localStorage.setItem(VOL_KEY, String(v)); } catch { /* ignore */ } applyOut(); } };
  return mirror && mhist ? { over: { player: mirror.asPlayer(), history: mhist, byKey, play: () => {}, store: hostLook?.store ?? {} }, volume } : { volume };
}
const toHost = (m: Msg) => { const h = peers[0]; if (h) send(h, m); };
/** 贈りものを受け取る（送り主の猫の名前を札に） */
function giftIn(key: string, from: string) {
  const name = room?.cats.get(from)?.name || t("名無し");
  if (receiveGift(key, name)) {
    const d = itemOf(key);
    toastFn?.(tp("{0}さんから「{1}」が届きました", name, d ? t(d.label) : key));
    room?.said({ from, text: tp("「{0}」を贈りました", d ? t(d.label) : key), to: [me], at: Date.now() });
  }
}
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
  send(peer, { t: "home", rows: h.rows, albums: h.albums.slice(0, 300), look: snapLook(), size: h.size });
  for (let i = 300; i < h.albums.length; i += 300) send(peer, { t: "albums", albums: h.albums.slice(i, i + 300) });
}
/** ホスト: 参加者から届いた部屋のこと。送り主の猫の id を付け、権限を確かめてから映し、中継する */
function hostRoom(peer: Peer, m: Msg) {
  if (!room) return;
  // 送りすぎを抑える（目線は 1 秒に 20 回ほど、ほかはもっと少なく）
  const t = performance.now();
  peer.bucket = Math.min(40, peer.bucket + (t - peer.at) / 50); peer.at = t;
  const cost = m.t === "look" ? 1 : m.t === "want" ? (m.w === "home" ? 30 : m.w === "find" ? 6 : 2) : m.t === "say" || m.t === "req" || m.t === "gift" ? 10 : 3;
  if (peer.bucket < cost) return;
  peer.bucket -= cost;
  const id = peer.cid;
  if (m.t === "cat") {
    if (peer.inRoom) return;
    const cat: RoomCat = { id, name: cleanName(peer.name), coat: m.coat, ...startSpot(), emote: "sit" };
    room.add(cat);
    peer.inRoom = true;
    send(peer, { t: "you", id });
    send(peer, { t: "cats", cats: [...room.cats.values()], perms: permsOf(id) });
    relay({ t: "join", cat }, peer);
    sendHome(peer);
    send(peer, nowMsg(peer));
    if (lastPeaks) send(peer, lastPeaks);
    sendHist(peer);
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
  else if (m.t === "gift" && m.to && m.to !== id) {
    // 贈りもの: ホスト宛てなら受け取り、ほかの人宛てならその人へ渡す（送り主はホストが付ける）
    if (m.to === "h") giftIn(m.key, id);
    else { const to = peers.find(p => p.inRoom && p.cid === m.to); if (to) send(to, { t: "gift", id, key: m.key }); }
  }
  else if (m.t === "req") {
    const a = albumOf(m.id);
    if (!a || !can(peer, "request")) return;
    const tr = m.i !== undefined ? a.tracks[m.i] : undefined;
    if (m.i !== undefined && !tr) return;
    const req: Req = { id: m.id, i: m.i, t: a.title.slice(0, 200), a: (a.artist ?? "").slice(0, 200), tr: tr ? (tr.title ?? "").slice(0, 200) : undefined };
    deliver({ t: "say", id, text: "", to: [], req });
    toastIn(tp("{0}さんから「{1}」のリクエスト", label(peer.name), req.tr ?? req.t));
  }
}
/** 参加者: ホストから届いた部屋のこと */
function guestRoom(m: Msg) {
  if (m.t === "you") {
    me = m.id;
    room?.close();
    mirror = new MirrorPlayer(); mhist = new MirrorHistory();
    if (ears) mirror.listen(ears.meters, ears.spec);
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
  else if (m.t === "talk") room.setTalking(m.ids);
  else if (m.t === "join") room.add(m.cat);
  else if (m.t === "part" && m.id !== me) room.remove(m.id);
  else if (m.t === "go" && m.id && m.id !== me) room.go(m.id, m.p, m.x);
  else if (m.t === "emote" && m.id && m.id !== me) room.emote(m.id, m.e);
  else if (m.t === "look" && m.id && m.id !== me) room.look(m.id, m.x !== undefined ? [m.x, m.y!] : undefined);
  else if (m.t === "say" && m.id) room.said({ from: m.id, text: m.text, to: m.to, at: Date.now(), req: m.req });
  else if (m.t === "home") { hostLook = m.look; room.setHome(m.rows, m.albums, m.look, m.size); }
  else if (m.t === "albums") room.addAlbums(m.albums);
  else if (m.t === "gift" && m.id && m.id !== me) giftIn(m.key, m.id);
  else if (m.t === "cover") { room.setCover(m.id, m.url); mirror?.setCover(m.id, m.url); }
  else if (m.t === "np") {
    mirror?.set(m);
    const id = mirror?.album?.key, url = id ? room.coverOf(id) : undefined;
    if (id && url) mirror!.setCover(id, url);
  }
  else if (m.t === "peaks") { try { mirror?.setPeaks(m.k, Float32Array.from(unb64(m.d), v => v / 255)); } catch { /* 壊れた形は捨てる */ } }
  else if (m.t === "hist") {
    if (!mhist) return;
    const was = mhist.shown;
    if (!m.on) mhist.clear();
    else {
      const ev: PlayEvent[] = [], pl = new Map<string, number>();
      for (let i = 0; i < m.ev!.length; i += 2) ev.push({ k: `a${m.ev![i]}`, t: m.ev![i + 1] * 60_000 });
      for (let i = 0; i < m.pl!.length; i += 2) pl.set(`a${m.pl![i]}`, m.pl![i + 1]);
      mhist.set(ev, pl, m.ls!);
    }
    if (was !== mhist.shown) room.redraw();
  }
  else if (m.t === "tracks") room.setTracks(m.id, m.tracks);
  else if (m.t === "found") room.showFound(m.list);
}

// ---------- 再生の写し（ホスト） ----------
/** いまの再生。アルバムの曲目は、その人にまだ送っていないときだけ付ける */
function nowMsg(peer?: Peer): Msg {
  const p = ctx().player, a = p.album, id = a ? nowId() : undefined;
  const withAlbum = !!(id && a && (!peer || peer.npId !== id));
  if (peer && withAlbum) peer.npId = id;
  return {
    t: "np", id, i: p.index, pos: Math.round(p.position * 100) / 100, dur: Math.round((p.duration || 0) * 100) / 100, on: p.playing,
    album: withAlbum ? { t: a!.title.slice(0, 200), a: (a!.artist ?? "").slice(0, 200), y: a!.year, g: a!.genre?.slice(0, 60), c: ctx().colorOf(a!), r: a!.ratio, tr: a!.tracks.slice(0, 300).map(t => ({ t: (t.title ?? "").slice(0, 200), no: t.no || 0, d: Math.round((t.duration ?? 0) * 10) / 10, f: t.format?.slice(0, 60) })) } : undefined,
    eq: { on: p.eq.on, g: [...p.eq.gains] }, sr: p.sampleRate, nz: p.normalize, ng: p.normGain, md: p.mode,
  };
}
function sendNow() {
  for (const p of peers) if (p.inRoom) send(p, nowMsg(p));
  // 曲が替わったら波形を送る（ホストの端末で作ったものを使う。作れない曲は送らない）
  const pl = ctx().player, id = nowId(), key = id && pl.track ? `${id}#${pl.index}` : "";
  if (key && key !== peaksKey) {
    peaksKey = key;
    currentPeaks(pl).then(pk => {
      if (!pk || peaksKey !== key || role !== "host") return;
      lastPeaks = { t: "peaks", k: key, d: b64(Uint8Array.from(pk, v => Math.round(Math.max(0, Math.min(1, v)) * 255))) };
      relay(lastPeaks);
    });
  }
}
/** 再生の変化はまとめて送る（つまみを動かしている間などに送りすぎない） */
function queueNow() { if (!npQueued) npQueued = window.setTimeout(() => { npQueued = 0; if (role === "host") sendNow(); }, 150); }
/** 聴いた記録。見せるアルバムのセットの外のものは送らない */
function sendHist(peer: Peer) {
  const since = Date.now() - 9 * 7 * 864e5, num = (id: string) => Number(id.slice(1));
  const ev: number[] = [], plays = new Map<string, number>(), extra: SnapAlbum[] = [];
  const byKey = new Map<string, Album | undefined>();
  for (const e of playLog()) {
    if (e.t < since) continue;
    if (!byKey.has(e.k)) byKey.set(e.k, ctx().byKey(e.k));
    const a = byKey.get(e.k), id = a ? idFor(a) : undefined;
    if (!a || !id) continue;
    ev.push(num(id), Math.round(e.t / 60_000));
    if (!plays.has(id)) { plays.set(id, stat(e.k).plays); extra.push(snapAlbum(a)); }
  }
  const evs = ev.slice(-4000);   // 1 通に収まるよう、新しいほうから 2000 回分
  for (let i = 0; i < extra.length; i += 200) send(peer, { t: "albums", albums: extra.slice(i, i + 200) });
  send(peer, { t: "hist", on: true, ev: evs, pl: [...plays].flatMap(([id, n]) => [num(id), n]), ls: Math.round(listenedSeconds()) });
}

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
  waitTimer = window.setTimeout(() => { if (role === "guest" && guestStep !== "in") end(relaysOpen ? t("ホストから返事がありませんでした") : t("仲介のリレーにつながりませんでした")); }, 5 * 60_000);
  quiet();
  blocked = false;
  render();
}
async function guestLetter(l: Letter) {
  // ホスト（招待リンクに書かれた公開鍵）からの知らせだけを読む。部屋の鍵を知るほかの人がホストをかたれないように
  if (role !== "guest" || l.from !== hostId) return;
  if (l.note.t === "no") { end(t("ホストが入れませんでした")); return; }
  if (l.note.t !== "offer" || guestStep !== "knock") return;
  guestStep = "connect"; clearTimeout(knockTimer);
  hostName = l.note.name;
  const pc = newPc(), peer: Peer = { id: l.from, pc, name: l.note.name, open: false, timer: 0, cid: "h", bucket: 0, at: 0 };
  peers = [peer];
  pc.ondatachannel = e => wire(peer, e.channel);
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" && !peer.open && peers.includes(peer)) { clearTimeout(peer.timer); peers = []; try { pc.close(); } catch { /* ignore */ } end(`${NO_ROUTE}［${routes(pc)}］`, sameNetwork(pc) ? "lan" : "turn"); return; }
    if (["failed", "closed"].includes(pc.connectionState)) dropped(peer);
  };
  voiceGuest?.close(); voiceGuest = new GuestVoice(); voiceGuest.onDuck = applyOut;
  // 1 本目は曲、2 本目は通話の声
  pc.ontrack = e => {
    if (pc.getTransceivers().indexOf(e.transceiver) === 1) voiceGuest?.hear(e.track, ctx().player.sink);
    else hear(e.streams[0] ?? new MediaStream([e.track]));
  };
  render();
  try {
    await pc.setRemoteDescription({ type: "offer", sdp: l.note.sdp });
    // 曲は受け取るだけ。通話の声は、マイクを入れたときだけ送る（それまでは何も送らない）
    pc.getTransceivers().forEach((t, i) => {
      if (t.receiver.track.kind !== "audio") return;
      if (i === 1) { t.direction = "sendrecv"; voiceGuest?.setSender(t.sender); } else t.direction = "recvonly";
    });
    const sdp = await describe(pc, await pc.createAnswer());
    await box?.send(hostId, { t: "answer", sdp });
    peer.timer = window.setTimeout(() => { if (!peer.open) end(`${NO_ROUTE}［${routes(pc)}］`, sameNetwork(pc) ? "lan" : "turn"); }, 40_000);
  } catch (e) { console.error(e); end(tp("つながりませんでした。このブラウザーでは接続の準備ができませんでした: {0}", (e as Error)?.name ?? "error")); }
}
function hear(stream: MediaStream) {
  if (!audio) { audio = new Audio(); audio.autoplay = true; }
  audio.srcObject = stream;
  earOn = false;
  // 部屋の猫の耳: 届いた音の大きさから拍を拾う（リズムをとる）
  try {
    earCtx?.close().catch(() => {});
    // iPad・iPhone は、消音モードのとき Web Audio の音を鳴らさない。音楽として鳴らすと伝える（Safari 16.4 以降）
    try { const as = (navigator as Navigator & { audioSession?: { type: string } }).audioSession; if (as) as.type = "playback"; } catch { /* ignore */ }
    earCtx = new AudioContext();
    const ec = earCtx;
    ec.onstatechange = () => { if (ec !== earCtx || role !== "guest") return; const b = earSilent(); if (b !== blocked) { blocked = b; update(); } };
    const an = earCtx.createAnalyser(), buf = new Float32Array(1024);
    an.fftSize = 1024;
    const src = earCtx.createMediaStreamSource(stream);
    src.connect(an);
    setPartyEar(() => { an.getFloatTimeDomainData(buf); let n = 0; for (const v of buf) n += v * v; return Math.sqrt(n / buf.length); });
    // 参加者の手元の EQ を通して鳴らす（設定はこの端末のもの。ホストの EQ はもう掛かった音が届く）
    const E = ctx().player.eq, ac = earCtx;
    const filters = BANDS.map(b => { const f = ac.createBiquadFilter(); f.type = b.type; f.frequency.value = b.freq; f.Q.value = b.type === "peaking" ? 1.1 : .7; return f; });
    const pre = ac.createGain();
    earVol = ac.createGain();
    src.connect(filters[0]);
    for (let i = 1; i < filters.length; i++) filters[i - 1].connect(filters[i]);
    filters[filters.length - 1].connect(pre).connect(earVol);
    const eqApply = () => {
      const t = ac.currentTime;
      filters.forEach((f, i) => f.gain.setTargetAtTime(E.on ? E.gains[i] : 0, t, .02));
      pre.gain.setTargetAtTime(10 ** (E.preamp / 20), t, .02);
    };
    eqApply();
    offEq?.(); const offEqOnly = E.subscribe(eqApply);
    // 再生の写しのレベルメーター・スペクトラム（ホストのプレイヤーと同じ測り方。EQ のあとの音）
    const split = ac.createChannelSplitter(2);
    pre.connect(split);
    const meters = [0, 1].map(ch => { const a = ac.createAnalyser(); a.fftSize = 2048; split.connect(a, ch); return a; });
    const spec = ac.createAnalyser(); spec.fftSize = 8192; spec.smoothingTimeConstant = .8;
    pre.connect(spec);
    // 写しのプレイヤーは「入れた」の知らせで作るので、音のほうが先に届くことがある。作ったときにも渡す
    ears = { meters, spec };
    mirror?.listen(meters, spec);
    // 出力先を選べる（AudioContext.setSinkId がある）ときは、この経路で鳴らす。ないときは audio 要素のまま（EQ なし）
    const sinkable = typeof (ac as AudioContext & { setSinkId?: unknown }).setSinkId === "function" || !ctx().player.sink;
    if (sinkable) { earVol.connect(ac.destination); earOn = true; }
    // 出力先を変えたら（出力モジュール）すぐに合わせる
    const offOut = ctx().player.on(() => applyOut());
    offEq = () => { offEqOnly(); offOut(); };
  } catch { earOn = false; /* 拍が拾えなくても、ゆったりしたリズムでとる */ }
  applyOut();
  playParty();
}
// 鳴らす経路が AudioContext のときは、audio 要素が鳴っていても（消音で流しているだけ）AudioContext が止まっていれば無音になる。
// iPad・iPhone では、つながった瞬間（操作の外）に作った AudioContext は止まったまま始まり、通話の着信などでも止まる
const earSilent = () => earOn && !!earCtx && earCtx.state !== "running";
function playParty() {
  if (!audio) return;
  if (earCtx && earCtx.state !== "running" && earCtx.state !== "closed") earCtx.resume().then(() => { if (!earSilent() && blocked) { blocked = false; update(); } }, () => {});
  voiceGuest?.resume();
  audio.play().then(() => { blocked = earSilent(); update(); }).catch(() => { blocked = true; update(); });
}
// 「画面のどこかを押すと鳴ります」: 止められている間は、どこを押しても鳴らし直す（押した操作の中で呼ぶ必要がある）
document.addEventListener("pointerdown", () => { if (role === "guest" && blocked) playParty(); }, true);
/** 参加者の音量はパーティー用に別に持つ（2 乗のカーブ）。出力先だけは、この端末の設定（スピーカーかイヤホンか）にそろえる */
function applyOut() {
  if (!audio) return;
  const v = partyVol() * Math.sqrt(voiceGuest?.duck ?? 1), sink = ctx().player.sink;
  voiceGuest?.setSink(sink);
  if (earOn && earCtx && earVol) {
    // 鳴らすのは EQ を通した経路。audio 要素は届いた音を流しておくためだけに使う（止めると音が届かないことがある）
    audio.muted = true;
    earVol.gain.setTargetAtTime(v * v, earCtx.currentTime, .02);
    const c = earCtx as AudioContext & { setSinkId?: (id: string) => Promise<void>; sinkId?: string };
    if (c.setSinkId && (c.sinkId ?? "") !== sink) c.setSinkId(sink).catch(() => {});
    return;
  }
  audio.muted = false;
  audio.volume = v * v;
  const a = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void>; sinkId?: string };
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
    toastIn(tp("{0}さんが参加しました", label(peer.name)));
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
    voiceHost?.removePeer(peer.cid);
    sendPeers();
    if (peer.inRoom) { room?.remove(peer.cid); relay({ t: "part", id: peer.cid }); }
    if (was) toastIn(tp("{0}さんが抜けました", label(peer.name)));
  }
  else end(was ? t("ホストとの接続が切れました") : t("つながりませんでした"));
  render();
}
/** ホスト: その人を退出させる（接続を切り、このパーティーの間は入れない。ページを開き直した人は新しいリンクで防ぐ） */
function kick(cid: string) {
  const peer = peers.find(p => p.cid === cid);
  if (!peer) return;
  outed.add(peer.id);
  send(peer, { t: "out" });
  setTimeout(() => dropped(peer), 150);   // 「退出」が届いてから切る
}
function received(peer: Peer, m: Msg) {
  if (m.t === "bye") { dropped(peer); return; }
  if (m.t === "out") { if (role === "guest") end(t("ホストがあなたを退出させました")); return; }
  if (role === "host") { hostRoom(peer, m); return; }   // ホストが参加者から受け取るのは、抜けますと部屋のことだけ
  if (m.t === "peers") { hostName = m.host; guestNames = m.names; update(); }
  else if (m.t === "state") { last = m; update(); }
  else guestRoom(m);
}
function sendPeers() { broadcast({ t: "peers", host: hostName, names: peers.filter(p => p.open).map(p => p.name) }); }
function snapshot(): Msg {
  const p = ctx().player, a = p.album, t = p.track;
  return { t: "state", track: a && t ? { title: t.title, artist: a.artist, album: a.title } : undefined, playing: p.playing, ext: p.external, id: a ? nowId() : undefined, land: landShared() ? hereLand() : undefined };
}

function end(why: string, tip: typeof endTip = "") {
  const keep = role === "guest";
  leave(true);
  if (keep) { role = "guest"; ended = why; endTip = tip; }
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
  setPartyEar(); earCtx?.close().catch(() => {}); earCtx = undefined; earVol = undefined; ears = undefined; earOn = false; offEq?.(); offEq = undefined;
  room?.close(); room = undefined; me = "";
  setCatsAway(false);
  clearInterval(talkTimer); talkTimer = 0;
  voiceHost?.close(); voiceHost = undefined; voiceGuest?.close(); voiceGuest = undefined; lastTalk = "";
  mirror = undefined; mhist = undefined; hostLook = undefined; clearTimeout(npQueued); npQueued = 0;
  peers = []; knocks = []; outed.clear(); roomKey = hostId = ""; ended = ""; endTip = ""; last = undefined; guestNames = []; relaysOpen = 0;
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
      <div class="dlg-head"><h2 id="party-title">${t("リスニングパーティー")}</h2><button class="dlg-x" aria-label="${t("閉じる")}">×</button></div>
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

const landShared = () => { try { return localStorage.getItem(LAND_KEY) === "1"; } catch { return false; } };
/** ご当地の品をオンにしているホストだけ: 土地（都道府県・国）を参加者に届けるか */
const LAND = () => {
  const here = hereLand();
  return here ? `<label class="dlg-check"><input type="checkbox" id="party-land"${landShared() ? " checked" : ""}> ${esc(tp("いまいる土地「{0}」を入った人に知らせる。一緒に 30 分聴くと、その土地の品が届きます", landName(here)))}</label>` : "";
};
const RIGHTS = `<p class="dlg-note">${t("招待リンクは、知っている人にだけ直接送ってください。SNS など誰でも見られる場所には貼らないでください。流す曲の権利に気を配るのは、ホストの役目です。")}</p>`;
const PRIVACY = `<p class="dlg-note">${t("つなぐための情報は、公開の Nostr リレーを通して暗号化して受け渡します。鍵は招待リンクの中だけにあり、リレーには読めません。つながるとホストと参加者の間でお互いの IP アドレスが見えるので、知っている人とだけ使ってください。参加者どうしはつながりません。")}</p>`;
const nameField = () => `<label class="dlg-field"><span>${t("あなたの名前。相手に見えます")}</span><input id="party-name" type="text" maxlength="40" autocomplete="nickname" value="${esc(myName())}"></label>`;
/** 送るアルバムのセット（タグ）を選ぶ欄。タグがなければ出さない */
const setKey = (s: AlbumSet | null) => !s ? "" : `${s.not ? "-" : "+"}${s.tag}`;
const SHARE = (s: AlbumSet | null) => {
  const tags = allTags();
  if (!tags.length) return "";
  const opt = (v: AlbumSet | null) => `<option value="${esc(setKey(v))}"${setKey(v) === setKey(s) ? " selected" : ""}>${esc(setLabel(v))}</option>`;
  return `<label class="dlg-field"><span>${t("見せるアルバムをタグで絞る。外のアルバムは棚・ジャケット・曲目・検索・リクエストのどれにも出しません")}</span>
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
function render() {
  renderPill();
  if (!dlg) return;
  const ph = phase();
  if (ph === shown) { update(); return; }
  shown = ph;
  const body = dlg.querySelector<HTMLElement>(".dlg-body")!;
  const h = (s: string) => { body.innerHTML = s; };
  const x = dlg.querySelector<HTMLElement>(".dlg-x")!;
  x.setAttribute("aria-label", t(inRoom() ? "抜ける" : "閉じる"));
  dlg.classList.toggle("party-room", inRoom());
  if (ph === "idle") h(`
    <p class="dlg-lead">${t("あなたが流している音を、そのまま友だちに届けて一緒に聴きます。相手は曲を持っていなくても聴けます。音は少し遅れて届き、Spotify の曲は届けられません。入った人は猫になって、あなたのホームの写しに集まります。")}</p>
    ${nameField()}
    ${SHARE(pickedSet === undefined ? currentSet() : pickedSet)}
    ${editorHtml()}
    ${LAND()}
    ${RIGHTS}
    ${relayHTML(true)}
    <div class="dlg-actions"><button class="btn primary" id="party-host">${t("パーティーを開く")}</button></div>
    <p class="dlg-note">${t("参加するときは、ホストから届いた招待リンクを開いてください。")}</p>
    ${PRIVACY}`);
  else if (ph === "host") h(`
    <p class="dlg-lead">${t("この招待リンクを、一緒に聴く人に送ってください。開いた人が名乗ると、ここに出ます。「入れる」を押した人だけがつながります。")}</p>
    <input class="party-code" id="party-out" readonly value="${esc(inviteLink())}">
    <div class="party-row">
      <button class="btn" data-copy>${t("リンクをコピー")}</button>
      ${"share" in navigator ? `<button class="btn" data-share>${t("送る…")}</button>` : ""}
      <button class="btn" id="party-renew">${t("リンクを作り直す")}</button>
    </div>
    <p class="dlg-note party-wait" id="party-relay"></p>
    <p class="dlg-note">${relayStatusHTML()}</p>
    <div class="party-knocks" id="party-knocks"></div>
    <div class="party-people" id="party-people"></div>
    ${SHARE(shareSet())}
    ${LAND()}
    ${RIGHTS}
    <p class="dlg-note">${t("いつもどおりに曲を選んで操作してください。EQ をかけた音がそのまま届きます。")}</p>
    <p class="dlg-note">${t("入ってきた人の猫は、あなたのホームに来ます。パーティーの間、いつもの猫はお出かけしています。")}</p>
    <div class="dlg-actions"><button class="btn" id="party-leave">${t("パーティーを閉じる")}</button></div>`);
  else if (ph === "guest-name") h(`
    <p class="dlg-lead">${t("リスニングパーティーに招かれています。名前と猫を決めて名乗ると、ホストに「入れてください」が届きます。入っている間は、ホストのホームの写しで猫になって、ホストの流す音だけを聴きます。あなたのライブラリや再生には触れません。")}</p>
    ${nameField()}
    ${editorHtml()}
    <div class="dlg-actions"><button class="btn primary" id="party-knock">${t("入れてもらう")}</button><button class="btn" id="party-leave">${t("やめる")}</button></div>
    ${relayHTML(false)}
    ${PRIVACY}`);
  else if (ph === "guest-knock" || ph === "guest-connect") h(`
    <p class="dlg-lead party-wait" id="party-relay"></p>
    <div class="dlg-actions"><button class="btn" id="party-leave">${t("やめる")}</button></div>`);
  else if (ph === "guest-in") h(`
    <p class="dlg-lead party-wait">${esc(tp("{0}さんのホームに入っています…", label(hostName)))}</p>
    <div class="dlg-actions"><button class="btn" id="party-leave">${t("やめる")}</button></div>`);
  else if (ph === "guest-ended") h(`
    <p class="dlg-lead">${esc(ended)}。</p>${tipHTML()}${endTip === "turn" ? relayHTML(false) : ""}
    <div class="dlg-actions"><button class="btn primary" id="party-done">${t("閉じる")}</button></div>`);

  const $ = <T extends HTMLElement>(s: string) => body.querySelector<T>(s);
  const name = $<HTMLInputElement>("#party-name");
  if (name) name.onchange = () => { try { localStorage.setItem(NAME_KEY, name.value.trim()); } catch { /* ignore */ } };
  wireRelay(body);
  const keepName = () => name?.onchange?.(new Event("change"));
  $<HTMLButtonElement>("#party-host")?.addEventListener("click", () => { keepName(); host(); });
  $<HTMLButtonElement>("#party-knock")?.addEventListener("click", () => { keepName(); knock(); });
  $<HTMLButtonElement>("#party-renew")?.addEventListener("click", () => { newLink(); shown = ""; render(); });
  $<HTMLButtonElement>("#party-leave")?.addEventListener("click", () => leave());
  $<HTMLButtonElement>("#party-done")?.addEventListener("click", () => { leave(); closeDlg(); });
  const land = $<HTMLInputElement>("#party-land");
  if (land) land.onchange = () => { try { localStorage.setItem(LAND_KEY, land.checked ? "1" : "0"); } catch { /* ignore */ } if (role === "host") broadcast(snapshot()); };
  const pick = $<HTMLSelectElement>("#party-set");
  if (pick) pick.onchange = () => changeShare(parseSet(pick.value));
  wireEditor(body, () => name?.value.trim() ?? myName());
  body.querySelector<HTMLButtonElement>("[data-copy]")?.addEventListener("click", e => copy(e.currentTarget as HTMLButtonElement, inviteLink()));
  body.querySelector<HTMLButtonElement>("[data-share]")?.addEventListener("click", () => navigator.share?.({ title: t("Kona のリスニングパーティー"), url: inviteLink() }).catch(() => {}));
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
  navigator.clipboard?.writeText(text).then(() => { b.textContent = t("コピーしました"); setTimeout(() => b.textContent = was, 1500); })
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
    ? (relaysOpen ? tp("仲介のリレー {0} つにつながっています", relaysOpen) : t("仲介のリレーにつないでいます…"))
    : guestStep === "connect" ? tp("{0}さんとつないでいます…", label(hostName))
    : relaysOpen ? t("ホストが入れてくれるのを待っています…") : t("仲介のリレーにつないでいます…");
  const kn = dlg.querySelector<HTMLElement>("#party-knocks");
  if (kn) kn.innerHTML = knocks.map(k => `<div class="party-knock"><span>${esc(tp("{0}さんが入りたがっています", label(k.name)))}</span>
      <button class="btn primary" data-admit="${esc(k.id)}" ${peers.length >= MAX_PEERS ? "disabled" : ""}>${t("入れる")}</button><button class="btn" data-refuse="${esc(k.id)}">${t("断る")}</button></div>`).join("");
  const people = dlg.querySelector<HTMLElement>("#party-people");
  if (people) {
    const list = role === "host" ? [tp("{0}・あなた・ホスト", label(hostName)), ...peers.map(p => label(p.name) + (p.open ? "" : t("・つないでいます…")))]
      : [tp("{0}・ホスト", label(hostName)), ...guestNames.map(n => label(n))];
    people.innerHTML = `<span class="dlg-note">${tp("参加している人 {0}", list.length)}</span><ul>${list.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`;
  }
}

/** 部屋の下の帯に出す「いま流れているもの」 */
function nowText(): string {
  const st = role === "host" ? snapshot() as Extract<Msg, { t: "state" }> : last, t = st?.track;
  if (role === "guest" && blocked) return tr("ブラウザに音を止められました。画面のどこかを押すと鳴ります");
  if (!st) return tr("待っています…");
  if (!t) return role === "host" ? tx("何も流していません") : tx("ホストは何も流していません");
  const what = `${t.title} — ${[t.artist, t.album].filter(Boolean).join(" · ")}`;
  if (st.ext) return tp("{0}。Spotify の曲は届けられません", what);
  return `${st.playing ? "♪ " : tr("一時停止中 · ")}${what}`;
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
  pill.innerHTML = `<i></i>${knocks.length ? tp("{0}人 · {1}人待ち", n, knocks.length) : tp("{0}人", n)}`;
  pill.title = t("リスニングパーティーのホスト");
  pill.setAttribute("aria-label", pill.title);
}

/** main から一度だけ呼ぶ。招待リンクから開いたなら、参加の画面を出す */
export function initParty(opts: { toast: (t: string) => void }) {
  toastFn = opts.toast;
  if (!partySupported()) return;
  ctx().player.on(() => {
    if (role === "host") { broadcast(snapshot()); queueNow(); }
    else if (inRoom() && guestStep !== "name") quiet();
  });
  addEventListener("pagehide", () => broadcast({ t: "bye" }));
  document.addEventListener("kona:regional", () => { if (role === "host") broadcast(snapshot()); });   // 土地が変わったら参加者へ
  if (location.hash.startsWith(HASH)) {
    const [key, id] = decodeURIComponent(location.hash.slice(HASH.length)).split(".");
    // リンクは開いたらすぐ消す（履歴や画面に部屋の鍵を残さない）
    history.replaceState(null, "", location.pathname + location.search + "#home");
    if (key && isRoomKey(key) && /^[0-9a-f]{64}$/.test(id ?? "")) { startGuest(key, id); setTimeout(() => openParty(), 300); }
    else setTimeout(() => toastFn?.(t("招待リンクが壊れています")), 300);
  }
}
/** 参加者としてホストの部屋にいて、ホストが鳴らしているとき: ホストの土地と名前（ご当地の品。region.ts） */
export function partyVisit(): { land: string; host: string } | undefined {
  return role === "guest" && room && last?.playing && last.land ? { land: last.land, host: cleanName(hostName) } : undefined;
}
/** パーティーにいる人数（自分を含む） */
export const partySize = () => role === "host" ? 1 + peers.filter(p => p.open && p.inRoom).length : role === "guest" ? 1 + guestNames.length : 0;
export const partySupported = () => "RTCPeerConnection" in window && "crypto" in window && !!crypto.subtle;
/** パーティーに入っているか（実績用）: ホストで参加者がいる / 参加者で部屋に入れた */
export function partyIn(): "host" | "guest" | undefined {
  if (role === "host" && peers.some(p => p.open && p.inRoom)) return "host";
  if (role === "guest" && room && guestStep === "in") return "guest";
  return undefined;
}
