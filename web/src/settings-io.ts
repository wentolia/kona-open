// 設定の書き出し・読み込み: ブラウザに保存した設定（kona.*）を JSON ファイルにして、別の端末やブラウザへ持っていく。サーバーは使わない

const FORMAT = "kona-settings";
const VERSION = 1;

// 書き出さないもの: Drive と Spotify のサインイン情報（トークン）と一時的な状態、この端末だけの状態（再生位置・次に再生・端末に残した曲・スマホ表示の強制）
const NEVER = new Set(["kona.drive.token", "kona.drive.state", "kona.drive.resume", "kona.drive.kept", "kona.spotify.token", "kona.spotify.pkce", "kona.spotify.last", "kona.now", "kona.queue", "kona.mobile"]);
const isNever = (k: string) => NEVER.has(k) || k.startsWith("kona.mock.");
// 聴いた記録（再生回数・日時・場所・聴いた時間）。頼まれたときだけ入れる
const RECORDS = new Set(["kona.history", "kona.log", "kona.listened", "kona.awards"]);

interface SettingsFile { format: string; version: number; exportedAt: string; records: boolean; items: Record<string, string> }

function collect(records: boolean): Record<string, string> {
  const items: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("kona.") || isNever(k)) continue;
    if (RECORDS.has(k) && !records) continue;
    const v = localStorage.getItem(k);
    if (v !== null) items[k] = v;
  }
  return items;
}

/** 設定を JSON ファイルとして保存させる。records が true なら聴いた記録も入れる */
export function exportSettings(records: boolean): number {
  const items = collect(records);
  const data: SettingsFile = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), records, items };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  const d = new Date(), ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  a.href = URL.createObjectURL(blob);
  a.download = `kona-settings-${ymd}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return Object.keys(items).length;
}

/** 書き出したファイルを読み、設定を置き換える。読み込んだ項目の数を返す（形式が違えば例外） */
export async function importSettings(file: File): Promise<number> {
  const data = JSON.parse(await file.text()) as Partial<SettingsFile>;
  if (data?.format !== FORMAT || typeof data.items !== "object" || !data.items) throw new Error("Kona の設定ファイルではありません");
  if ((data.version ?? 0) > VERSION) throw new Error("新しい版の Kona で書き出したファイルです");
  let n = 0;
  for (const [k, v] of Object.entries(data.items)) {
    if (!k.startsWith("kona.") || isNever(k) || typeof v !== "string") continue;
    localStorage.setItem(k, v); n++;
  }
  return n;
}

/** ファイルを選ばせて読み込む */
export function pickSettingsFile(): Promise<File | undefined> {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json,.json";
    input.onchange = () => resolve(input.files?.[0]);
    input.click();
  });
}
