import { describe, expect, it } from 'vitest';
import { ImmutableRecordError } from '../db';
import { BACKUP_FORMAT, BackupError, createBackup, backupToText, readBackup, restoreBackup } from '../backup';
import { addCustomEquipment, createPackaging, seedEquipmentPresets } from '../masterData';
import { loadCostingData, saveMenu } from '../menus';
import { createIngredient, ensureBusiness, listAllHistory, saveOperatingCost, updateIngredient } from '../repo';
import { saveCostProfile, setTariff } from '../settings';
import { freshContext } from './helpers';
import { computeAllMenus } from '../../app/menuAssembly';

async function world() {
  const t = freshContext('2026-09-01T08:00:00');
  const biz = await ensureBusiness(t.ctx);
  await seedEquipmentPresets(t.ctx);
  await saveCostProfile(t.ctx, { valueOfTimePerHour: 25, expectedMonthlySales: 3000 });
  await setTariff(t.ctx, 0.5, '2026-01-01');
  await saveOperatingCost(t.ctx, { businessId: biz.id, category: 'gas', mode: 'simple', simpleAmount: 600, active: true, classification: 'shared' });
  const ayam = await createIngredient(t.ctx, { name: 'Ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' });
  await updateIngredient(t.ctx, ayam.id, { purchasePrice: 18 }, { purchaseDate: '2026-09-10' });
  const kotak = await createPackaging(t.ctx, { name: 'Kotak', purchasePrice: 0.7, purchaseQuantity: 1, purchaseUnit: 'pcs' });
  const oven = await addCustomEquipment(t.ctx, { name: 'Oven', powerWatts: 2000 });
  const nasi = await saveMenu(t.ctx, {
    name: 'Nasi Lemak', yield: 10, productionMinutesPerBatch: 60, sellingPrice: 12,
    ingredients: [{ ingredientId: ayam.id, quantity: 1200, usageUnit: 'g' }],
    packaging: [{ packagingId: kotak.id, quantityUsed: 1, usageSemantics: 'per_portion' }],
    equipment: [{ equipmentId: oven.id, durationMinutes: 45 }],
  });
  return { ...t, ayam, nasi };
}

/** Rebuild a valid checksum after a test edits the data, so only the intended defect is present. */
async function rechecksum(text: string, edit: (data: any) => void): Promise<string> {
  const file = JSON.parse(text);
  edit(file.data);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(file.data)));
  file.checksum = 'sha256:' + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return JSON.stringify(file);
}

const codes = (r: Awaited<ReturnType<typeof readBackup>>) => (r.ok ? [] : r.issues.map((i) => i.code));

describe('export', () => {
  it('wraps every table in a versioned envelope with a checksum', async () => {
    const w = await world();
    const b = await createBackup(w.ctx);
    expect(b).toMatchObject({ app: 'untunglab', format: BACKUP_FORMAT, exportedAt: expect.any(String) });
    expect(b.checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(b.data.ingredients).toHaveLength(1);
    expect(b.data.priceHistory).toHaveLength(2);
    expect(b.data.menus).toHaveLength(1);
    expect(b.data.recipeEquipmentUsage).toHaveLength(1);
    expect(Object.keys(b.data)).not.toContain('equipmentPresets');
  });

  it('a fresh export reads back as valid with a summary for the preview', async () => {
    const w = await world();
    const r = await readBackup(backupToText(await createBackup(w.ctx)));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.summary).toMatchObject({ ingredients: 1, packaging: 1, equipment: 1, menus: 1, historyRecords: 2 });
  });
});

describe('round trip', () => {
  it('restoring into an empty device gives identical data and identical costs', async () => {
    const w = await world();
    const before = computeAllMenus(await loadCostingData(w.ctx)).get(w.nasi.menuId)!.result;
    const text = backupToText(await createBackup(w.ctx));

    const target = freshContext('2026-10-05T08:00:00');
    await restoreBackup(target.ctx, text);
    const after = computeAllMenus(await loadCostingData(target.ctx)).get(w.nasi.menuId)!.result;
    expect(after).toEqual(before);
    expect(await listAllHistory(target.ctx)).toEqual(await listAllHistory(w.ctx));
    expect(await target.db.operatingCosts.toArray()).toEqual(await w.db.operatingCosts.toArray());
    expect(await target.db.tariffs.toArray()).toEqual(await w.db.tariffs.toArray());
  });

  it('restore replaces what was on the device, it does not merge', async () => {
    const w = await world();
    const text = backupToText(await createBackup(w.ctx));
    const target = freshContext();
    await createIngredient(target.ctx, { name: 'Lama', purchasePrice: 1, packageQuantity: 1, packageUnit: 'kg' });
    await restoreBackup(target.ctx, text);
    expect((await target.db.ingredients.toArray()).map((i) => i.name)).toEqual(['Ayam']);
    expect(await target.db.businesses.count()).toBe(1);
  });

  it('price history stays immutable after a restore', async () => {
    const w = await world();
    const target = freshContext();
    await restoreBackup(target.ctx, backupToText(await createBackup(w.ctx)));
    const rec = (await target.db.priceHistory.toArray())[0]!;
    await expect(target.db.priceHistory.update(rec.id, { purchasePrice: 1 })).rejects.toBeInstanceOf(ImmutableRecordError);
  });

  it('restoring twice gives the same result', async () => {
    const w = await world();
    const text = backupToText(await createBackup(w.ctx));
    const target = freshContext();
    await restoreBackup(target.ctx, text);
    await restoreBackup(target.ctx, text);
    expect(await target.db.priceHistory.count()).toBe(2);
    expect(await target.db.menus.count()).toBe(1);
  });
});

