// リスニングパーティーの「仲介」: 公開の Nostr リレーを郵便受けとして借り、WebRTC の接続情報を受け渡す。
//  - Kona はサーバーを持たない。リレーは誰でも使える公開のもので、アカウントも鍵の登録もいらない
//  - 部屋の鍵（ランダムな 32 バイト）は招待リンクの # 以降にだけ入る。# 以降はどのサーバーにも送られない
//  - リレーに見えるのは、鍵から導いた中身のない目印（部屋の札）と、暗号文と、使い捨ての公開鍵だけ。
//    接続情報（IP アドレスを含む）は部屋の鍵で暗号化（AES-GCM）してから出す
//  - 送る出来事はエフェメラル（kind 20000〜29999）。リレーは保存せず、その場にいる購読者に配るだけ
//  - 名乗りの公開鍵はこのページを開いている間だけの使い捨て。ほかの何とも結びつかない

import { schnorr } from "@noble/curves/secp256k1.js";

export const RELAYS = ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net", "wss://nostr.mom"];
const RELAYS_KEY = "kona.party.relays";   // 開発用（手元のリレーで試す）。公開版は CSP で上の 4 つ以外につながらない
const KIND = 29_391;                      // エフェメラル（保存されない）
const MAX_AGE = 120;                      // これより古い（新しすぎる）知らせは捨てる（秒）
const MAX_CONTENT = 48 * 1024;

