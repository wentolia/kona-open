// リスニングパーティーの部屋: 入った人はそれぞれ猫になる。クリックした先へ歩き、しぐさ（寝る・しっぽを振る・リズムをとる…）をし、
// 目線は飼い主のカーソルを追う。ホストがチャットを有効にすると、全員または選んだ人に話しかけられる（猫の吹き出しとチャット窓）。
// つなぐ・送るのは party.ts。ここは部屋の画面と、猫を選ぶ画面と、届いたものの確かめ
// 猫は音を出さない。画面の文字はすべて textContent か esc() で入れる

import "./party-room.css";
import { randomPersona } from "./cat-coat";
import { BREEDS, breedCoat, isCoat, puppetCat, randomCoat, EMOTES, type Coat, type Emote, type Puppet } from "./cat";
import { esc, fmt } from "./modctx";
import { applyLook, buildHome, type HomeSource, type HomeView, type SnapAlbum, type SnapLook, type SnapRow, type SnapSize, type SnapTrack } from "./party-home";

const CAT_KEY = "kona.party.cat";
export const MAX_SAY = 200;
export interface RoomCat { id: string; name: string; coat: Coat; plat: number; fx: number; emote: Emote }
export interface Req { id: string; i?: number; t: string; a: string; tr?: string }
export interface Line { from: string; text: string; to: string[]; at: number; req?: Req }
/** 参加者ができること。ホストが部屋の既定を決め、人ごとに上書きできる */
export interface Perms { chat: boolean; request: boolean; voice: boolean }
export const PERMS: [keyof Perms, string][] = [["chat", "チャット"], ["request", "リクエスト"], ["voice", "通話（話す）"]];
export const isPerms = (x: unknown): x is Perms => !!x && typeof x === "object" && PERMS.every(([k]) => typeof (x as Record<string, unknown>)[k] === "boolean");

// ---------- 届いた猫を確かめる ----------
// 色は SVG にそのまま書き込むので isCoat で形を確かめ、知っている項目だけを写す（好き嫌い・毛づやなどは持ち込まない）
const num = (x: unknown, a: number, b: number, d: number) => typeof x === "number" && Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : d;
export function cleanCoat(x: unknown): Coat | undefined {
  if (!isCoat(x)) return undefined;
  const c = x as Coat, p = (c.p ?? {}) as unknown as Record<string, unknown>;
  const out: Coat = {
    hi: c.hi, mid: c.mid, lo: c.lo, deep: c.deep, cream: c.cream, ink: c.ink,
    breed: c.breed && Object.hasOwn(BREEDS, c.breed) ? c.breed : "mix",
    p: { energy: num(p.energy, 0, 1, .5), sleepy: num(p.sleepy, 0, 1, .5), social: num(p.social, 0, 1, .5), playful: num(p.playful, 0, 1, .5), curious: num(p.curious, 0, 1, .5), speed: num(p.speed, .85, 1.25, 1), size: num(p.size, .86, 1.26, 1) },
  };
  if (c.pat) out.pat = c.pat;
  if (c.mark) out.mark = c.mark;
  if (c.pt) out.pt = { hi: c.pt.hi, mid: c.pt.mid, lo: c.pt.lo, deep: c.pt.deep };
  if (c.pt2) out.pt2 = { hi: c.pt2.hi, mid: c.pt2.mid, lo: c.pt2.lo, deep: c.pt2.deep };
  return out;
}
export const cleanName = (x: unknown) => typeof x === "string" ? x.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20) : "";
export const cleanText = (x: unknown) => typeof x === "string" ? x.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim().slice(0, MAX_SAY) : "";
export const isEmote = (x: unknown): x is Emote => typeof x === "string" && (EMOTES as string[]).includes(x);

const MIC_KEY = "kona.party.mic";   // マイクの使い方（切り替え / 押している間だけ）

// ---------- 自分の猫 ----------
export function myCat(): Coat {
  try { const c = cleanCoat(JSON.parse(localStorage.getItem(CAT_KEY) ?? "null")); if (c) return c; } catch { /* ignore */ }
  const c = cleanCoat(randomCoat())!;
  saveCat(c);
  return c;
}
function saveCat(c: Coat) { try { localStorage.setItem(CAT_KEY, JSON.stringify(c)); } catch { /* ignore */ } }

