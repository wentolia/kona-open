// ライブラリの構築: 選んだフォルダ直下のサブフォルダを「棚」、音声ファイルを直接含むフォルダを「アルバム」とみなす

import { parseBlob, parseBuffer, type IAudioMetadata } from "music-metadata";
import { isDriveEntry, type DriveEntry } from "./drive";
import { kvGet, kvSet } from "./store";
import { fileSig, getHead, getTracks, putHead, putTracks, cachedHeads } from "./tagcache";
import { collator } from "./dom";

export interface Entry { path: string; getFile: () => Promise<File> }
// Google Drive の項目は、先頭だけを取る head() と、次の曲を先に取っておく prefetch() も持つ（drive.ts）

export interface Track {
  entry: Entry;
  title: string;
  no: number;
  disc: number;
  duration?: number;
  format?: string;      // 例: FLAC · 24bit / 96kHz
  rgTrack?: number;     // ReplayGain（dB）
  rgAlbum?: number;
}

export interface Album {
  key: string;          // フォルダのパス（履歴のキー）
  shelf: string;        // 棚名（ルート直下のフォルダ名）
  dir: string;          // フォルダ名
  title: string;
  artist: string;
  year?: number;
  genre?: string;
  tracks: Track[];
  coverEntry?: Entry;   // folder.jpg など
  cover?: string;       // object URL
  color?: string;       // 背表紙の色（ジャケットの平均色）
  ratio?: number;       // ジャケットの縦横比（幅 / 高さ）。正方形でないものも切らずに見せる
  tagged: boolean;      // 全曲のタグを読んだか
  remote?: "spotify";   // ファイルを持たず、外のサービスで鳴らすアルバム（spotify.ts）。タグもジャケットも初めから入っている
  link?: string;        // そのサービスで開く URL（Spotify の表示の決まり: 曲の情報の近くに元へのリンクを置く）
}

const AUDIO = /\.(flac|mp3|m4a|aac|alac|wav|ogg|oga|opus|aif|aiff|webm)$/i;
const IMAGE = /^(cover|folder|front|album|jacket)\.(jpe?g|png|webp)$/i;
const ANY_IMAGE = /\.(jpe?g|png|webp)$/i;

// File System Access API（Chrome / Edge）
export async function* walkHandle(dir: FileSystemDirectoryHandle, prefix = ""): AsyncGenerator<Entry> {
  for await (const h of dir.values() as AsyncIterable<FileSystemHandle>) {
    const path = prefix ? `${prefix}/${h.name}` : h.name;
    if (h.kind === "directory") yield* walkHandle(h as FileSystemDirectoryHandle, path);
    else yield { path, getFile: () => (h as FileSystemFileHandle).getFile() };
  }
}

// ドラッグ&ドロップで落とされたフォルダ（File System Access API が使えないブラウザ）
export async function* walkDropped(dir: FileSystemDirectoryEntry, prefix = ""): AsyncGenerator<Entry> {
  const reader = dir.createReader();
  for (;;) {
    // readEntries は一度に全部を返さないことがあるので、空になるまで読む
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    for (const e of batch) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory) yield* walkDropped(e as FileSystemDirectoryEntry, path);
      else yield { path, getFile: () => new Promise<File>((resolve, reject) => (e as FileSystemFileEntry).file(resolve, reject)) };
    }
  }
}

// <input webkitdirectory>（Safari / Firefox）。先頭の要素は選んだフォルダ名なので取り除く
export function* walkFiles(files: FileList): Generator<Entry> {
  for (const f of Array.from(files)) {
    const path = f.webkitRelativePath.split("/").slice(1).join("/") || f.name;
    yield { path, getFile: async () => f };
  }
}

const parent = (p: string) => p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
const base = (p: string) => p.slice(p.lastIndexOf("/") + 1);

