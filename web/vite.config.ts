import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { viteSingleFile } from "vite-plugin-singlefile";

// 公開するビルドの守り:
//  - 外部のスクリプトは読まない（script-src 'self'）。通信先は自分と Google の API だけ
//    例外は Spotify: 使う人が設定で Client ID を入れたときだけ、Spotify の再生の部品（Web Playback SDK）を読み、
//    その再生の枠（sdk.scdn.co）と Spotify の API・ジャケットの画像（i.scdn.co）につなぐ
//    リスニングパーティーの仲介に、公開の Nostr リレー（party-relay.ts の RELAYS）にだけつなぐ
//  - 書体は同梱し、Google Fonts の読み込みを外す
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://sdk.scdn.co",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://i.scdn.co",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://www.googleapis.com https://api.spotify.com https://accounts.spotify.com https://i.scdn.co wss://relay.damus.io wss://nos.lol wss://relay.primal.net wss://nostr.mom",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src https://sdk.scdn.co",
].join("; ");

const harden = (): Plugin => ({
  name: "kona-harden",
  transformIndexHtml(html) {
    html = html.replace(/\s*<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, "");
    return html.replace(/(<meta charset="utf-8">)/, `$1\n  <meta http-equiv="Content-Security-Policy" content="${CSP}">\n  <meta name="referrer" content="no-referrer">`);
  },
});

// `--mode single` で1ファイルのHTMLに固める（プレビュー共有用。こちらは CDN の書体のまま）
export default defineConfig(({ mode, command }) => {
  const single = mode === "single" || mode === "mock"; // mock: スマホ版のモック（サンプルのアルバム入り）
  return {
    base: "./",
    plugins: single ? [viteSingleFile()] : command === "build" ? [harden()] : [],
    resolve: single ? { alias: [{ find: /^\.\/fonts$/, replacement: fileURLToPath(new URL("./src/fonts-cdn.ts", import.meta.url)) }] } : undefined,
    build: mode === "mock"
      ? { outDir: "dist-mock", rollupOptions: { input: "mock-mobile.html" } }
      : single ? { outDir: "dist-single" } : { outDir: "dist", rollupOptions: { input: { main: "index.html", items: "items.html" } } }, // items.html: 部屋に置くものの見本帳
  };
});
