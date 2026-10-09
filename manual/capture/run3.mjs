import { page, browser, box, saveSheet, snap, top, scrollToText, url } from './cap1.mjs';
await page.goto(url + '#/kesan-harga'); await page.waitForTimeout(500);
await page.locator('select').first().selectOption({ label: 'Butter' });
await page.waitForTimeout(300);
await snap('33-kesan-pilih', [[page.locator('select').first()], [page.getByRole('button', { name: '+10%', exact: true })]]);
await page.getByRole('button', { name: '+20%', exact: true }).click();
await page.waitForTimeout(500);
await scrollToText('Kesan pada kos', 110);
await snap('34-kesan-hasil', [[page.getByText('Kesan pada kos')], [page.getByText('Sebelum').first()], [page.getByRole('button', { name: 'Guna harga ini' })]]);
await page.getByRole('button', { name: 'Guna harga ini' }).click();
await page.waitForTimeout(400);
await snap('35-kesan-sahkan');
await page.getByRole('button', { name: 'Ya, guna harga ini' }).click();
await page.waitForTimeout(600);
await snap('36-kesan-berjaya');
// Jejak harga
await page.goto(url + '#/jejak-harga'); await page.waitForTimeout(600);
await snap('37-jejak-senarai');
await page.getByText('Butter').first().click();
await page.waitForTimeout(600);
await snap('38-jejak-butiran');
await scrollToText('Trend kos seunit', 100);
await snap('39-jejak-trend');
// Laporan
await page.goto(url + '#/laporan'); await page.waitForTimeout(600);
await snap('40-laporan', [[page.getByRole('button', { name: /Eksport CSV/ })]]);
// Sandaran
await page.goto(url + '#/sandaran'); await page.waitForTimeout(600);
await snap('41-sandaran', [[page.getByRole('button', { name: 'Simpan sandaran' })]]);
await scrollToText('Pulihkan daripada sandaran', 110);
await snap('42-sandaran-pulih', [[page.getByText('Pilih fail sandaran').first()]]);
// Dashboard after price change
await page.goto(url + '#/'); await page.waitForTimeout(700);
await snap('43-dashboard-amaran');
console.log('done');
await browser.close();