export async function scan(entries: AsyncIterable<Entry> | Iterable<Entry>, onProgress?: (n: number) => void): Promise<Album[]> {
  const byDir = new Map<string, { audio: Entry[]; images: Entry[] }>();
  let n = 0;
  for await (const e of entries as AsyncIterable<Entry>) {
    const name = base(e.path);
    if (name.startsWith(".")) continue;
    const isAudio = AUDIO.test(name), isImage = ANY_IMAGE.test(name);
    if (!isAudio && !isImage) continue;
    const d = parent(e.path);
    if (!byDir.has(d)) byDir.set(d, { audio: [], images: [] });
    (isAudio ? byDir.get(d)!.audio : byDir.get(d)!.images).push(e);
    if (isAudio && ++n % 50 === 0) onProgress?.(n);
  }

  const albums: Album[] = [];
  for (const [dir, { audio, images }] of byDir) {
    if (!audio.length) continue;
    audio.sort((a, b) => collator.compare(a.path, b.path));
    const shelf = dir.includes("/") ? dir.slice(0, dir.indexOf("/")) : (dir || "未分類");
    albums.push({
      key: dir || ".",
      shelf,
      dir: base(dir) || "未分類",
      title: base(dir) || "未分類",
      artist: "",
      tracks: audio.map((entry, i) => ({ entry, title: base(entry.path).replace(AUDIO, ""), no: i + 1, disc: 1 })),
      coverEntry: images.find(i => IMAGE.test(base(i.path))) ?? images[0],
      tagged: false,
    });
  }
  return albums.sort((a, b) => collator.compare(a.key, b.key));
}

async function meta(t: Track, file?: File): Promise<IAudioMetadata | undefined> {
  if (isDriveEntry(t.entry)) return driveMeta(t.entry);
  try { return await parseBlob(file ?? await t.entry.getFile(), { skipCovers: false, duration: false }); }
  catch { return undefined; }
}

// Drive の曲は全体を取らずに、先頭だけでタグとジャケットを読む（足りなければ少しずつ広げる）。
// 読んだ結果は端末に残し、次からは通信しない
async function driveMeta(e: DriveEntry): Promise<IAudioMetadata | undefined> {
  const key = `meta:${e.id}:${e.modified}`;
  const hit = await kvGet<IAudioMetadata>(key);
  if (hit) return hit;
  const opts = { skipCovers: false, duration: false };
  for (const n of [384 * 1024, 3 * 1024 * 1024, Infinity]) {
    try {
      const m = n >= e.size
        ? await parseBlob(await e.getFile(), opts)
        : await parseBuffer(new Uint8Array(await e.head(n)), { mimeType: e.mime, size: e.size }, opts);
      // MP4 などはタグが末尾にあることがある。見つからなければ広げる
      if (!m.common.title && !m.common.album && n < e.size) continue;
      const slim = { common: { ...m.common, picture: m.common.picture?.slice(0, 1) }, format: m.format, native: {}, quality: { warnings: [] } } as unknown as IAudioMetadata;
      await kvSet(key, slim);
      return slim;
    } catch (err) {
      if ((err as Error).name === "DriveAuthError") return undefined;
      if (n >= e.size) return undefined;
    }
  }
  return undefined;
}

function picture(m?: IAudioMetadata): Blob | undefined {
  const pic = m?.common.picture?.[0];
  return pic ? new Blob([pic.data as BlobPart], { type: pic.format }) : undefined;
}

