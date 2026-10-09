import { page, browser, box, saveSheet, snap, top, scrollToText, url } from './cap1.mjs';
const close = async () => { await page.getByRole('button', { name: 'Tutup' }).last().click().catch(() => {}); await page.waitForTimeout(300); };
// Kos operasi
await page.goto(url + '#/kos-operasi'); await page.waitForTimeout(600);
await top();
await snap('05a-kos-operasi-atas', [[page.getByText('Tetapan bisnes')], [box('Nilai Masa (RM sejam)')], [box('Anggaran Jualan Bulanan (RM)')]]);
await scrollToText('Ringkasan', 110);
await snap('05b-kos-operasi-senarai', [[page.getByText('Kos Operasi Bersama sebulan')], [page.getByText('Kadar Kos Operasi')], [page.getByRole('button', { name: /Ruang Kerja/ })]]);
await page.getByRole('button', { name: /Ruang Kerja/ }).click(); await page.waitForTimeout(500);
await snap('06-ruang-kerja', [[page.getByRole('tab', { name: 'Mudah' })], [page.getByRole('tab', { name: 'Kira Lebih Tepat' })], [box('Kos rumah atau sewa sebulan (RM)')], [page.getByRole('button', { name: '20%', exact: true })]]);
await close();
await page.getByRole('button', { name: /^Elektrik/ }).click(); await page.waitForTimeout(500);
await snap('07-elektrik', [[box('Elektrik am sebulan (RM)')], [box('Kadar elektrik (RM sekilowatt jam)')]]);
await close();
// bahan
await page.goto(url + '#/bahan'); await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Tambah bahan' }).first().click(); await page.waitForTimeout(400);
await box('Nama').fill('Susu segar'); await box('Harga beli (RM)').fill('6.50'); await box('Kuantiti dalam pek').fill('1');
await page.getByRole('combobox', { name: 'Unit pek' }).fill('l');
await snap('09-bahan-tambah', [[box('Nama')], [box('Harga beli (RM)')], [box('Kuantiti dalam pek')], [page.getByRole('combobox', { name: 'Unit pek' })], [page.getByText('Kos seunit').first()]]);
await page.getByRole('button', { name: /Pemetaan pek/ }).click().catch(() => {}); await page.waitForTimeout(300);
await snap('09b-bahan-pemetaan');
await page.getByRole('button', { name: 'Batal' }).last().click(); await page.waitForTimeout(300);
// pembungkusan
await page.goto(url + '#/pembungkusan'); await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Tambah pembungkusan' }).first().click(); await page.waitForTimeout(400);
await box('Nama').fill('Kotak kek'); await box('Harga beli (RM)').fill('30'); await box('Bilangan dalam satu beli').fill('50');
await snap('11-pembungkusan-tambah', [[box('Nama')], [box('Harga beli (RM)')], [box('Bilangan dalam satu beli')], [page.getByText('Kos seunit').first()]]);
await page.getByRole('button', { name: 'Batal' }).last().click(); await page.waitForTimeout(300);
// peralatan
await page.goto(url + '#/peralatan'); await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Tambah peralatan' }).first().click(); await page.waitForTimeout(400);
await snap('13-peralatan-pilih', [[page.getByRole('textbox', { name: 'Cari peralatan' })], [page.getByRole('button', { name: /Oven/ })], [page.getByRole('button', { name: /Peralatan sendiri/ })]]);
await page.getByRole('button', { name: /Air fryer/ }).click(); await page.waitForTimeout(300);
await snap('14-peralatan-watt', [[box('Nama peralatan')], [box('Watt (W)')]]);
await page.getByRole('button', { name: 'Batal' }).last().click(); await page.waitForTimeout(300);
// kesan confirm sheet
await page.goto(url + '#/kesan-harga'); await page.waitForTimeout(400);
await page.locator('select').first().selectOption({ label: 'Telur' });
await page.getByRole('button', { name: '+10%', exact: true }).click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Guna harga ini' }).click(); await page.waitForTimeout(400);
await snap('35-kesan-sahkan', [[page.getByRole('button', { name: 'Ya, guna harga ini' })]]);
await page.getByRole('button', { name: 'Batal' }).last().click(); await page.waitForTimeout(300);
console.log('ok');
await browser.close();