const enc = new TextEncoder(), dec = new TextDecoder();
const hex = (u: Uint8Array) => Array.from(u, b => b.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], h => parseInt(h, 16));
export const b64 = (u: Uint8Array) => { let s = ""; for (const c of u) s += String.fromCharCode(c); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
export const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
const sha256 = async (u: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", u as BufferSource));

export function relays(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RELAYS_KEY) ?? "null");
    if (Array.isArray(v) && v.length && v.every(x => typeof x === "string" && /^wss?:\/\//.test(x))) return v;
  } catch { /* ignore */ }
  return RELAYS;
}

/** 部屋の鍵を新しく作る（招待リンクに入れる文字列） */
export function newRoomKey(): string { return b64(crypto.getRandomValues(new Uint8Array(32))); }
export const isRoomKey = (s: string) => /^[\w-]{43}$/.test(s);

/** 部屋の鍵から、リレーに出す札と暗号の鍵を導く（HKDF。札から鍵は戻せない） */
async function derive(roomKey: string): Promise<{ tag: string; key: CryptoKey }> {
  const base = await crypto.subtle.importKey("raw", unb64(roomKey) as BufferSource, "HKDF", false, ["deriveBits", "deriveKey"]);
  const p = (info: string) => ({ name: "HKDF", hash: "SHA-256", salt: enc.encode("kona-party-v1"), info: enc.encode(info) });
  const tag = hex(new Uint8Array(await crypto.subtle.deriveBits(p("room-tag"), base, 256)));
  const key = await crypto.subtle.deriveKey(p("seal"), base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { tag, key };
}

/** 受け渡す中身。to は宛先の公開鍵（空なら部屋の全員＝ホスト宛ての「入れてください」） */
export type Note =
  | { t: "knock"; name: string }
  | { t: "offer"; name: string; sdp: string }
  | { t: "answer"; sdp: string }
  | { t: "no" };
export interface Letter { from: string; note: Note }

const isStr = (x: unknown, max: number): x is string => typeof x === "string" && x.length <= max;
function asNote(x: unknown): Note | undefined {
  const m = x as Record<string, unknown>;
  if (!m || typeof m !== "object") return undefined;
  if (m.t === "knock" && isStr(m.name, 40)) return { t: "knock", name: m.name };
  if (m.t === "offer" && isStr(m.name, 40) && isStr(m.sdp, 32_000)) return { t: "offer", name: m.name, sdp: m.sdp };
  if (m.t === "answer" && isStr(m.sdp, 32_000)) return { t: "answer", sdp: m.sdp };
  if (m.t === "no") return { t: "no" };
  return undefined;
}

interface NostrEvent { id: string; pubkey: string; created_at: number; kind: number; tags: string[][]; content: string; sig: string }

/** 部屋の郵便受け。開くとリレーにつなぎ、自分宛て（と部屋宛て）の知らせだけを渡す */
export class Mailbox {
  readonly me: string;
  private sk: Uint8Array;
  private socks: WebSocket[] = [];
  private seen = new Set<string>();
  private closed = false;
  private tag = "";
  private key?: CryptoKey;
  private retry = 0;
  /** つながっているリレーの数が変わったとき */
  onStatus?: (open: number) => void;

  constructor(private roomKey: string, private onLetter: (l: Letter) => void) {
    this.sk = schnorr.utils.randomSecretKey();
    this.me = hex(schnorr.getPublicKey(this.sk));
  }

  async open() {
    ({ tag: this.tag, key: this.key } = await derive(this.roomKey));
    if (this.closed) return;
    for (const url of relays()) this.connect(url);
  }
  close() {
    this.closed = true; clearTimeout(this.retry);
    for (const s of this.socks) try { s.close(); } catch { /* ignore */ }
    this.socks = [];
  }
  get openCount() { return this.socks.filter(s => s.readyState === WebSocket.OPEN).length; }

  private connect(url: string, wait = 2000) {
    if (this.closed) return;
    let s: WebSocket;
    try { s = new WebSocket(url); } catch { return; }
    this.socks.push(s);
    s.onopen = () => {
      wait = 2000;
      // 札が同じで、いまから先の知らせだけ（エフェメラルなので過去のものはそもそも無い）
      s.send(JSON.stringify(["REQ", "kona", { kinds: [KIND], "#x": [this.tag], since: Math.floor(Date.now() / 1000) - 10 }]));
      this.onStatus?.(this.openCount);
    };
    s.onmessage = e => { if (typeof e.data === "string" && e.data.length < MAX_CONTENT * 2) this.receive(e.data); };
    s.onclose = () => {
      this.socks = this.socks.filter(x => x !== s);
      this.onStatus?.(this.openCount);
      // 落ちたリレーには、間をあけてつなぎ直す（最大 1 分おき）
      if (!this.closed) this.retry = window.setTimeout(() => this.connect(url, Math.min(wait * 2, 60_000)), wait);
    };
  }

  private async receive(raw: string) {
    let m: unknown;
    try { m = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(m) || m[0] !== "EVENT" || m[1] !== "kona") return;
    const ev = m[2] as NostrEvent;
    if (!ev || typeof ev !== "object" || ev.kind !== KIND || typeof ev.content !== "string" || ev.content.length > MAX_CONTENT) return;
    if (typeof ev.id !== "string" || this.seen.has(ev.id) || ev.pubkey === this.me) return;
    if (!Array.isArray(ev.tags) || !ev.tags.some(t => Array.isArray(t) && t[0] === "x" && t[1] === this.tag)) return;
    if (!Number.isFinite(ev.created_at) || Math.abs(Date.now() / 1000 - ev.created_at) > MAX_AGE) return;
    this.seen.add(ev.id);
    if (this.seen.size > 2000) this.seen = new Set([...this.seen].slice(-1000));
    // リレーを信用しない: 署名を自分で確かめる（名乗りの公開鍵を他人がかたれないように）
    try {
      if (!/^[0-9a-f]{64}$/.test(ev.pubkey) || !/^[0-9a-f]{128}$/.test(ev.sig)) return;
      const id = await sha256(enc.encode(JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content])));
      if (hex(id) !== ev.id || !schnorr.verify(unhex(ev.sig), id, unhex(ev.pubkey))) return;
    } catch { return; }
    const body = await this.unseal(ev.content, ev.pubkey);
    if (!body) return;
    // 宛先が自分でないもの・部屋宛てでないものは読まない
    if (body.to !== "" && body.to !== this.me) return;
    const note = asNote(body.note);
    if (note && !this.closed) this.onLetter({ from: ev.pubkey, note });
  }

  /** 宛先 to（空なら部屋宛て）に知らせを出す。すべてのリレーに同じものを出す */
  async send(to: string, note: Note) {
    if (!this.key || this.closed) return;
    const content = await this.seal({ to, note });
    const created_at = Math.floor(Date.now() / 1000), tags = [["x", this.tag]];
    const id = await sha256(enc.encode(JSON.stringify([0, this.me, created_at, KIND, tags, content])));
    const ev: NostrEvent = { id: hex(id), pubkey: this.me, created_at, kind: KIND, tags, content, sig: hex(schnorr.sign(id, this.sk)) };
    const msg = JSON.stringify(["EVENT", ev]);
    for (const s of this.socks) if (s.readyState === WebSocket.OPEN) try { s.send(msg); } catch { /* ignore */ }
  }

  // 中身は AES-GCM。差出人の公開鍵を「追加の認証データ」にして、別の名乗りに付け替えて流し直せないようにする
  private async seal(body: { to: string; note: Note }): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(this.me) }, this.key!, enc.encode(JSON.stringify(body))));
    const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length);
    return b64(out);
  }
  private async unseal(content: string, from: string): Promise<{ to: string; note: unknown } | undefined> {
    try {
      const raw = unb64(content);
      if (raw.length < 29) return undefined;
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12), additionalData: enc.encode(from) }, this.key!, raw.slice(12));
      const o = JSON.parse(dec.decode(pt));
      return o && typeof o.to === "string" ? o : undefined;
    } catch { return undefined; }   // 鍵が違う・壊れている・改ざんされている
  }
}
