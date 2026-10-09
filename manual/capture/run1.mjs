import { page, browser, box, saveSheet, snap, top, scrollToText, url, fillRemainingOperating, activatePro } from './cap1.mjs';
// 1. fresh app: Mula di sini
await page.goto(url); await page.waitForTimeout(800);
await snap('01-mula', [[page.getByText('Mula di sini')], [page.getByText('Tetapkan Nilai Masa anda')]]);
// Lagi menu (mobile)
await page.getByRole('link', { name: 'Lagi' }).or(page.getByRole('button', { name: 'Lagi' })).first().click();
await page.waitForTimeout(400);
await snap('02-lagi');
await page.keyboard.press('Escape');
// 3. Lesen free
await page.goto(url + '#/lesen'); await page.waitForTimeout(500);
await snap('03-lesen-percuma', [[box('Kod lesen')], [page.getByRole('button', { name: 'Aktifkan' })]]);
await activatePro(page, url);
await page.goto(url + '#/lesen'); await page.waitForTimeout(500);
await snap('04-lesen-pro');
// Kos operasi
await page.goto(url + '#/kos-operasi'); await page.waitForTimeout(600);
await snap('05-kos-operasi', [[page.getByText('Tetapan bisnes')], [page.getByRole('button', { name: /Ruang Kerja/ })]]);
await box('Nilai Masa (RM sejam)').fill('15');
await box('Anggaran Jualan Bulanan (RM)').fill('2400');
await page.getByRole('button', { name: 'Simpan' }).first().click();
await page.getByText('✓ Disimpan').waitFor();
await page.getByRole('button', { name: /Ruang Kerja/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
await box('Kos rumah atau sewa sebulan (RM)').fill('1500');
await page.getByRole('button', { name: '20%', exact: true }).click();
await page.getByText('RM300.00 sebulan').waitFor();
await snap('06-ruang-kerja', [[page.getByRole('tab', { name: 'Kira Lebih Tepat' })], [box('Kos rumah atau sewa sebulan (RM)')]]);
await saveSheet();
await page.getByRole('button', { name: /^Elektrik/ }).click();
await page.getByRole('tab', { name: 'Kira Lebih Tepat' }).click();
await box('Kadar elektrik (RM sekilowatt jam)').fill('0.50');
await page.getByRole('button', { name: 'Simpan kadar' }).click();
await box('Elektrik am sebulan (RM)').fill('40');
await snap('07-elektrik', [[box('Kadar elektrik (RM sekilowatt jam)')], [box('Elektrik am sebulan (RM)')]]);
await saveSheet();
await fillRemainingOperating(page, url);
await page.waitForTimeout(400);
await snap('08-kos-operasi-siap', [[page.getByText('Kadar Kos Operasi')]]);
// Bahan
await page.goto(url + '#/bahan');
await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
await box('Nama').fill('Butter'); await box('Harga beli (RM)').fill('12'); await box('Kuantiti dalam pek').fill('250');
await page.getByRole('combobox', { name: 'Unit pek' }).fill('g');
await snap('09-bahan-tambah', [[box('Nama')], [box('Harga beli (RM)')], [box('Kuantiti dalam pek')], [page.getByRole('combobox', { name: 'Unit pek' })]]);
await saveSheet(); await page.getByText('Butter', { exact: true }).first().waitFor();
for (const [n, price, qty, unit] of [['Cooking chocolate', '20', '500', 'g'], ['Telur', '15', '30', 'biji'], ['Tepung', '4', '1000', 'g'], ['Gula', '3', '1000', 'g']]) {
  await page.getByRole('button', { name: 'Tambah bahan' }).first().click();
  await box('Nama').fill(n); await box('Harga beli (RM)').fill(price); await box('Kuantiti dalam pek').fill(qty);
  await page.getByRole('combobox', { name: 'Unit pek' }).fill(unit);
  await saveSheet(); await page.getByText(n, { exact: true }).first().waitFor();
}
await top(); await page.waitForTimeout(300);
await snap('10-bahan-senarai', [[page.getByRole('button', { name: 'Tambah bahan' })], [page.getByText('Butter', { exact: true })]]);
// Pembungkusan
await page.goto(url + '#/pembungkusan');
for (const [n, p] of [['Kotak', '1.00'], ['Kertas baking', '0.15'], ['Sticker', '0.10'], ['Beg plastik', '0.20']]) {
  await page.getByRole('button', { name: 'Tambah pembungkusan' }).first().click();
  await box('Nama').fill(n); await box('Harga beli (RM)').fill(p); await box('Bilangan dalam satu beli').fill('1');
  if (n === 'Kotak') await snap('11-pembungkusan-tambah', [[box('Harga beli (RM)')], [box('Bilangan dalam satu beli')]]);
  await saveSheet(); await page.getByText(n, { exact: true }).first().waitFor();
}
await top(); await snap('12-pembungkusan-senarai', [[page.getByRole('button', { name: 'Tambah pembungkusan' })]]);
// Peralatan
await page.goto(url + '#/peralatan');
await page.getByRole('button', { name: 'Tambah peralatan' }).first().click();
await page.waitForTimeout(300);
await snap('13-peralatan-pilih', [[page.getByRole('button', { name: /Oven/ })]]);
await page.getByRole('button', { name: /Oven/ }).click();
await page.waitForTimeout(300);
await snap('14-peralatan-watt', [[box('Watt (W)')]]);
await saveSheet();
await top(); await page.waitForTimeout(300);
await snap('15-peralatan-senarai');
console.log(await page.evaluate(() => document.body.innerText.slice(0, 400)));
await browser.close();
