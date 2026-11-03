// リスニングパーティーの「中継サーバー（TURN）」の設定。
// ホストと参加者は直接（P2P）つなぐが、家庭・携帯・会社の回線どうしでは NAT を越えられないことが多い。
// 中継サーバーを、ホストが 1 か所で設定しておけば、参加者は何もしなくてもその中継を通してつながる
// （参加者の側から中継サーバーへ送るので、参加者の回線の NAT は問題にならない）。
// 認証情報はこの端末の localStorage にだけ置き、招待リンクやリレーには載せない。
import { esc } from "./modctx";

type Kind = "metered" | "cloudflare" | "custom" | "none";
interface RelayConf { kind: Kind; user: string; pass: string; urls: string; stun: string; checked?: { at: number; ok: boolean } }

const KEY = "kona.party.relay";
const OLD_KEY = "kona.party.ice";   // 以前の版: 「stun:… turn:…?username=…&credential=…」の 1 行
const DEFAULT_STUN = "stun:stun.l.google.com:19302";

const KINDS: { kind: Kind; name: string; note: string }[] = [
  { kind: "metered", name: "Metered", note: "metered.ca の TURN。ダッシュボードの「ユーザー名」「パスワード」をそのまま入れます（無料枠 月 500MB ≒ 参加者 1 人で 8 時間ほど）" },
  { kind: "cloudflare", name: "Cloudflare", note: "Cloudflare Realtime の TURN。API で発行した username と credential を入れます（無料枠 月 1000GB。発行した認証情報には有効期限があります）" },
  { kind: "custom", name: "その他", note: "自分で用意した TURN サーバー（coturn など）。URL を空白区切りで並べます" },
  { kind: "none", name: "使わない", note: "直接つなげる相手（同じ Wi-Fi など）とだけつなぎます。別の回線の人とはつながらないことがあります" },
];
const SERVERS: Record<"metered" | "cloudflare", string[]> = {
  metered: ["turn:global.relay.metered.ca:80", "turn:global.relay.metered.ca:80?transport=tcp", "turn:global.relay.metered.ca:443", "turns:global.relay.metered.ca:443?transport=tcp"],
  cloudflare: ["turn:turn.cloudflare.com:3478?transport=udp", "turn:turn.cloudflare.com:3478?transport=tcp", "turns:turn.cloudflare.com:5349?transport=tcp"],
};
const URL_OK = /^(stun|turns?):[\w.-]+(:\d+)?(\?\S*)?$/i;

function load(): RelayConf {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as Partial<RelayConf>;
      const kind = KINDS.some(k => k.kind === c.kind) ? c.kind! : "none";
      return { kind, user: String(c.user ?? ""), pass: String(c.pass ?? ""), urls: String(c.urls ?? ""), stun: String(c.stun ?? DEFAULT_STUN), checked: c.checked };
    }
    // 以前の版の 1 行から移す: turn の行があれば「その他」に、なければ STUN だけ
    const old = localStorage.getItem(OLD_KEY);
    if (old != null) {
      const parts = old.split(/[\s,]+/).filter(Boolean);
      const turns = parts.filter(u => /^turns?:/i.test(u)), stun = parts.filter(u => /^stun:/i.test(u)).join(" ");
      let user = "", pass = "";
      const urls = turns.map(u => {
        const q = u.indexOf("?");
        if (q < 0) return u;
        const p = new URLSearchParams(u.slice(q + 1));
        user ||= p.get("username") ?? ""; pass ||= p.get("credential") ?? "";
        p.delete("username"); p.delete("credential");
        const rest = p.toString();
        return u.slice(0, q) + (rest ? `?${rest}` : "");
      }).join(" ");
      return { kind: turns.length ? "custom" : "none", user, pass, urls, stun };
    }
  } catch { /* 読めなければ既定 */ }
  return { kind: "none", user: "", pass: "", urls: "", stun: DEFAULT_STUN };
}
let conf = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(conf)); localStorage.removeItem(OLD_KEY); } catch { /* ignore */ }
}