const TRAITS: [keyof NonNullable<Coat["p"]>, string, number, number][] = [
  ["energy", "元気さ", 0, 1], ["sleepy", "眠たがり", 0, 1], ["social", "人なつこさ", 0, 1], ["playful", "遊び好き", 0, 1],
  ["curious", "好奇心", 0, 1], ["speed", "足の速さ", .85, 1.25], ["size", "体の大きさ", .86, 1.26],
];
/** 猫を選ぶ欄（ランダムに作る・品種・毛色・性格をランダムに変える）。性格は細かく決められない。name は名札に出す名前を返す */
export function editorHtml(): string {
  const c = myCat();
  return `<div class="pe">
    <span class="dlg-note">あなたの猫（パーティーではこの猫になります）</span>
    <div class="pe-stage" id="pe-stage"></div>
    <div class="party-row">
      <button class="btn" id="pe-random">ランダムに作る</button>
      <select id="pe-breed" aria-label="品種">${Object.entries(BREEDS).map(([k, b]) => `<option value="${esc(k)}"${k === (c.breed ?? "mix") ? " selected" : ""}>${esc(b.name)}</option>`).join("")}</select>
      <button class="btn" id="pe-coat">毛色を変える</button>
    </div>
    <details class="pe-traits"><summary>性格（動き方のくせになります）</summary>
      <div class="party-row"><button class="btn" id="pe-persona">性格を変える</button><span class="dlg-note">性格は選べません。押すたびにランダムに決まります</span></div>
      ${TRAITS.map(([k, label, a, b]) => `<label><span>${label}</span><meter data-trait="${k}" min="${a}" max="${b}" value="${c.p?.[k] ?? (a + b) / 2}"></meter></label>`).join("")}
    </details>
  </div>`;
}
export function wireEditor(root: HTMLElement, name: () => string) {
  const stage = root.querySelector<HTMLElement>("#pe-stage");
  if (!stage) return;
  let pup: Puppet | undefined;
  const show = (c: Coat) => {
    pup?.remove();
    pup = puppetCat(stage, { ...c, name: name() || "あなた" }, { plat: 0, fx: .5, emote: "sit" }, .9);
  };
  const set = (c: Coat) => { const ok = cleanCoat(c)!; saveCat(ok); show(ok); sync(ok); };
  const sync = (c: Coat) => {
    root.querySelector<HTMLSelectElement>("#pe-breed")!.value = c.breed ?? "mix";
    root.querySelectorAll<HTMLMeterElement>("[data-trait]").forEach(i => { i.value = c.p?.[i.dataset.trait as keyof NonNullable<Coat["p"]>] ?? i.value; });
  };
  root.querySelector<HTMLButtonElement>("#pe-random")!.onclick = () => set(randomCoat());
  root.querySelector<HTMLSelectElement>("#pe-breed")!.onchange = e => set({ ...breedCoat((e.target as HTMLSelectElement).value), p: myCat().p });
  root.querySelector<HTMLButtonElement>("#pe-coat")!.onclick = () => set({ ...breedCoat(myCat().breed ?? "mix"), p: myCat().p });
  // 性格は選べない。押すたびにランダムに決め直す（体の大きさは品種のものなので、そのまま）
  root.querySelector<HTMLButtonElement>("#pe-persona")!.onclick = () => {
    const c = myCat();
    set({ ...c, p: { ...randomPersona(), size: c.p?.size ?? 1 } });
  };
  root.querySelector<HTMLInputElement>("#party-name")?.addEventListener("change", () => show(myCat()));
  // 部屋の大きさが決まってから置く
  requestAnimationFrame(() => show(myCat()));
}


// ---------- ホストのホームに猫の足場を付ける ----------
// 参加者の写しと同じ順・同じ所（各モジュールの天板・棚板）に足場の印を置く。猫の居場所は「何番目の足場の何割の所」で
// やり取りするので、ホストのホームと写しで足場の並びをそろえる
export function markHome(grid?: HTMLElement): boolean {
  if (!grid) return false;
  let changed = false;
  for (const m of grid.querySelectorAll<HTMLElement>(":scope > .lrow > .lcol > .mod")) {
    let i = m.querySelector<HTMLElement>(":scope > i[data-pr-mark]");
    if (i && i === m.lastElementChild) continue;
    if (!i) {
      i = document.createElement("i");
      i.className = m.classList.contains("mod-shelf") ? "pr-plat pr-plat-board" : "pr-plat";
      i.dataset.catPlat = ""; i.dataset.prMark = "";
    }
    m.append(i); changed = true;
  }
  return changed;
}
export function unmarkHome() { document.querySelectorAll("[data-pr-mark]").forEach(e => e.remove()); }
/** 入ったときの場所: 上から 3 段までのモジュールのどれか（足場がなければ床）の、ランダムな所。みんなが左上に固まらないように */
export function startSpot(): { plat: number; fx: number } {
  const grid = document.querySelector<HTMLElement>("#view-home .grid") ?? undefined;
  markHome(grid);
  const all = grid ? [...grid.querySelectorAll<HTMLElement>("[data-cat-plat]")] : [];
  const top = grid ? [...grid.querySelectorAll<HTMLElement>(":scope > .lrow")].slice(0, 3).flatMap(r => [...r.querySelectorAll<HTMLElement>(":scope > .lcol > .mod > i[data-pr-mark]")]) : [];
  const pick = top[Math.floor(Math.random() * top.length)];
  return { plat: pick ? Math.max(0, all.indexOf(pick)) : 0, fx: .1 + Math.random() * .8 };
}

