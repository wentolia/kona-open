const { chromium } = require('playwright'); const P = require('./pages.json');
(async () => { const b = await chromium.launch();
  for (const p of P) { for (const s of [1,2]) {
    const pg = await b.newPage({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: s });
    await pg.goto(`http://localhost:8765/${p.name}.html`); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(400);
    await pg.screenshot({ path: `out/kona-${p.name}-${p.w}x${p.h}${s===2?'@2x':''}.png` }); await pg.close(); } }
  await b.close(); })();