const turnUrls = (c: RelayConf) => c.kind === "metered" || c.kind === "cloudflare" ? SERVERS[c.kind]
  : c.kind === "custom" ? c.urls.split(/[\s,]+/).filter(u => URL_OK.test(u) && /^turns?:/i.test(u)) : [];
/** 中継サーバーが使える形で入っているか */
export const relayReady = () => turnUrls(conf).length > 0 && !!conf.user && !!conf.pass;

/** RTCPeerConnection に渡す ICE サーバー。書き損じは渡さない（1 つでもあると接続の準備ごと失敗する） */
export function iceServers(c = conf): RTCIceServer[] {
  const out: RTCIceServer[] = c.stun.split(/[\s,]+/).filter(u => URL_OK.test(u) && /^stun:/i.test(u)).map(urls => ({ urls }));
  const turns = turnUrls(c);
  if (turns.length && c.user && c.pass) out.push({ urls: turns, username: c.user, credential: c.pass });
  return out;
}

/** 中継サーバーに実際に届くか確かめる: 中継だけを使う設定で経路の候補を集め、中継の候補が出れば届いている */
function probe(c: RelayConf): Promise<boolean> {
  return new Promise(resolve => {
    let pc: RTCPeerConnection;
    try { pc = new RTCPeerConnection({ iceServers: iceServers(c), iceTransportPolicy: "relay" }); } catch { resolve(false); return; }
    let done = false;
    const finish = (ok: boolean) => { if (done) return; done = true; clearTimeout(t); try { pc.close(); } catch { /* ignore */ } resolve(ok); };
    const t = window.setTimeout(() => finish(false), 10_000);
    pc.onicecandidate = e => { if (!e.candidate) finish(false); else if (/ typ relay/.test(e.candidate.candidate)) finish(true); };
    pc.createDataChannel("probe");
    pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => finish(false));
  });
}

/** 上に出す一行: いまの中継の様子 */
export function relayStatusHTML(): string {
  const k = KINDS.find(x => x.kind === conf.kind)!;
  if (!relayReady()) return `<span class="relay-status warn"><i></i>中継サーバーが未設定です。別の回線の人とはつながらないことがあります</span>`;
  const ck = conf.checked;
  const tail = !ck ? "（未確認）" : ck.ok ? "（つながることを確認済み）" : "（確認できませんでした）";
  return `<span class="relay-status ${ck && !ck.ok ? "warn" : "ok"}"><i></i>中継サーバー: ${esc(k.name)}${tail}</span>`;
}

/** 設定の欄。host: ホストの画面（開いて見せる）か、参加者の画面（たたんでおく） */
export function relayHTML(host: boolean): string {
  const k = KINDS.find(x => x.kind === conf.kind)!;
  const needCred = conf.kind !== "none";
  const lead = host
    ? "別の回線（携帯・会社・学校・ほかの家）の人とつなぐには、音を中継するサーバーが要ります。ホストが設定しておけば、参加者は設定しなくてもつながります。"
    : "ふつうは設定しなくてもかまいません（ホストが中継サーバーを設定していれば、それを通してつながります）。ホストが設定していないときだけ、ここに入れてください。";
  return `<details class="party-relay-conf"${host && !relayReady() ? " open" : ""}>
  <summary>${relayStatusHTML()}</summary>
  <div class="relay-body">
    <p class="dlg-note">${lead}</p>
    <div class="relay-kinds" role="radiogroup" aria-label="中継サーバー">
      ${KINDS.map(x => `<label class="relay-kind"><input type="radio" name="relay-kind" value="${x.kind}"${x.kind === conf.kind ? " checked" : ""}><span>${esc(x.name)}</span></label>`).join("")}
    </div>
    <p class="dlg-note" id="relay-note">${esc(k.note)}</p>
    <div class="relay-fields"${needCred ? "" : " hidden"}>
      <label class="dlg-field relay-urls"${conf.kind === "custom" ? "" : " hidden"}><span>TURN の URL（空白区切り）</span>
        <input id="relay-urls" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" value="${esc(conf.urls)}" placeholder="turn:turn.example.com:3478 turns:turn.example.com:5349"></label>
      <label class="dlg-field"><span>ユーザー名（username）</span>
        <input id="relay-user" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" value="${esc(conf.user)}"></label>
      <label class="dlg-field"><span>パスワード（credential）</span>
        <input id="relay-pass" type="password" spellcheck="false" autocapitalize="off" autocomplete="off" value="${esc(conf.pass)}"></label>
      <div class="party-row"><button class="btn" id="relay-check" type="button">つながるか確かめる</button><span class="dlg-note" id="relay-result" aria-live="polite"></span></div>
    </div>
    <details class="relay-adv"><summary>STUN サーバー</summary>
      <label class="dlg-field"><span>相手までの道を調べるサーバー（空白区切り。既定は Google の公開 STUN で、あなたの IP アドレスが Google に届きます）</span>
        <input id="relay-stun" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" value="${esc(conf.stun)}" placeholder="${DEFAULT_STUN}"></label>
    </details>
    <p class="dlg-note">ユーザー名とパスワードはこの端末の中にだけ置きます。招待リンクにも、仲介のリレーにも載せません。</p>
  </div>
</details>`;
}

