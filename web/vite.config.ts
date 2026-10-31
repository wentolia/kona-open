import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { viteSingleFile } from "vite-plugin-singlefile";

// 公開するビルドの守り:
//  - 外部のスクリプトは読まない（script-src 'self'）。通信先は自分と Google の API だけ
//  - 書体は同梱し、Google Fonts の読み込みを外す
//  - 地図の背景タイル（CARTO）だけは画像として許す。地図モジュールを置いたときにだけ読まれる
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.basemaps.cartocdn.com",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://www.googleapis.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
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
      : { outDir: single ? "dist-single" : "dist" },
  };
});