// ---------- 部屋の画面 ----------
const EMOTE_LABEL: Record<Emote, string> = { stand: "立つ", sit: "座る", lie: "伏せる", sleep: "寝る", wag: "しっぽを振る", groove: "リズムをとる", groom: "毛づくろい", stretch: "伸び", yawn: "あくび" };
export interface RoomOpts {
  me: string;
  host: boolean;
  go(plat: number, fx: number): void;
  emote(e: Emote): void;
  look(p?: [number, number]): void;
  say(text: string, to: string[]): void;
  /** 参加者: 抜ける。ホスト: 部屋を見るのをやめる（パーティーは続く） */
  exit(): void;
  /** ホストから受け取りたいもの（参加者: 頼む。ホスト: 手元で用意する） */
  want(what: { t: "home" } | { t: "cover"; id: string } | { t: "tracks"; id: string } | { t: "find"; q: string }): void;
  request(id: string, i?: number): void;
  toast?(text: string): void;
  /** 通話のマイクを入れる・切る。入れられなかったら false */
  mic(on: boolean): Promise<boolean>;
  /** ホストだけ: 権限を変える（guest を省くと部屋の既定。val が undefined なら既定に戻す） */
  perm?(perm: keyof Perms, val: boolean | undefined, guest?: string): void;
  permsOf?(): { defaults: Perms; guests: Map<string, Partial<Perms>> };
  /** ホストだけ: その人を退出させる */
  kick?(id: string): void;
  /** ホストだけ: リクエストに応える */
  play?(id: string, i?: number): void;
  volume?: { get(): number; set(v: number): void };
  /** ホームの写しのモジュールを何で動かすか（描き直すたびに聞く） */
  src(): HomeSource;
}
export class Room {
  cats = new Map<string, RoomCat>();
  log: Line[] = [];
  perms: Perms = { chat: false, request: false, voice: false };
  now = "";
  nowId?: string;
  albums = new Map<string, SnapAlbum>();
  private rows?: SnapRow[];
  private size?: SnapSize;         // ホストのホームの寸法（この寸法で組んで、画面に合わせて縮める）
  private homeView?: HomeView;
  private covers = new Map<string, string>();
  private asked = new Map<string, number>();   // ジャケットを頼んだ回数（届かなければ、しばらくして頼み直す）
  private tracks = new Map<string, SnapTrack[]>();
  private card?: string;          // 開いているアルバムの札
  private el?: HTMLElement;
  private stage?: HTMLElement;
  private space?: HTMLElement;    // 猫を置く所（ホームの写しの grid）
  private pups = new Map<string, Puppet>();
  private entered = new Map<string, number>();   // 猫をはじめて部屋に置いた時刻（飛び込んでくるのは入った直後だけ）
  private lookT = 0;
  private lastLook?: [number, number];
  private panel: "" | "chat" | "perm" = "";
  private hostLook?: SnapLook;            // ホストのホームの見た目（部屋を開いている間だけ、この画面に当てる）
  private unlook?: () => void;

  private surface?: HTMLElement;      // 押した所・カーソルを受け取る面（参加者は写しの舞台、ホストは自分のホーム）
  private watch?: MutationObserver;
  private markT = 0;
  constructor(private o: RoomOpts) {}
  private onClick = (e: MouseEvent) => {
    const t = e.target as Element;
    // ホストのホームでは、棚・モジュールの操作はそのまま。何もない所を押したときだけ猫が行く
    if (t.closest(this.o.host ? "button, a, input, select, textarea, label, canvas, svg, .spines, .face, .mod-head, [role=button], #pop, .party-room" : "button, a, input, .spines")) return;
    const at = this.spot(e.clientX, e.clientY);
    if (at) this.o.go(at[0], at[1]);
  };
  // 目線: 自分の猫は自分のカーソルを見る。ほかの人にも 0.1 秒おきに知らせる（猫を置いた面の中の割合で）
  private onMove = (e: PointerEvent) => {
    if (!this.space) return;
    const r = this.space.getBoundingClientRect();
    const p: [number, number] = [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
    this.pups.get(this.o.me)?.look(p);
    this.lastLook = p;
    if (!this.lookT) this.lookT = window.setTimeout(() => { this.lookT = 0; this.o.look(this.lastLook); }, 100);
  };
  private onLeave = () => { this.lastLook = undefined; this.pups.get(this.o.me)?.look(); this.o.look(); };
  // ---------- 通話 ----------
  private micOn = false;
  private talkers = new Set<string>();
  private wireMic(el: HTMLElement) {
    const btn = el.querySelector<HTMLButtonElement>("#pr-mic")!, mode = el.querySelector<HTMLSelectElement>("#pr-mic-mode")!;
    try { mode.value = localStorage.getItem(MIC_KEY) === "hold" ? "hold" : "toggle"; } catch { /* ignore */ }
    const paint = () => {
      const hold = mode.value === "hold";
      btn.textContent = hold ? (this.micOn ? "話しています…" : "押している間だけ話す") : (this.micOn ? "マイク オン" : "マイク オフ");
      btn.setAttribute("aria-pressed", String(this.micOn));
      btn.classList.toggle("primary", this.micOn);
    };
    this.paintMic = paint;
    mode.onchange = () => { try { localStorage.setItem(MIC_KEY, mode.value); } catch { /* ignore */ } this.setMic(false); paint(); };
    btn.onclick = () => { if (mode.value === "toggle") this.setMic(!this.micOn); };
    const down = (e: PointerEvent) => { if (mode.value !== "hold" || e.button !== 0) return; btn.setPointerCapture(e.pointerId); this.setMic(true); };
    const up = () => { if (mode.value === "hold") this.setMic(false); };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up); btn.addEventListener("lostpointercapture", up);
    paint();
  }
  private paintMic = () => {};
  private async setMic(on: boolean) {
    if (on && !this.perms.voice) on = false;
    this.micOn = on; this.paintMic();
    const ok = await this.o.mic(on);
    if (!ok && on) { this.micOn = false; this.paintMic(); this.o.toast?.("マイクを使えませんでした（ブラウザの設定でマイクを許可してください）"); }
  }
  /** 話している人の名札に印を出す */
  setTalking(ids: string[]) {
    const now = new Set(ids);
    for (const id of new Set([...this.talkers, ...now])) this.pups.get(id)?.talk(now.has(id));
    this.talkers = now;
  }
  /** 足場が変わったので、猫たちに測り直させる */
  private remeasure() { dispatchEvent(new Event("resize")); }
  get shown() { return !!this.el; }

