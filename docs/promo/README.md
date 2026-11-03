# 広報用の画像

実際のアプリの画面です。架空の 20 枚のアルバム（`src/gen.py` で生成したジャケットと無音に近いテスト曲）で撮っています。

| ファイル | サイズ | 一言 |
|---|---|---|
| `kona-hero-1200x630.png` | 1200×630 | ジャケットで選ぶ、ちいさな音楽プレイヤー |
| `kona-hero-bleed-1200x630.png` | 1200×630 | 同上（画面を全面に） |
| `kona-covers-1080x1080.png` | 1080×1080 | 今夜の一枚を、背表紙から。 |
| `kona-cats-1080x1080.png` | 1080×1080 | 猫も、たくさんいます。 |
| `kona-rooms-1200x630.png` | 1200×630 | 部屋は、好きなように。 |
| `kona-rooms-square-1080x1080.png` | 1080×1080 | 部屋は、好きなように。 |

## 撮り直す

1. `python3 src/gen.py lib` でテスト用のライブラリを作る（ffmpeg と Pillow が要る）
2. `web/` で `npm run dev` を起動しておく
3. `node src/shot.cjs 1600 840 a.png src/a.json` のように場面ごとに撮る（`a` `v2` `v3` `v4` は 1600×840、`b` `c` は 1000×760）
4. `python3 src/compose.py` で構成ページを作り、そのフォルダを `python3 -m http.server 8765` で出して `node src/render.cjs`（書体は `fonts` に `web/node_modules/@fontsource` へのリンクを置く）