describe('a bad file is refused, with the reason named, before anything is touched', () => {
  it('not JSON, truncated, or someone else\'s JSON', async () => {
    expect(codes(await readBackup('hello'))).toEqual(['not_json']);
    const w = await world();
    const text = backupToText(await createBackup(w.ctx));
    expect(codes(await readBackup(text.slice(0, text.length - 40)))).toEqual(['not_json']);
    expect(codes(await readBackup('{"a":1}'))).toEqual(['not_untunglab']);
    expect(codes(await readBackup('[]'))).toEqual(['not_untunglab']);
  });

  it('a file from a newer app version', async () => {
    const w = await world();
    const file = JSON.parse(backupToText(await createBackup(w.ctx)));
    file.format = BACKUP_FORMAT + 1;
    expect(codes(await readBackup(JSON.stringify(file)))).toEqual(['newer_format']);
  });

  it('data changed after export fails the checksum', async () => {
    const w = await world();
    const file = JSON.parse(backupToText(await createBackup(w.ctx)));
    file.data.ingredients[0].purchasePrice = 1;
    expect(codes(await readBackup(JSON.stringify(file)))).toEqual(['checksum_mismatch']);
  });

  it('a missing table, a bad row, a broken reference and a duplicate key', async () => {
    const w = await world();
    const text = backupToText(await createBackup(w.ctx));
    expect(codes(await readBackup(await rechecksum(text, (d) => { delete d.menus; })))).toContain('missing_table');
    expect(codes(await readBackup(await rechecksum(text, (d) => { d.ingredients[0].purchasePrice = -1; })))).toContain('bad_row');
    expect(codes(await readBackup(await rechecksum(text, (d) => { d.ingredients[0].purchasePrice = 'abc'; })))).toContain('bad_row');
    expect(codes(await readBackup(await rechecksum(text, (d) => { d.recipes.length = 0; })))).toContain('broken_reference');
    expect(codes(await readBackup(await rechecksum(text, (d) => { d.recipeIngredients[0].ingredientId = 'ghost'; })))).toContain('broken_reference');
    expect(codes(await readBackup(await rechecksum(text, (d) => { d.priceHistory[1].seq = d.priceHistory[0].seq; })))).toContain('duplicate_key');
    expect(codes(await readBackup(await rechecksum(text, (d) => { d.ingredients.push({ ...d.ingredients[0] }); })))).toContain('duplicate_id');
  });

  it('restoreBackup throws BackupError and leaves the device untouched', async () => {
    const w = await world();
    const before = await w.db.ingredients.toArray();
    await expect(restoreBackup(w.ctx, 'nonsense')).rejects.toBeInstanceOf(BackupError);
    expect(await w.db.ingredients.toArray()).toEqual(before);
  });
});

describe('atomic restore', () => {
  it('a failure part-way through rolls everything back', async () => {
    const source = await world();
    const text = backupToText(await createBackup(source.ctx));
    const target = await world(); // different device with its own data
    const beforeIng = await target.db.ingredients.toArray();
    const beforeHist = await target.db.priceHistory.toArray();
    const original = target.db.menus.bulkAdd.bind(target.db.menus);
    target.db.menus.bulkAdd = (() => Promise.reject(new Error('disk full'))) as unknown as typeof target.db.menus.bulkAdd;
    await expect(restoreBackup(target.ctx, text)).rejects.toThrow();
    target.db.menus.bulkAdd = original;
    expect(await target.db.ingredients.toArray()).toEqual(beforeIng);
    expect(await target.db.priceHistory.toArray()).toEqual(beforeHist);
  });
});