// 棚に並べるのに必要な最小限: 1曲目のタグ（アルバム名・アーティスト・埋め込みジャケット）
// 前に読んだときから 1 曲目とジャケットの画像が変わっていなければ、覚えておいた結果を使う
// （Drive の曲はファイル全体を取らずに先頭だけを読み、その結果は drive 側で覚えるので、ここでは覚えない）
export async function enrichHead(a: Album): Promise<void> {
  if (a.remote) return;
  const local = !isDriveEntry(a.tracks[0].entry);
  const first = local ? await a.tracks[0].entry.getFile() : undefined;
  const coverFile = await a.coverEntry?.getFile().catch(() => undefined);
  const sig = first ? [fileSig(a.tracks[0].entry.path, first), a.coverEntry && coverFile ? fileSig(a.coverEntry.path, coverFile) : ""].join("\n") : "";
  const hit = sig ? getHead(a.key, sig) : undefined;
  if (hit) {
    Object.assign(a, { title: hit.title, artist: hit.artist, year: hit.year, genre: hit.genre, color: hit.color, ratio: hit.ratio });
    const img = coverFile ?? hit.pic;
    if (img) a.cover = URL.createObjectURL(img);
    // 前の版で覚えたものには、フォルダの画像の写しがない。今のうちに足しておく
    if (coverFile && !hit.thumb && a.cover) { const thumb = await thumbOf(a.cover); if (thumb) putHead(a.key, { ...hit, thumb }); }
    return;
  }
  const m = await meta(a.tracks[0], first);
  if (m) {
    a.title = m.common.album || a.title;
    a.artist = m.common.albumartist || m.common.artist || "";
    a.year = m.common.year;
    a.genre = m.common.genre?.[0];
  }
  const pic = coverFile ? undefined : picture(m);
  const img = coverFile ?? pic;
  if (img) {
    a.cover = URL.createObjectURL(img);
    Object.assign(a, await coverInfo(a.cover));
  }
  const thumb = coverFile && a.cover ? await thumbOf(a.cover) : undefined;
  if (sig) putHead(a.key, { sig, title: a.title, artist: a.artist, year: a.year, genre: a.genre, color: a.color, ratio: a.ratio, pic, thumb });
}

// ジャケットの小さな写し（長い辺 320px の JPEG）。覚えている棚に出すだけなので、これで足りる
async function thumbOf(url: string): Promise<Blob | undefined> {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, 320 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob | undefined>(r => c.toBlob(b => r(b ?? undefined), "image/jpeg", 0.85));
  } catch { return undefined; }
}

/** 前に読んだときに覚えたタグだけで、アルバムを組み立てる（フォルダを読む許可を待つ間の棚）。
 *  ファイルはまだ読めないので、曲は鳴らせない。再生するときに許可をもらって、本物に入れ替える */
export function cachedAlbums(): Album[] {
  const locked = () => Promise.reject(new DOMException("フォルダを読む許可がまだありません", "NotAllowedError"));
  const pathOf = (sig?: string) => sig ? sig.split("|").slice(0, -2).join("|") : ""; // 目印は「パス|大きさ|更新日時」
  return cachedHeads().map(({ key, head, tracks }) => {
    const dir = key === "." ? "" : key;
    const first = pathOf(head.sig.split("\n")[0]), coverPath = pathOf(head.sig.split("\n")[1]);
    const img = head.pic ?? head.thumb;
    const list: Track[] = tracks
      ? tracks.list.map(c => ({ entry: { path: c.path, getFile: locked }, title: c.title, no: c.no, disc: c.disc, duration: c.duration, format: c.format, rgTrack: c.rgTrack, rgAlbum: c.rgAlbum }))
        .sort((x, y) => x.disc - y.disc || x.no - y.no)
      : [{ entry: { path: first, getFile: locked }, title: base(first).replace(AUDIO, ""), no: 1, disc: 1 }];
    return {
      key, dir: base(dir) || "未分類",
      shelf: dir.includes("/") ? dir.slice(0, dir.indexOf("/")) : (dir || "未分類"),
      title: head.title, artist: head.artist, year: tracks?.year ?? head.year, genre: tracks?.genre ?? head.genre,
      color: head.color, ratio: head.ratio,
      cover: img ? URL.createObjectURL(img) : undefined,
      coverEntry: coverPath ? { path: coverPath, getFile: locked } : undefined,
      tracks: list,
      tagged: true,   // 曲目は読み直さない（読めないので）。本物に入れ替えたときに読む
    } satisfies Album;
  }).sort((a, b) => collator.compare(a.key, b.key));
}

