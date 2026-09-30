import { describe, expect, it } from 'vitest';
import { createIngredient } from '../repo';
import {
  EQUIPMENT_PRESET_DEFAULTS,
  addCustomEquipment,
  addEquipmentFromPreset,
  confirmEquipment,
  createPackaging,
  listEquipment,
  listIngredients,
  listPackaging,
  seedEquipmentPresets,
  setEquipmentActive,
  setIngredientActive,
  setPackagingActive,
  updateEquipment,
  updatePackaging,
} from '../masterData';
import { freshContext } from './helpers';

describe('equipment presets (Doc 02 §5)', () => {
  it('lists the six presets with the specified wattages', () => {
    expect(EQUIPMENT_PRESET_DEFAULTS.map((p) => [p.canonicalName, p.defaultWatts])).toEqual([
      ['Oven', 2000],
      ['Stand mixer', 500],
      ['Blender', 800],
      ['Induction cooker', 1800],
      ['Air fryer', 1500],
      ['Rice cooker', 700],
    ]);
  });

  it('seeding creates them once and is idempotent', async () => {
    const { ctx, db } = freshContext();
    expect(await seedEquipmentPresets(ctx)).toBe(6);
    expect(await seedEquipmentPresets(ctx)).toBe(0);
    expect(await db.equipmentPresets.count()).toBe(6);
  });

  it('seeding never overwrites a preset that already exists', async () => {
    const { ctx, db } = freshContext();
    await seedEquipmentPresets(ctx);
    await db.equipmentPresets.update('preset-oven', { defaultWatts: 2500 });
    await seedEquipmentPresets(ctx);
    expect((await db.equipmentPresets.get('preset-oven'))?.defaultWatts).toBe(2500);
  });
});

describe('Peralatan Saya (Doc 04 §5: estimate until confirmed)', () => {
  it('adding from a preset copies the default wattage and marks it unconfirmed', async () => {
    const { ctx } = freshContext();
    await seedEquipmentPresets(ctx);
    const eq = await addEquipmentFromPreset(ctx, 'preset-induction');
    expect(eq).toMatchObject({ name: 'Induction cooker', powerWatts: 1800, source: 'preset', confirmed: false, active: true, presetId: 'preset-induction' });
  });

  it('a custom appliance is the user\'s own value, so it is confirmed', async () => {
    const { ctx } = freshContext();
    const eq = await addCustomEquipment(ctx, { name: ' Pemanggang Roti ', powerWatts: 900 });
    expect(eq).toMatchObject({ name: 'Pemanggang Roti', powerWatts: 900, source: 'user', confirmed: true, presetId: null });
  });

  it('editing the wattage confirms the equipment; the preset itself is unchanged', async () => {
    const { ctx, db } = freshContext();
    await seedEquipmentPresets(ctx);
    const eq = await addEquipmentFromPreset(ctx, 'preset-oven');
    const updated = await updateEquipment(ctx, eq.id, { powerWatts: 2400 });
    expect(updated).toMatchObject({ powerWatts: 2400, confirmed: true });
    expect((await db.equipmentPresets.get('preset-oven'))?.defaultWatts).toBe(2000);
  });

  it('renaming alone does not confirm the estimate', async () => {
    const { ctx } = freshContext();
    await seedEquipmentPresets(ctx);
    const eq = await addEquipmentFromPreset(ctx, 'preset-oven');
    expect(await updateEquipment(ctx, eq.id, { name: 'Oven besar' })).toMatchObject({ name: 'Oven besar', confirmed: false, powerWatts: 2000 });
  });

  it('confirming keeps the preset wattage', async () => {
    const { ctx } = freshContext();
    await seedEquipmentPresets(ctx);
    const eq = await addEquipmentFromPreset(ctx, 'preset-blender');
    expect(await confirmEquipment(ctx, eq.id)).toMatchObject({ confirmed: true, powerWatts: 800 });
  });

  it('rejects blank names and non-positive or non-finite wattage', async () => {
    const { ctx, db } = freshContext();
    await seedEquipmentPresets(ctx);
    for (const powerWatts of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(addCustomEquipment(ctx, { name: 'X', powerWatts })).rejects.toThrow();
    }
    await expect(addCustomEquipment(ctx, { name: '  ', powerWatts: 500 })).rejects.toThrow();
    const eq = await addEquipmentFromPreset(ctx, 'preset-oven');
    await expect(updateEquipment(ctx, eq.id, { powerWatts: 0 })).rejects.toThrow();
    expect((await db.equipment.get(eq.id))?.powerWatts).toBe(2000);
    await expect(addEquipmentFromPreset(ctx, 'nope')).rejects.toThrow();
    await expect(updateEquipment(ctx, 'nope', { name: 'x' })).rejects.toThrow();
  });

  it('archived equipment is hidden from the default list but kept', async () => {
    const { ctx, db } = freshContext();
    const a = await addCustomEquipment(ctx, { name: 'A', powerWatts: 100 });
    await addCustomEquipment(ctx, { name: 'B', powerWatts: 200 });
    await setEquipmentActive(ctx, a.id, false);
    expect((await listEquipment(ctx)).map((e) => e.name)).toEqual(['B']);
    expect((await listEquipment(ctx, { includeInactive: true })).map((e) => e.name)).toEqual(['A', 'B']);
    expect(await db.equipment.count()).toBe(2);
  });

  it('two of the same appliance are allowed', async () => {
    const { ctx } = freshContext();
    await seedEquipmentPresets(ctx);
    await addEquipmentFromPreset(ctx, 'preset-oven');
    await addEquipmentFromPreset(ctx, 'preset-oven');
    expect(await listEquipment(ctx)).toHaveLength(2);
  });
});

