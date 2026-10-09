import { createRequire } from 'node:module';
import { fillRemainingOperating } from '/home/claude/untunglab/scripts/e2e-ops.mjs';
import { activatePro } from '/home/claude/untunglab/scripts/e2e-license.mjs';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const S = '/tmp/manual/shots';
const url = 'http://localhost:4181/';
const ctx = await chromium.launchPersistentContext('/tmp/manual/profile', { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ms-MY' });
const browser = ctx;
const page = ctx.pages()[0] ?? (await ctx.newPage());
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
const box = (n) => page.getByRole('textbox', { name: n, exact: true });
const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();
// numbered markers drawn onto the live page, so the PDF shows exactly what to look at
const snap = async (name, marks = []) => {
  await page.waitForTimeout(250);
  const placed = [];
  for (let i = 0; i < marks.length; i++) {
    const [loc, dx = -12, dy = -10] = marks[i];
    const b = await loc.first().boundingBox().catch(() => null);
    if (b) placed.push([i + 1, b.x + dx, b.y + dy]); else console.log('MISSING mark', name, i + 1);
  }
  await page.evaluate((pl) => {
    document.querySelectorAll('.__mk').forEach((e) => e.remove());
    for (const [n, x, y] of pl) {
      const d = document.createElement('div'); d.className = '__mk'; d.textContent = String(n);
      d.style.cssText = `position:fixed;left:${x - 4}px;top:${y - 4}px;width:24px;height:24px;border-radius:50%;background:#FF5A36;color:#fff;font:800 14px system-ui;display:flex;align-items:center;justify-content:center;z-index:99999;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff`;
      (document.querySelector('dialog[open]') || document.body).appendChild(d);
    }
  }, placed);
  await page.screenshot({ path: `${S}/${name}.png` });
  await page.evaluate(() => document.querySelectorAll('.__mk').forEach((e) => e.remove()));
  console.log('snap', name);
};
const top = () => page.evaluate(() => window.scrollTo(0, 0));
const scrollToText = async (text, y = 140) => {
  await page.evaluate(([t, y]) => { const els = [...document.querySelectorAll('h1,h2,h3,summary,span,div,p,button,label')].filter(e => e.textContent.trim() === t || (e.children.length === 0 && e.textContent.trim().startsWith(t))); const e = els[0]; if (e) { const r = e.getBoundingClientRect(); window.scrollBy(0, r.top - y); } }, [text, y]);
  await page.waitForTimeout(150);
};
export { page, ctx, browser, box, saveSheet, snap, top, scrollToText, url, fillRemainingOperating, activatePro };
