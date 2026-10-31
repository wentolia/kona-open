// Spotify の曲を鳴らす: Web Playback SDK（Spotify のスクリプト）で、このタブを Spotify の再生先にする。
//  - Spotify の音は DRM で守られていて、Kona の音の経路（EQ・波形・正規化・速さとピッチ・フェード）には通らない。
//    音には手を加えず、再生・一時停止・シーク・音量だけを SDK に頼む（開発者規約: 音を加工しない）
//  - SDK のスクリプトは、Spotify を使うと決めて初めて読む（それまで外のスクリプトは読まない）
//  - Premium のアカウントが要る（SDK の決まり）

import { spotifyApi, spotifyToken } from "./spotify";
import type { Remote } from "./player";

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";

interface SdkTrack { uri: string; linked_from?: { uri: string | null } }
interface SdkState { paused: boolean; position: number; duration: number; track_window: { current_track?: SdkTrack | null } }
interface SdkPlayer {
  connect(): Promise<boolean>; disconnect(): void;
  addListener(ev: string, fn: (d: never) => void): void;
  pause(): Promise<void>; resume(): Promise<void>; seek(ms: number): Promise<void>; setVolume(v: number): Promise<void>;
  activateElement?(): Promise<void>;
}
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: { Player: new (o: { name: string; getOAuthToken: (cb: (t: string) => void) => void; volume?: number }) => SdkPlayer };
  }
}

let sdkLoad: Promise<void> | undefined;
function loadSdk(): Promise<void> {
  return sdkLoad ??= new Promise<void>((resolve, reject) => {
    if (window.Spotify) return resolve();
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const s = document.createElement("script");
    s.src = SDK_URL; s.async = true;
    s.onerror = () => { sdkLoad = undefined; s.remove(); reject(new Error("sdk")); };
    document.head.append(s);
  });
}

/** 再生できなかったとき: 画面のお知らせに回す（spotify-ui.ts が受ける） */
const fail = (kind: string) => document.dispatchEvent(new CustomEvent("kona:spotify-error", { detail: kind }));

class SpotifyRemote implements Remote {
  private sdk?: SdkPlayer;
  private device?: string;
  private connecting?: Promise<string>;
  private st?: { paused: boolean; position: number; duration: number; uri?: string; at: number };
  private wasPlaying = false;
  private readyWait?: (id: string) => void;
  private readyFail?: (e: Error) => void;
  private vol = 0.64;
  onChange?: () => void;
  onEnded?: () => void;

  get paused() { return this.st?.paused ?? true; }
  get currentUri() { return this.st?.uri; }
  private posMs() {
    const s = this.st;
    if (!s) return 0;
    return Math.min(s.duration || Infinity, s.position + (s.paused ? 0 : Date.now() - s.at));
  }
  get position() { return this.posMs() / 1000; }
  get duration() { return (this.st?.duration ?? 0) / 1000; }

  private connect(): Promise<string> {
    if (this.device) return Promise.resolve(this.device);
    return this.connecting ??= (async () => {
      await loadSdk().catch(() => { fail("sdk"); throw new Error("sdk"); });
      if (!this.sdk) {
        const p = new window.Spotify!.Player({ name: "Kona", volume: this.vol, getOAuthToken: cb => { spotifyToken().then(cb, () => fail("auth")); } });
        this.sdk = p;
        p.addListener("ready", (({ device_id }: { device_id: string }) => { this.device = device_id; this.readyWait?.(device_id); }) as (d: never) => void);
        p.addListener("not_ready", () => { this.device = undefined; });
        for (const ev of ["initialization_error", "authentication_error", "account_error", "playback_error"]) {
          p.addListener(ev, () => { fail(ev); if (ev !== "playback_error") this.readyFail?.(new Error(ev)); });
        }
        p.addListener("player_state_changed", ((s: SdkState | null) => this.onState(s)) as (d: never) => void);
      }
      const id = await new Promise<string>((resolve, reject) => {
        this.readyWait = resolve; this.readyFail = reject;
        setTimeout(() => reject(new Error("timeout")), 20_000);
        this.sdk!.connect().then(ok => { if (!ok) reject(new Error("connect")); }, reject);
      });
      return id;
    })().finally(() => { this.connecting = undefined; });
  }

  private onState(s: SdkState | null) {
    if (!s) { this.st = undefined; this.wasPlaying = false; this.onChange?.(); return; }
    // 並べた曲を鳴らし終えると、止まって頭に戻る。曲の終わりぎわまで鳴っていたなら「聴き終えた」とみなす
    const left = this.st ? this.st.duration - this.posMs() : Infinity;
    const ended = s.paused && s.position === 0 && this.wasPlaying && left < 4000;
    const cur = s.track_window.current_track;
    this.st = { paused: s.paused, position: s.position, duration: s.duration, uri: (cur?.linked_from?.uri || cur?.uri) ?? undefined, at: Date.now() };
    this.wasPlaying = !s.paused;
    if (ended) this.onEnded?.(); else this.onChange?.();
  }

  /** 曲を並べて、offset 番目から鳴らす（同じアルバムの続きは Spotify が切れ目なくつなぐ） */
  async play(uris: string[], offset: number, at = 0) {
    this.sdk?.activateElement?.().catch(() => {});
    let id: string;
    try { id = await this.connect(); } catch { return; }
    this.wasPlaying = false;
    const put = () => spotifyApi(`/me/player/play?device_id=${encodeURIComponent(id)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris, offset: { position: offset }, position_ms: Math.max(0, Math.round(at * 1000)) }),
    });
    try { await put(); }
    catch {
      // つないだ直後は、まだ再生先として見えていないことがある。こちらへ切り替えてからもう一度
      try {
        await spotifyApi("/me/player", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_ids: [id], play: false }) });
        await new Promise(r => setTimeout(r, 600));
        await put();
      } catch { fail("play"); }
    }
  }
  pause() { this.sdk?.pause().catch(() => {}); if (this.st && !this.st.paused) { this.st = { ...this.st, position: this.posMs(), paused: true, at: Date.now() }; this.wasPlaying = false; } }
  resume() { this.sdk?.activateElement?.().catch(() => {}); this.sdk?.resume().catch(() => {}); }
  seek(sec: number) {
    const ms = Math.max(0, Math.round(sec * 1000));
    this.sdk?.seek(ms).catch(() => {});
    if (this.st) this.st = { ...this.st, position: ms, at: Date.now() };
  }
  setVolume(v: number) { this.vol = Math.max(0, Math.min(1, v)); this.sdk?.setVolume(this.vol).catch(() => {}); }
  disconnect() { this.sdk?.disconnect(); this.sdk = undefined; this.device = undefined; this.st = undefined; this.wasPlaying = false; }
}

export const spotifyRemote = new SpotifyRemote();
document.addEventListener("kona:spotify-out", () => spotifyRemote.disconnect());
