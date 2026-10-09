import { createRequire } from 'node:module';
import fs from 'node:fs';
import { activatePro } from '../../scripts/e2e-license.mjs';
import { patch, tr } from './lang.mjs';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
export const LANG = process.env.LANG_CODE === 'en' ? 'en' : 'ms';
const root = `/tmp/manual-${LANG}`;
export const S = `${root}/shots`;
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(S, { recursive: true });
export const url = process.env.APP_URL ?? 'http://localhost:4181/';
export const ctx = await chromium.launchPersistentContext(`${root}/profile`, { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: LANG === 'en' ? 'en-MY' : 'ms-MY', acceptDownloads: true });
await ctx.addInitScript((l) => localStorage.setItem('ul-app-lang', l), LANG);
export const page = ctx.pages()[0] ?? (await ctx.newPage());
patch(page, LANG);
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
export const box = (n) => page.getByRole('textbox', { name: n, exact: true });
export const saveSheet = () => page.getByRole('button', { name: 'Simpan' }).last().click();
export const top = () => page.evaluate(() => window.scrollTo(0, 0));
/** Numbered red markers are drawn onto the live page, so the PDF shows exactly what to look at. */
export const snap = async (name, marks = []) => {
  await page.waitForTimeout(250);
  const placed = [];
  for (let i = 0; i < marks.length; i++) {
    const [loc, dx = -12, dy = -10] = marks[i];
    const b = await loc.first().boundingBox().catch(() => null);
    if (b) placed.push([i + 1, b.x + dx, b.y + dy]);
    else console.log('MISSING mark', name, i + 1);
  }
  await page.evaluate((pl) => {
    document.querySelectorAll('.__mk').forEach((e) => e.remove());
    for (const [n, x, y] of pl) {
      const d = document.createElement('div');
      d.className = '__mk';
      d.textContent = String(n);
      d.style.cssText = `position:fixed;left:${x - 4}px;top:${y - 4}px;width:24px;height:24px;border-radius:50%;background:#FF5A36;color:#fff;font:800 14px system-ui;display:flex;align-items:center;justify-content:center;z-index:99999;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff`;
      (document.querySelector('dialog[open]') || document.body).appendChild(d);
    }
  }, placed);
  await page.screenshot({ path: `${S}/${name}.png` });
  await page.evaluate(() => document.querySelectorAll('.__mk').forEach((e) => e.remove()));
  console.log('snap', name);
};
export const scrollToText = async (text, y = 140) => {
  const tx = tr(text, LANG);
  await page.evaluate(([t, y]) => {
    const els = [...document.querySelectorAll('h1,h2,h3,summary,span,div,p,button,label')].filter((e) => e.textContent.trim() === t || (e.children.length === 0 && e.textContent.trim().startsWith(t)));
    const e = els[0];
    if (e) window.scrollBy(0, e.getBoundingClientRect().top - y);
  }, [tx, y]);
  await page.waitForTimeout(150);
};
export const dialogScroll = (to = 99999) => page.locator('dialog[open]').evaluate((e, y) => e.scrollTo(0, y), to).catch(() => {});
export { activatePro };
