import { describe, expect, it } from 'vitest';
import { createIngredient, createPackaging, ensureBusiness, loadCostingData, saveCostProfile, saveMenu, saveOperatingCost, setTariff } from '../../db';
import { freshContext } from '../../db/__tests__/helpers';
import { computeAllMenus } from '../menuAssembly';
import { buildReport, csvCell, menuReportCsv } from '../report';

async function world() {
  const t = freshContext('2026-09-01T08:00:00');
  const biz = await ensureBusiness(t.ctx);
  await saveCostProfile(t.ctx, { valueOfTimePerHour: 25, expectedMonthlySales: 3000 });
  await setTariff(t.ctx, 0.5, '2026-01-01');
  await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'gas', mode: 'simple', simpleAmount: 600, active: true, classification: 'shared' });
  const ayam = await createIngredient(t.ctx, { name: 'Ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' });
  const lain = await createIngredient(t.ctx, { name: 'Bahan lain', purchasePrice: 50.4, packageQuantity: 1, packageUnit: 'kg' });
  const kotak = await createPackaging(t.ctx, { name: 'Kotak', purchasePrice: 0.7, purchaseQuantity: 1, purchaseUnit: 'pcs' });
  const mk = (name: string, price: number, a: number, b: number) =>
    saveMenu(t.ctx, {
      name, yield: 10, productionMinutesPerBatch: 60, sellingPrice: price,
      ingredients: [{ ingredientId: ayam.id, quantity: a, usageUnit: 'g' }, { ingredientId: lain.id, quantity: b, usageUnit: 'g' }],
      packaging: [{ packagingId: kotak.id, quantityUsed: 1, usageSemantics: 'per_portion' }], equipment: [],
    });
  await mk('Nasi Lemak', 12, 1200, 1000);
  await mk('Sandwic Ayam', 15, 800, 500);
  return t;
}

describe('Laporan', () => {
  it('every figure is exactly the shared engine result (M04), with the full cost stack', async () => {
    const t = await world();
    const data = await loadCostingData(t.ctx);
    const report = buildReport(data);
    const costed = computeAllMenus(data);
    expect(report.menus).toHaveLength(2);
    for (const row of report.menus) {
      const r = costed.get(row.menuId)?.result;
      if (!r?.complete) throw new Error('expected complete');
      expect(row.fullCost).toBe(r.fullCost);
      expect(row.profit).toBe(r.profit);
      expect(row.marginPct).toBe(r.marginPct);
      expect(row.status).toBe(r.status);
      expect(row.ingredients).toBe(r.perPortion.ingredients);
      expect(row.sharedOperating).toBe(r.perPortion.sharedOperating);
      // the stack adds up to the full cost (Doc 03 canonical stack)
      expect(row.ingredients + row.packaging + row.labour + row.utilities + row.sharedOperating + row.other).toBeCloseTo(row.fullCost, 9);
    }
  });

  it('M01 through the report: Nasi Lemak is a loss of -0.44 and Sandwic is low', async () => {
    const t = await world();
    const report = buildReport(await loadCostingData(t.ctx));
    const nasi = report.menus.find((m) => m.name === 'Nasi Lemak')!;
    expect(nasi.fullCost).toBeCloseTo(12.44, 2);
    expect(nasi.profit).toBeCloseTo(-0.44, 2);
    expect(nasi.status).toBe('loss');
  });

  it('menus that cannot be costed are listed with what is missing, never with invented numbers', async () => {
    const t = await world();
    await saveMenu(t.ctx, { name: 'Tiada harga', yield: 5, productionMinutesPerBatch: 0, sellingPrice: 0, ingredients: [], packaging: [], equipment: [] });
    const report = buildReport(await loadCostingData(t.ctx));
    expect(report.menus.map((m) => m.name)).not.toContain('Tiada harga');
    expect(report.incomplete.map((m) => m.name)).toEqual(['Tiada harga']);
    const csv = menuReportCsv(report);
    const line = csv.split('\r\n').find((l) => l.includes('Tiada harga'))!;
    expect(line).toContain('Belum lengkap');
    expect(line).not.toMatch(/\b0\.00\b/);
  });

  it('summary counts menus by status and totals nothing that mixes menus with different volumes', async () => {
    const t = await world();
    const report = buildReport(await loadCostingData(t.ctx));
    expect(report.byStatus.loss).toBe(1);
    expect(report.byStatus.low + report.byStatus.watch + report.byStatus.healthy).toBe(1);
    expect(Object.keys(report)).not.toContain('totalProfit');
  });

  it('archived menus are left out', async () => {
    const t = await world();
    const data = await loadCostingData(t.ctx);
    data.menus[0]!.active = false;
    const report = buildReport(data);
    expect(report.menus.length + report.incomplete.length).toBe(1);
  });
});

describe('CSV export', () => {
  it('starts with a BOM, uses CRLF, BM headers, and plain minus so spreadsheets read numbers', async () => {
    const t = await world();
    const csv = menuReportCsv(buildReport(await loadCostingData(t.ctx)));
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Menu,Harga Jual (RM),Bahan (RM),Pembungkusan (RM),Masa (RM),Utiliti Pengeluaran (RM),Kos Operasi Bersama (RM),Kos Sebenar (RM),Anggaran Untung (RM),Margin (%),Status');
    const nasi = lines.find((l) => l.startsWith('Nasi Lemak'))!.split(',');
    expect(nasi[8]).toBe('-0.44');
    expect(nasi[7]).toBe('12.44');
    expect(nasi[9]).toBe('-3.7');
    expect(nasi[10]).toBe('Menu Ini Rugi');
    expect(nasi.join(',')).not.toContain('−');
  });

  it('quotes cells with commas, quotes and newlines', () => {
    expect(csvCell('Nasi, ayam')).toBe('"Nasi, ayam"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
    expect(csvCell('biasa')).toBe('biasa');
  });

  it('neutralises spreadsheet formulas in user-typed names', () => {
    for (const evil of ['=1+1', '+cmd', '-2', '@SUM(A1)', '\t=x']) expect(csvCell(evil).replace(/^"|"$/g, '').startsWith("'")).toBe(true);
    expect(csvCell('Kek -besar')).toBe('Kek -besar');
  });
});
