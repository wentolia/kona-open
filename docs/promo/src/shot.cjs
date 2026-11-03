const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
// usage: node shot.cjs W H out.png scene.json
(async () => {
  const [w, h, out, sceneFile] = [+process.argv[2], +process.argv[3], process.argv[4], process.argv[5]];
  const scene = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: 'ja-JP' });
  await ctx.addInitScript(() => { delete window.showDirectoryPicker; });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message));
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);
  await page.evaluate(async (scene) => {
    const { breedCoat } = await import('/src/cat.ts');
    localStorage.clear();
    for (const [k, v] of Object.entries(scene.ls || {})) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    if (scene.cats) localStorage.setItem('kona.cats', JSON.stringify(scene.cats.map(b => breedCoat(b))));
  }, scene);
  await page.reload(); await page.waitForTimeout(1000);
  await page.setInputFiles('#picker', path.resolve('lib'));
  await page.waitForTimeout(4000);
  if (scene.play) {
    await page.evaluate(t => { const el = [...document.querySelectorAll('[title], .spine, .book')].find(e => (e.textContent||'').trim() === t || e.getAttribute('title')?.startsWith(t)); el?.click(); }, scene.play);
    await page.waitForTimeout(800);
    await page.click('.opened-cover'); await page.waitForTimeout(800); await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  }
  await page.mouse.move(w-5, h-5);
  if (scene.eval) await page.evaluate(scene.eval);
  await page.waitForTimeout(scene.wait ?? 8000);
  await page.screenshot({ path: out });
  if (scene.dump) fs.writeFileSync(scene.dump, await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage)), null, 1)));
  await browser.close();
})();