/** 欄を動かす。changed: 設定が変わったとき（上の一行を描き直す） */
export function wireRelay(root: HTMLElement, changed?: () => void) {
  const box = root.querySelector<HTMLElement>(".party-relay-conf");
  if (!box) return;
  const $ = <T extends HTMLElement>(s: string) => box.querySelector<T>(s);
  const repaint = () => {
    const sum = box.querySelector("summary");
    if (sum) sum.innerHTML = relayStatusHTML();
    $<HTMLElement>("#relay-note")!.textContent = KINDS.find(x => x.kind === conf.kind)!.note;
    $<HTMLElement>(".relay-fields")!.hidden = conf.kind === "none";
    $<HTMLElement>(".relay-urls")!.hidden = conf.kind !== "custom";
    changed?.();
  };
  const edit = (f: (c: RelayConf) => void) => { f(conf); conf.checked = undefined; save(); $<HTMLElement>("#relay-result")!.textContent = ""; repaint(); };
  box.querySelectorAll<HTMLInputElement>('input[name="relay-kind"]').forEach(r => r.onchange = () => { if (r.checked) edit(c => { c.kind = r.value as Kind; }); });
  const text = (id: string, f: (c: RelayConf, v: string) => void) => { const el = $<HTMLInputElement>(id); if (el) el.onchange = () => edit(c => f(c, el.value.trim())); };
  text("#relay-urls", (c, v) => { c.urls = v; });
  text("#relay-user", (c, v) => { c.user = v; });
  text("#relay-pass", (c, v) => { c.pass = v; });
  text("#relay-stun", (c, v) => { c.stun = v; });
  const btn = $<HTMLButtonElement>("#relay-check"), out = $<HTMLElement>("#relay-result")!;
  if (btn) btn.onclick = async () => {
    // 入力中（まだ change が来ていない）の値も拾う
    box.querySelectorAll<HTMLInputElement>(".relay-fields input, #relay-stun").forEach(i => i.onchange?.(new Event("change")));
    if (!relayReady()) { out.textContent = conf.kind === "custom" && !turnUrls(conf).length ? "URL の形が正しくありません（turn: か turns: で始めます）" : "ユーザー名とパスワードを入れてください"; return; }
    btn.disabled = true; out.textContent = "確かめています…";
    const ok = await probe(conf);
    btn.disabled = false;
    conf.checked = { at: Date.now(), ok }; save();
    out.textContent = ok ? "つながりました。この設定で使えます" : "中継サーバーに届きませんでした。ユーザー名・パスワード（有効期限）を確かめてください";
    repaint();
  };
}