// 再生時に全曲のタグを読み、曲名と曲順を確定する。どの曲も変わっていなければ、覚えておいた結果を使う
const enriching = new Map<Album, Promise<void>>();
export function enrichTracks(a: Album): Promise<void> {
  if (a.tagged) return Promise.resolve();
  let p = enriching.get(a);
  if (!p) { p = readTracks(a).finally(() => enriching.delete(a)); enriching.set(a, p); }
  return p;
}
async function readTracks(a: Album): Promise<void> {
  const local = !a.tracks.some(t => isDriveEntry(t.entry));
  const files = local ? await Promise.all(a.tracks.map(t => t.entry.getFile().catch(() => undefined))) : [];
  const sig = local && files.every(Boolean) ? a.tracks.map((t, i) => fileSig(t.entry.path, files[i]!)).join("\n") : "";
  const hit = sig ? getTracks(a.key, sig) : undefined;
  if (hit) {
    const byPath = new Map(hit.list.map(c => [c.path, c]));
    for (const t of a.tracks) {
      const c = byPath.get(t.entry.path);
      if (c) Object.assign(t, { title: c.title, no: c.no, disc: c.disc, duration: c.duration, format: c.format, rgTrack: c.rgTrack, rgAlbum: c.rgAlbum });
    }
    if (hit.year !== undefined) a.year = hit.year;
    if (hit.genre !== undefined) a.genre = hit.genre;
    a.tracks.sort((x, y) => x.disc - y.disc || x.no - y.no);
    a.tagged = true;
    return;
  }
  await Promise.all(a.tracks.map(async (t, i) => {
    const m = await meta(t, files[i]);
    if (!m) return;
    t.title = m.common.title || t.title;
    t.no = m.common.track.no ?? t.no;
    t.disc = m.common.disk.no ?? 1;
    t.duration = m.format.duration;
    t.format = formatLabel(m);
    t.rgTrack = m.common.replaygain_track_gain?.dB;
    t.rgAlbum = m.common.replaygain_album_gain?.dB;
    if (t === a.tracks[0]) { a.year = m.common.year; a.genre = m.common.genre?.[0]; }
  }));
  a.tracks.sort((x, y) => x.disc - y.disc || x.no - y.no);
  a.tagged = true;
  if (sig) putTracks(a.key, {
    sig, year: a.year, genre: a.genre,
    list: a.tracks.map(t => ({ path: t.entry.path, title: t.title, no: t.no, disc: t.disc, duration: t.duration, format: t.format, rgTrack: t.rgTrack, rgAlbum: t.rgAlbum })),
  });
}

export async function coverInfo(url: string): Promise<{ color?: string; ratio?: number }> {
  try {
    const img = new Image();
    if (url.startsWith("https:")) img.crossOrigin = "anonymous"; // Spotify のジャケット（平均色を取るため）
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 8;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data;
    let r = 0, gr = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
    const k = d.length / 4;
    const ratio = img.naturalWidth && img.naturalHeight ? Math.max(0.5, Math.min(2, img.naturalWidth / img.naturalHeight)) : 1;
    return { color: `rgb(${Math.round(r / k)} ${Math.round(gr / k)} ${Math.round(b / k)})`, ratio };
  } catch { return {}; }
}

// 並列数を絞って順に処理する
export async function eachLimited<T>(items: T[], limit: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

function formatLabel(m: IAudioMetadata): string {
  const f = m.format, parts = [f.codec ?? f.container ?? ""];
  const spec = [f.bitsPerSample ? `${f.bitsPerSample}bit` : "", f.sampleRate ? `${+(f.sampleRate / 1000).toFixed(1)}kHz` : ""].filter(Boolean).join(" / ");
  if (spec) parts.push(spec);
  else if (f.bitrate) parts.push(`${Math.round(f.bitrate / 1000)}kbps`);
  return parts.filter(Boolean).join(" · ");
}

