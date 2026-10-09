import { page, browser, box, saveSheet, snap, top, scrollToText, url } from './cap1.mjs';
await page.goto(url + '#/menu/baru'); await page.waitForTimeout(500);
await box('Nama menu').fill('Standard Brownies');
await box('Hasil setiap batch (bilangan jualan)').fill('20');
await box('Masa penyediaan setiap batch (minit)').fill('120');
await box('Harga Jual seunit (RM)').fill('6');
await snap('20-menu-asas', [[box('Nama menu')], [box('Hasil setiap batch (bilangan jualan)')], [box('Masa penyediaan setiap batch (minit)')], [box('Harga Jual seunit (RM)')]]);
const usage = [['Butter', '150'], ['Cooking chocolate', '200'], ['Telur', '4'], ['Tepung', '120'], ['Gula', '180']];
for (let i = 0; i < 5; i++) {
  await page.getByRole('button', { name: '+ Tambah bahan' }).click();
  await page.locator(`#ing-${i}`).selectOption({ label: usage[i][0] });
  await page.getByRole('textbox', { name: 'Kuantiti guna' }).nth(i).fill(usage[i][1]);
}
await scrollToText('Bahan', 120);
await snap('21-menu-bahan', [[page.locator('#ing-0')], [page.getByRole('textbox', { name: 'Kuantiti guna' }).first()], [page.getByRole('button', { name: '+ Tambah bahan' })]]);
for (let i = 0; i < 4; i++) {
  await page.getByRole('button', { name: '+ Tambah pembungkusan' }).click();
  await page.locator(`#pack-${i}`).selectOption({ index: i + 1 });
}
await scrollToText('Pembungkusan', 120);
await snap('22-menu-pembungkusan', [[page.locator('#pack-0')], [page.getByRole('button', { name: '+ Tambah pembungkusan' })]]);
await page.getByRole('button', { name: '+ Tambah peralatan' }).click();
await page.locator('#eq-0').selectOption({ index: 1 });
await box('Masa guna (minit)').fill('45');
await scrollToText('Peralatan', 120);
await snap('23-menu-peralatan', [[page.locator('#eq-0')], [box('Masa guna (minit)')]]);
await page.getByRole('button', { name: 'Simpan menu' }).click();
await page.getByRole('link', { name: /Standard Brownies/ }).waitFor();
await page.waitForTimeout(400);
await snap('24-menu-senarai', [[page.getByRole('link', { name: /Standard Brownies/ })], [page.getByRole('link', { name: /Tambah menu/ }).or(page.getByRole('button', { name: /Tambah menu/ }))]]);
await page.getByRole('link', { name: /Standard Brownies/ }).click();
await page.waitForTimeout(600);
await snap('25-menu-ringkasan');
await scrollToText('Hasil pengiraan', 100);
await snap('26-menu-hasil', [[page.getByText('Kos Sebenar').first()], [page.getByText('Anggaran Untung').first()]]);
await scrollToText('Pecahan kos seunit', 100);
await snap('27-menu-pecahan');
await scrollToText('Cadangan Harga', 100);
await page.getByRole('button', { name: '30%', exact: true }).click().catch(() => {});
await snap('28-cadangan', [[page.getByRole('button', { name: '30%', exact: true })], [page.getByText('Guna harga ini').first()]]);
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 800));
await page.goto(url + '#/'); await page.waitForTimeout(800);
await snap('30-dashboard', [[page.getByText('Purata margin semua menu')]]);
await page.evaluate(() => window.scrollTo(0, 420)); await page.waitForTimeout(200);
await snap('31-dashboard-bawah');
await page.goto(url + '#/kesan-harga'); await page.waitForTimeout(600);
console.log('KESAN:', (await page.evaluate(() => document.body.innerText)).slice(0, 700));
await snap('32-kesan-0');
await browser.close();
