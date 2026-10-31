// Kona の Service Worker: アプリとして置けるようにし、一度開いた画面のファイルを手元に残してオフラインでも開けるようにする。
// 画面（HTML）はネットワークを先に見て、つながらないときだけ手元のものを使う。ほかのファイルは手元を先に見る。
const CACHE = "kona-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    // 古い版の画面のキャッシュだけを消す（Drive から端末に残した曲の "kona-drive" は消さない）
    for (const k of await caches.keys()) if (k.startsWith("kona-v") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 地図のタイルやフォントはブラウザに任せる
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => { put(req, res.clone()); return res; }).catch(() => caches.match(req).then(r => r ?? caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit ?? fetch(req).then(res => { put(req, res.clone()); return res; })));
});

function put(req, res) {
  if (!res.ok || res.type === "opaque") return;
  caches.open(CACHE).then(c => c.put(req, res)).catch(() => {});
}