describe('Pembungkusan (Doc 03 §3)', () => {
  const box = { name: 'Kotak kek', purchasePrice: 20, purchaseQuantity: 50, purchaseUnit: 'pcs' };

  it('creates packaging and lists it by name', async () => {
    const { ctx } = freshContext();
    await createPackaging(ctx, { ...box, name: 'Plastik' });
    await createPackaging(ctx, box);
    expect((await listPackaging(ctx)).map((p) => p.name)).toEqual(['Kotak kek', 'Plastik']);
  });

  it('stores no derived unit cost', async () => {
    const { ctx } = freshContext();
    const p = await createPackaging(ctx, box);
    expect(Object.keys(p)).not.toContain('unitCost');
    expect(p).toMatchObject({ purchasePrice: 20, purchaseQuantity: 50, active: true });
  });

  it('update changes fields and the timestamp; unknown id fails', async () => {
    const { ctx, setNow } = freshContext();
    const p = await createPackaging(ctx, box);
    setNow('2026-10-01T09:00:00');
    const u = await updatePackaging(ctx, p.id, { purchasePrice: 25 });
    expect(u.purchasePrice).toBe(25);
    expect(u.updatedAt).not.toBe(p.updatedAt);
    await expect(updatePackaging(ctx, 'nope', { purchasePrice: 1 })).rejects.toThrow();
  });

  it('rejects blank name/unit, negative price and non-positive quantity, writing nothing', async () => {
    const { ctx, db } = freshContext();
    await expect(createPackaging(ctx, { ...box, name: ' ' })).rejects.toThrow();
    await expect(createPackaging(ctx, { ...box, purchaseUnit: '' })).rejects.toThrow();
    await expect(createPackaging(ctx, { ...box, purchasePrice: -1 })).rejects.toThrow();
    await expect(createPackaging(ctx, { ...box, purchaseQuantity: 0 })).rejects.toThrow();
    await expect(createPackaging(ctx, { ...box, purchaseQuantity: Number.NaN })).rejects.toThrow();
    expect(await db.packaging.count()).toBe(0);
    const p = await createPackaging(ctx, box);
    await expect(updatePackaging(ctx, p.id, { purchaseQuantity: -3 })).rejects.toThrow();
    expect((await db.packaging.get(p.id))?.purchaseQuantity).toBe(50);
  });

  it('archive hides from the default list', async () => {
    const { ctx } = freshContext();
    const p = await createPackaging(ctx, box);
    await setPackagingActive(ctx, p.id, false);
    expect(await listPackaging(ctx)).toHaveLength(0);
    expect(await listPackaging(ctx, { includeInactive: true })).toHaveLength(1);
  });
});

describe('Bahan list and archive', () => {
  it('lists active ingredients by name, archive keeps history', async () => {
    const { ctx, db } = freshContext();
    const g = await createIngredient(ctx, { name: 'Gula', purchasePrice: 4, packageQuantity: 1, packageUnit: 'kg' });
    await createIngredient(ctx, { name: 'Ayam', purchasePrice: 60, packageQuantity: 2, packageUnit: 'kg' });
    expect((await listIngredients(ctx)).map((i) => i.name)).toEqual(['Ayam', 'Gula']);
    await setIngredientActive(ctx, g.id, false);
    expect((await listIngredients(ctx)).map((i) => i.name)).toEqual(['Ayam']);
    expect((await listIngredients(ctx, { includeInactive: true })).map((i) => i.name)).toEqual(['Ayam', 'Gula']);
    expect(await db.priceHistory.count()).toBe(2);
  });

  it('archiving or restoring never writes a price-history record', async () => {
    const { ctx, db } = freshContext();
    const g = await createIngredient(ctx, { name: 'Gula', purchasePrice: 4, packageQuantity: 1, packageUnit: 'kg' });
    await setIngredientActive(ctx, g.id, false);
    await setIngredientActive(ctx, g.id, true);
    expect(await db.priceHistory.count()).toBe(1);
  });

  it('sorts names case-insensitively', async () => {
    const { ctx } = freshContext();
    await createIngredient(ctx, { name: 'garam', purchasePrice: 1, packageQuantity: 1, packageUnit: 'kg' });
    await createIngredient(ctx, { name: 'Ayam', purchasePrice: 1, packageQuantity: 1, packageUnit: 'kg' });
    await createIngredient(ctx, { name: 'bawang', purchasePrice: 1, packageQuantity: 1, packageUnit: 'kg' });
    expect((await listIngredients(ctx)).map((i) => i.name)).toEqual(['Ayam', 'bawang', 'garam']);
  });
});