  open() {
    if (this.el) return;
    const el = this.el = document.createElement("div");
    // ホストは自分のホームのまま（部屋の操作の帯だけを重ねる）。参加者はホストのホームの写しを開く
    const inline = this.o.host;
    el.className = "party-room" + (inline ? " pr-inline" : "");
    if (!inline) { el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); }
    el.setAttribute("aria-label", "リスニングパーティーの部屋");
    el.innerHTML = `
      ${inline ? "" : `<div class="pr-stage" id="pr-stage"></div>`}
      <aside class="pr-side" id="pr-side" hidden>
        <div class="pr-chat-head"><b id="pr-side-title"></b><button class="dlg-x" id="pr-side-x" aria-label="閉じる">×</button></div>
        <div class="pr-side-body" id="pr-chat-body">
          <ol class="pr-log" id="pr-log" aria-live="polite"></ol>
          <form class="pr-say" id="pr-say">
            <select id="pr-to" aria-label="宛先"></select>
            <input id="pr-text" type="text" maxlength="${MAX_SAY}" autocomplete="off" placeholder="話しかける…">
            <button class="btn primary">送る</button>
          </form>
          <form class="pr-find" id="pr-find">
            <input id="pr-q" type="search" maxlength="60" autocomplete="off" placeholder="リクエストする曲を探す（題名・アーティスト）">
            <ul class="pr-found" id="pr-found"></ul>
          </form>
          <p class="dlg-note">個別に送ったものも、ホストを通って届きます。</p>
        </div>
        <div class="pr-side-body" id="pr-perm-body"></div>
      </aside>
      <div class="pr-card" id="pr-card" hidden></div>
      <div class="pr-bar">
        <div class="pr-now" id="pr-now"></div>
        <div class="pr-emotes">${EMOTES.map(e => `<button class="btn" data-emote="${e}">${EMOTE_LABEL[e]}</button>`).join("")}</div>
        <div class="pr-tools">
          ${this.o.volume ? `<label class="pr-vol"><span>音量</span><input id="pr-vol" type="range" min="0" max="1" step="0.01" value="${this.o.volume.get()}"></label>` : ""}
          <span class="pr-mic" id="pr-mic-box" hidden>
            <button class="btn" id="pr-mic" aria-pressed="false">マイク オフ</button>
            <select id="pr-mic-mode" aria-label="マイクの使い方"><option value="toggle">押して切り替え</option><option value="hold">押している間だけ</option></select>
          </span>
          <span class="pr-people" id="pr-people"></span>
          ${this.o.host ? `<button class="btn" id="pr-perm-btn">権限</button>` : ""}
          <button class="btn" id="pr-chat-btn" hidden>チャット</button>
          ${inline ? "" : `<button class="btn" id="pr-exit">抜ける</button>`}
        </div>
      </div>`;
    document.body.append(el);
    if (this.hostLook) { this.unlook?.(); this.unlook = applyLook(this.hostLook); }
    this.stage = el.querySelector<HTMLElement>("#pr-stage") ?? undefined;
    const $ = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
    const surface = this.stage ?? document.querySelector<HTMLElement>("#view-home") ?? el;
    this.surface = surface;
    // 押した所へ行く: 棚・モジュールの上（の近く）ならそこ、そうでなければ床
    surface.addEventListener("click", this.onClick);
    surface.addEventListener("pointermove", this.onMove);
    surface.addEventListener("pointerleave", this.onLeave);
    el.querySelectorAll<HTMLButtonElement>("[data-emote]").forEach(b => b.onclick = () => this.o.emote(b.dataset.emote as Emote));
    el.querySelector<HTMLButtonElement>("#pr-exit")?.addEventListener("click", () => this.o.exit());
    if (inline) {
      document.documentElement.dataset.partyBar = "";
      requestAnimationFrame(() => { const h = el.querySelector<HTMLElement>(".pr-bar")?.offsetHeight; if (h) document.documentElement.style.setProperty("--pr-bar-h", `${h}px`); });
      // ホームが描き直されたら（棚の並べ替えなど）、足場の印を付け直し、猫を置き直す
      this.watch = new MutationObserver(() => {
        if (this.markT) return;
        this.markT = requestAnimationFrame(() => { this.markT = 0; if (this.space && !this.space.isConnected) this.drawSpace(); else if (markHome(this.space)) this.remeasure(); });
      });
      const view = document.querySelector("#view-home");
      if (view) this.watch.observe(view, { childList: true, subtree: true });
    }
    this.wireMic(el);
    const vol = el.querySelector<HTMLInputElement>("#pr-vol");
    if (vol) vol.oninput = () => this.o.volume!.set(Number(vol.value));
    el.querySelector<HTMLButtonElement>("#pr-perm-btn")?.addEventListener("click", () => this.togglePanel("perm"));
    $<HTMLButtonElement>("#pr-chat-btn").onclick = () => this.togglePanel("chat");
    $<HTMLButtonElement>("#pr-side-x").onclick = () => this.togglePanel("");
    $<HTMLFormElement>("#pr-say").onsubmit = e => {
      e.preventDefault();
      const t = $<HTMLInputElement>("#pr-text"), text = cleanText(t.value);
      if (!text || !this.perms.chat) return;
      const to = $<HTMLSelectElement>("#pr-to").value;
      this.o.say(text, to ? [to] : []);
      t.value = "";
    };
    let findT = 0;
    $<HTMLInputElement>("#pr-q").oninput = e => {
      clearTimeout(findT);
      const q = (e.target as HTMLInputElement).value.trim().slice(0, 60);
      findT = window.setTimeout(() => { if (q) this.o.want({ t: "find", q }); else this.showFound([]); }, 300);
    };
    $<HTMLFormElement>("#pr-find").onsubmit = e => e.preventDefault();
    if (!inline) addEventListener("keydown", this.onKey, true);
    if (!this.rows) this.askHome();
    if (!this.homeView) this.drawSpace();
    this.refresh();
  }
  close() {
    this.surface?.removeEventListener("click", this.onClick);
    this.surface?.removeEventListener("pointermove", this.onMove);
    this.surface?.removeEventListener("pointerleave", this.onLeave);
    this.surface = undefined;
    this.watch?.disconnect(); this.watch = undefined; cancelAnimationFrame(this.markT); this.markT = 0;
    if (this.o.host) { unmarkHome(); delete document.documentElement.dataset.partyBar; }
    for (const p of this.pups.values()) p.remove();
    this.pups.clear();
    this.homeView?.dispose();
    this.unlook?.(); this.unlook = undefined;
    this.el?.remove(); this.el = this.stage = this.space = undefined; this.homeView = undefined;
    clearTimeout(this.lookT); this.lookT = 0;
    removeEventListener("keydown", this.onKey, true);
  }
  // 部屋の外（自分のプレイヤー）への近道キーは届かせない。Esc は、開いている札や欄を閉じるだけ
  private onKey = (e: KeyboardEvent) => {
    if (!this.el) return;
    if (e.key === "Escape") { e.stopPropagation(); if (this.card) this.closeCard(); else if (this.panel) this.togglePanel(""); return; }
    if (!this.el.contains(e.target as Node)) e.stopPropagation();
  };

  // ---------- ホームの写し ----------
  private floorIndex() { return this.space ? this.space.querySelectorAll("[data-cat-plat]").length : 0; }
  private drawSpace() {
    if (this.o.host) {
      // ホスト: 自分のホームに猫を置く
      if (!this.el) return;
      for (const p of this.pups.values()) p.remove();
      this.pups.clear();
      this.space = document.querySelector<HTMLElement>("#view-home .grid") ?? undefined;
      if (this.space) markHome(this.space);
      requestAnimationFrame(() => { for (const c of this.cats.values()) this.place(c); });
      return;
    }
    if (!this.stage) return;
    for (const p of this.pups.values()) p.remove();
    this.pups.clear();
    this.homeView?.dispose(); this.homeView = undefined;
    this.stage.replaceChildren();
    if (this.rows) {
      this.homeView = buildHome(this.rows, this.albums, { cover: id => this.wantCover(id), open: id => this.openCard(id), src: this.o.src(), size: this.size });
      this.stage.append(this.homeView.el);
      this.space = this.homeView.el.querySelector<HTMLElement>(".grid")!;
      for (const [id, url] of this.covers) this.homeView.setCover(id, url);
      this.homeView.setNow(this.nowId);
    } else {
      this.stage.innerHTML = `<p class="pr-wait">ホームを受け取っています…</p>`;
      this.space = undefined;
    }
    requestAnimationFrame(() => { for (const c of this.cats.values()) this.place(c); });
  }
  /** ホストから届いたホームの形とアルバム */
  setHome(rows: SnapRow[], albums: SnapAlbum[], look?: SnapLook, size?: SnapSize) {
    this.rows = rows; this.size = size;
    if (look) { this.hostLook = look; if (this.el) { this.unlook?.(); this.unlook = applyLook(look); } }
    this.albums.clear();   // 送るアルバムのセットが変わったら、前のものは見せない
    for (const a of albums) this.albums.set(a.id, a);
    this.drawSpace();
  }
  // ホームの写しが届くまで、間をあけて頼み直す（ホストが間引いて黙って捨てることがある）
  private askHome(n = 0) {
    if (this.rows || !this.el || n > 8) return;
    this.o.want({ t: "home" });
    window.setTimeout(() => this.askHome(n + 1), 3000);
  }
  /** 描き直す（モジュールの動かし方が変わったとき） */
  redraw() { if (this.stage) this.drawSpace(); }
  coverOf(id: string) { return this.covers.get(id); }
  addAlbums(albums: SnapAlbum[]) { for (const a of albums) this.albums.set(a.id, a); }
  setCover(id: string, url: string) {
    this.covers.set(id, url);
    this.homeView?.setCover(id, url);
    if (this.card === id) this.drawCard();
  }
  private wantCover(id: string) {
    if (this.covers.has(id) || this.asked.has(id)) return;
    this.ask(id, 1);
  }
  // 一度に頼みすぎると、ホストが間引いて黙って捨てる。届かなければ、間をあけて 3 回まで頼み直す
  private ask(id: string, n: number) {
    this.asked.set(id, n);
    this.o.want({ t: "cover", id });
    if (n < 3) window.setTimeout(() => { if (this.el && !this.covers.has(id) && this.albums.has(id)) this.ask(id, n + 1); }, 2500 * n + Math.random() * 1500);
  }
  setTracks(id: string, t: SnapTrack[]) { this.tracks.set(id, t); if (this.card === id) this.drawCard(); }
  showFound(list: SnapAlbum[]) {
    for (const a of list) if (!this.albums.has(a.id)) this.albums.set(a.id, a);
    const ul = this.el?.querySelector<HTMLElement>("#pr-found");
    if (!ul) return;
    ul.replaceChildren(...list.map(a => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.className = "pr-found-item";
      const t = document.createElement("b"); t.textContent = a.t;
      const s = document.createElement("span"); s.textContent = a.a;
      b.append(t, s); b.onclick = () => this.openCard(a.id);
      li.append(b); return li;
    }));
  }

  // ---------- アルバムの札（ジャケット・曲目・リクエスト） ----------
  private openCard(id: string) {
    if (!this.albums.has(id)) return;
    this.card = id;
    this.wantCover(id);
    if (!this.tracks.has(id)) {
      this.o.want({ t: "tracks", id });
      // 間引かれて届かないことがある。札を開いたままなら頼み直す
      window.setTimeout(() => { if (this.card === id && !this.tracks.has(id)) this.o.want({ t: "tracks", id }); }, 3000);
    }
    this.drawCard();
  }
  private closeCard() { this.card = undefined; const c = this.el?.querySelector<HTMLElement>("#pr-card"); if (c) c.hidden = true; }
  private drawCard() {
    const box = this.el?.querySelector<HTMLElement>("#pr-card");
    const id = this.card, a = id ? this.albums.get(id) : undefined;
    if (!box || !id || !a) return;
    box.hidden = false;
    box.replaceChildren();
    const head = document.createElement("div"); head.className = "pr-card-head";
    const art = document.createElement("div"); art.className = "pr-card-art";
    const url = this.covers.get(id);
    if (url) { const img = document.createElement("img"); img.alt = ""; img.src = url; art.append(img); } else art.style.background = a.c;
    const meta = document.createElement("div");
    const t = document.createElement("b"); t.textContent = a.t;
    const ar = document.createElement("span"); ar.textContent = [a.a, a.y].filter(Boolean).join(" · ");
    meta.append(t, ar);
    const can = this.o.host || this.perms.request;
    if (can) {
      const rq = document.createElement("button"); rq.className = "btn primary"; rq.textContent = this.o.host ? "かける" : "このアルバムをリクエスト";
      rq.onclick = () => { this.o.host ? this.o.play?.(id) : this.o.request(id); if (!this.o.host) rq.disabled = true; };
      meta.append(rq);
    }
    const x = document.createElement("button"); x.className = "dlg-x"; x.textContent = "×"; x.setAttribute("aria-label", "閉じる"); x.onclick = () => this.closeCard();
    head.append(art, meta, x);
    const ol = document.createElement("ol"); ol.className = "pr-tracks";
    const tr = this.tracks.get(id);
    if (!tr) { const li = document.createElement("li"); li.textContent = "曲目を受け取っています…"; ol.append(li); }
    else tr.forEach((s, i) => {
      const li = document.createElement("li");
      const n = document.createElement("span"); n.textContent = String(s.no).padStart(2, "0");
      const nm = document.createElement("span"); nm.textContent = s.t;
      const d = document.createElement("span"); d.textContent = s.d ? fmt(s.d) : "";
      li.append(n, nm, d);
      if (can) {
        const b = document.createElement("button"); b.className = "btn"; b.textContent = this.o.host ? "かける" : "リクエスト";
        b.onclick = () => { this.o.host ? this.o.play?.(id, i) : this.o.request(id, i); if (!this.o.host) b.disabled = true; };
        li.append(b);
      }
      ol.append(li);
    });
    box.append(head, ol);
  }

  /** 画面の点から「何番目の足場の、幅の何割」 */
  private spot(x: number, y: number): [number, number] | undefined {
    if (!this.space) return undefined;
    const g = this.space.getBoundingClientRect(), plats = [...this.space.querySelectorAll<HTMLElement>("[data-cat-plat]")];
    // いちばん近い足場の上（ホームの写しは縦に長いので、床へ落とさず、押した所の近くの棚やモジュールに乗る）
    let best: [number, number, number] | undefined;
    plats.forEach((e, i) => {
      const r = e.getBoundingClientRect(), top = r.top + Number(e.dataset.sink ?? 0);
      if (r.width < 40) return;
      const cx = Math.min(r.right, Math.max(r.left, x)), d = Math.hypot(x - cx, (y - top) * (y > top ? 1.6 : 1));
      if (!best || d < best[2]) best = [i, (cx - r.left) / r.width, d];
    });
    if (best && (best[2] < 160 || y < g.bottom - 60)) return [best[0], Math.min(.97, Math.max(.03, best[1]))];
    return [plats.length, (x - g.left) / g.width];
  }
  private place(c: RoomCat) {
    this.pups.get(c.id)?.remove(); this.pups.delete(c.id);
    if (!this.space) return;
    const floor = this.floorIndex();
    // はじめて置く猫（入ってきた猫・入ったときにいた猫）は、上から飛び込んでくる。描き直しのときはそのまま置く
    // （入った直後はホームの写しが続けて描き直されることがあるので、少しの間は飛び込みをやり直す）
    const t = performance.now(), first = this.entered.get(c.id) ?? t;
    this.entered.set(c.id, first);
    const enter = t - first < 2000;
    this.pups.set(c.id, puppetCat(this.space, { ...c.coat, name: c.name || "名無し" }, { plat: Math.min(c.plat, floor), fx: c.fx, emote: c.emote }, 1, enter));
  }

  // ---------- 届いたことを部屋に映す ----------
  add(c: RoomCat) { this.cats.set(c.id, c); this.place(c); this.refresh(); }
  remove(id: string) { this.cats.delete(id); this.entered.delete(id); this.pups.get(id)?.remove(); this.pups.delete(id); this.refresh(); }
  go(id: string, plat: number, fx: number) {
    const c = this.cats.get(id); if (!c) return;
    c.plat = plat; c.fx = fx; if (c.emote !== "groove" && c.emote !== "wag") c.emote = "stand";
    this.pups.get(id)?.go(plat, fx);
  }
  emote(id: string, e: Emote) { const c = this.cats.get(id); if (!c) return; c.emote = e; this.pups.get(id)?.emote(e); }
  look(id: string, p?: [number, number]) { if (id !== this.o.me) this.pups.get(id)?.look(p); }
  said(l: Line) {
    this.log.push(l); if (this.log.length > 200) this.log.shift();
    if (l.req) this.albums.set(l.req.id, this.albums.get(l.req.id) ?? { id: l.req.id, t: l.req.t, a: l.req.a, c: "#555", n: 0 });
    this.pups.get(l.from)?.say(l.req ? `♪ ${l.req.tr ?? l.req.t}` : l.text, l.to.length > 0);
    this.refreshLog();
  }
  setPerms(p: Perms) {
    this.perms = p;
    if (!p.voice && this.micOn) this.setMic(false);   // 話せなくなったら、マイクを切る
    if (!p.chat && !p.request && this.panel === "chat") this.togglePanel("");
    if (this.card) this.drawCard();
    this.refresh();
  }
  setNow(text: string, id?: string) {
    this.now = text;
    const n = this.el?.querySelector<HTMLElement>("#pr-now"); if (n) n.textContent = text;
    if (id !== this.nowId) { this.nowId = id; if (id && !this.albums.has(id) && this.o.host) this.o.want({ t: "home" }); this.homeView?.setNow(id); }
  }

  private togglePanel(p: "" | "chat" | "perm") {
    this.panel = this.panel === p ? "" : p;
    if (this.panel === "chat" && !(this.perms.chat || this.perms.request || this.o.host)) this.panel = "";
    const side = this.el?.querySelector<HTMLElement>("#pr-side");
    if (!side) return;
    side.hidden = !this.panel;
    side.querySelector<HTMLElement>("#pr-side-title")!.textContent = this.panel === "perm" ? "権限" : "チャット";
    side.querySelector<HTMLElement>("#pr-chat-body")!.hidden = this.panel !== "chat";
    side.querySelector<HTMLElement>("#pr-perm-body")!.hidden = this.panel !== "perm";
    if (this.panel === "chat") { this.refreshLog(); this.el?.querySelector<HTMLInputElement>("#pr-text")?.focus(); }
    if (this.panel === "perm") this.drawPerms();
    this.refresh();
  }
  /** ホスト: 部屋の既定と、人ごとの上書き */
  drawPerms() {
    const body = this.el?.querySelector<HTMLElement>("#pr-perm-body");
    if (!body || !this.o.permsOf || this.panel !== "perm") return;
    const { defaults, guests } = this.o.permsOf();
    const others = [...this.cats.values()].filter(c => c.id !== this.o.me);
    body.innerHTML = `
      <p class="dlg-note">全員の既定（あとから入る人にも効きます）</p>
      ${PERMS.map(([k, label]) => `<label class="pr-perm"><input type="checkbox" data-def="${k}"${defaults[k] ? " checked" : ""}> ${esc(label)}</label>`).join("")}
      <p class="dlg-note">人ごと（「既定」は上の設定に従います）</p>
      ${others.length ? others.map(c => `<fieldset class="pr-perm-who"><legend>${esc(c.name || "名無し")}</legend>${PERMS.map(([k, label]) => {
        const v = guests.get(c.id)?.[k];
        return `<label><span>${esc(label.replace(/（.*）/, ""))}</span><select data-who="${esc(c.id)}" data-perm="${k}"><option value=""${v === undefined ? " selected" : ""}>既定（${defaults[k] ? "可" : "不可"}）</option><option value="1"${v === true ? " selected" : ""}>可</option><option value="0"${v === false ? " selected" : ""}>不可</option></select></label>`;
      }).join("")}<button type="button" class="btn pr-kick" data-kick="${esc(c.id)}">退出させる</button></fieldset>`).join("") : `<p class="dlg-note">まだだれも入っていません。</p>`}
      <p class="dlg-note">入った人には、棚の並び・アルバムの題名とジャケット・曲目が見えます（フォルダの場所は送りません）。</p>`;
    body.querySelectorAll<HTMLInputElement>("[data-def]").forEach(i => i.onchange = () => { this.o.perm?.(i.dataset.def as keyof Perms, i.checked); this.drawPerms(); });
    body.querySelectorAll<HTMLButtonElement>("[data-kick]").forEach(b => b.onclick = () => {
      if (b.dataset.armed) { this.o.kick?.(b.dataset.kick!); return; }
      b.dataset.armed = "1"; b.textContent = "もう一度押すと退出";   // 押しまちがえ防止（確認のダイアログは出さない）
    });
    body.querySelectorAll<HTMLSelectElement>("[data-who]").forEach(s => s.onchange = () => this.o.perm?.(s.dataset.perm as keyof Perms, s.value === "" ? undefined : s.value === "1", s.dataset.who));
  }
  private nameOf(id: string) { return this.cats.get(id)?.name || "名無し"; }
  refresh() {
    if (!this.el) return;
    const people = this.el.querySelector<HTMLElement>("#pr-people")!;
    people.textContent = `${this.cats.size}匹`;
    people.title = [...this.cats.values()].map(c => c.name || "名無し").join("・");
    this.el.querySelector<HTMLButtonElement>("#pr-chat-btn")!.hidden = !(this.perms.chat || this.perms.request || this.o.host);
    this.el.querySelector<HTMLFormElement>("#pr-say")!.hidden = !this.perms.chat;
    this.el.querySelector<HTMLFormElement>("#pr-find")!.hidden = !(this.perms.request || this.o.host);
    const to = this.el.querySelector<HTMLSelectElement>("#pr-to")!, was = to.value;
    to.innerHTML = `<option value="">全員へ</option>` + [...this.cats.values()].filter(c => c.id !== this.o.me)
      .map(c => `<option value="${esc(c.id)}">${esc(c.name || "名無し")}さんだけへ</option>`).join("");
    to.value = [...to.options].some(o => o.value === was) ? was : "";
    const n = this.el.querySelector<HTMLElement>("#pr-now"); if (n) n.textContent = this.now;
    this.el.querySelector<HTMLElement>("#pr-mic-box")!.hidden = !this.perms.voice;
    this.drawPerms();
  }
  private refreshLog() {
    const ol = this.el?.querySelector<HTMLElement>("#pr-log");
    if (!ol || this.panel !== "chat") return;
    ol.replaceChildren(...this.log.map(l => {
      const li = document.createElement("li"), who = document.createElement("b"), t = document.createElement("span");
      who.textContent = this.nameOf(l.from) + (l.to.length ? ` → ${l.to.map(i => i === this.o.me ? "あなた" : this.nameOf(i)).join("・")}` : "") + (l.req ? " のリクエスト" : "");
      if (l.req) {
        const r = l.req;
        t.textContent = r.tr ? `${r.tr}（${r.t}${r.a ? ` · ${r.a}` : ""}）` : `${r.t}${r.a ? ` · ${r.a}` : ""}`;
        li.className = "req";
        li.append(who, t);
        const row = document.createElement("div"); row.className = "pr-req-acts";
        const see = document.createElement("button"); see.className = "btn"; see.textContent = "見る"; see.onclick = () => this.openCard(r.id);
        row.append(see);
        if (this.o.host) { const play = document.createElement("button"); play.className = "btn primary"; play.textContent = "かける"; play.onclick = () => this.o.play?.(r.id, r.i); row.append(play); }
        li.append(row);
        return li;
      }
      t.textContent = l.text;
      if (l.to.length) li.className = "secret";
      li.append(who, t);
      return li;
    }));
    ol.scrollTop = ol.scrollHeight;
  }
}
