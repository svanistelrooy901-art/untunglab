import { RepoError, ensureBusiness, type Context } from './repo';
import type { Equipment, EquipmentPreset, Ingredient, Packaging } from './types';

/** Doc 02 §5 presets. Wattages are estimates ("Anggaran UntungLab") until the user confirms them. */
export const EQUIPMENT_PRESET_DEFAULTS: EquipmentPreset[] = [
  { id: 'preset-oven', canonicalName: 'Oven', defaultWatts: 2000, active: true, version: 1 },
  { id: 'preset-stand-mixer', canonicalName: 'Stand mixer', defaultWatts: 500, active: true, version: 1 },
  { id: 'preset-blender', canonicalName: 'Blender', defaultWatts: 800, active: true, version: 1 },
  { id: 'preset-induction', canonicalName: 'Induction cooker', defaultWatts: 1800, active: true, version: 1 },
  { id: 'preset-air-fryer', canonicalName: 'Air fryer', defaultWatts: 1500, active: true, version: 1 },
  { id: 'preset-rice-cooker', canonicalName: 'Rice cooker', defaultWatts: 700, active: true, version: 1 },
];

export interface ListOptions {
  includeInactive?: boolean;
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }) || (a.name < b.name ? -1 : 1);

const invalid = (msg: string) => new RepoError('invalid_input', msg);

function requireName(name: string): string {
  const n = name.trim();
  if (n === '') throw invalid('Name is required');
  return n;
}

function requireUnit(unit: string): string {
  if (unit.trim() === '') throw invalid('Unit is required');
  return unit;
}

function requireWatts(w: number): number {
  if (!Number.isFinite(w) || w <= 0) throw invalid('Power must be a positive number of watts');
  return w;
}

// ---------- equipment ----------

/** Adds any missing preset. Existing presets are never overwritten. Returns how many were added. */
export async function seedEquipmentPresets(ctx: Context): Promise<number> {
  const { db } = ctx;
  return db.transaction('rw', db.equipmentPresets, async () => {
    const existing = new Set(await db.equipmentPresets.toCollection().primaryKeys());
    const missing = EQUIPMENT_PRESET_DEFAULTS.filter((p) => !existing.has(p.id));
    await db.equipmentPresets.bulkAdd(missing);
    return missing.length;
  });
}

export async function listEquipmentPresets(ctx: Context): Promise<EquipmentPreset[]> {
  return (await ctx.db.equipmentPresets.toArray()).filter((p) => p.active);
}

export async function addEquipmentFromPreset(ctx: Context, presetId: string): Promise<Equipment> {
  const preset = await ctx.db.equipmentPresets.get(presetId);
  if (!preset) throw new RepoError('not_found', `Preset ${presetId} not found`);
  const business = await ensureBusiness(ctx);
  const eq: Equipment = {
    id: ctx.newId(),
    businessId: business.id,
    presetId: preset.id,
    name: preset.canonicalName,
    powerWatts: preset.defaultWatts,
    source: 'preset',
    confirmed: false,
    active: true,
  };
  await ctx.db.equipment.add(eq);
  return eq;
}

export async function addCustomEquipment(ctx: Context, input: { name: string; powerWatts: number }): Promise<Equipment> {
  const name = requireName(input.name);
  const powerWatts = requireWatts(input.powerWatts);
  const business = await ensureBusiness(ctx);
  const eq: Equipment = {
    id: ctx.newId(),
    businessId: business.id,
    presetId: null,
    name,
    powerWatts,
    source: 'user',
    confirmed: true,
    active: true,
  };
  await ctx.db.equipment.add(eq);
  return eq;
}

/** Changing the wattage is the user vouching for it, so it confirms the value. A rename does not. */
export async function updateEquipment(
  ctx: Context,
  id: string,
  patch: { name?: string; powerWatts?: number },
): Promise<Equipment> {
  const { db } = ctx;
  return db.transaction('rw', db.equipment, async () => {
    const current = await db.equipment.get(id);
    if (!current) throw new RepoError('not_found', `Equipment ${id} not found`);
    const next: Equipment = {
      ...current,
      ...(patch.name !== undefined ? { name: requireName(patch.name) } : {}),
      ...(patch.powerWatts !== undefined ? { powerWatts: requireWatts(patch.powerWatts), confirmed: true } : {}),
    };
    await db.equipment.put(next);
    return next;
  });
}

export async function confirmEquipment(ctx: Context, id: string): Promise<Equipment> {
  const { db } = ctx;
  return db.transaction('rw', db.equipment, async () => {
    const current = await db.equipment.get(id);
    if (!current) throw new RepoError('not_found', `Equipment ${id} not found`);
    const next = { ...current, confirmed: true };
    await db.equipment.put(next);
    return next;
  });
}

export async function setEquipmentActive(ctx: Context, id: string, active: boolean): Promise<void> {
  if ((await ctx.db.equipment.update(id, { active })) === 0) throw new RepoError('not_found', `Equipment ${id} not found`);
}

export async function listEquipment(ctx: Context, opts: ListOptions = {}): Promise<Equipment[]> {
  const all = await ctx.db.equipment.toArray();
  return all.filter((e) => opts.includeInactive || e.active).sort(byName);
}

// ---------- packaging ----------

export interface PackagingInput {
  name: string;
  purchasePrice: number;
  purchaseQuantity: number;
  purchaseUnit: string;
}

function validatePackaging(p: PackagingInput): PackagingInput {
  const name = requireName(p.name);
  requireUnit(p.purchaseUnit);
  if (!Number.isFinite(p.purchasePrice) || p.purchasePrice < 0) throw invalid('Price cannot be negative');
  if (!Number.isFinite(p.purchaseQuantity) || p.purchaseQuantity <= 0) throw invalid('Quantity must be more than zero');
  return { ...p, name };
}

export async function createPackaging(ctx: Context, input: PackagingInput): Promise<Packaging> {
  const valid = validatePackaging(input);
  const business = await ensureBusiness(ctx);
  const at = ctx.now().toISOString();
  const row: Packaging = { id: ctx.newId(), businessId: business.id, ...valid, active: true, createdAt: at, updatedAt: at };
  await ctx.db.packaging.add(row);
  return row;
}

export async function updatePackaging(ctx: Context, id: string, patch: Partial<PackagingInput>): Promise<Packaging> {
  const { db } = ctx;
  return db.transaction('rw', db.packaging, async () => {
    const current = await db.packaging.get(id);
    if (!current) throw new RepoError('not_found', `Packaging ${id} not found`);
    const merged = validatePackaging({
      name: patch.name ?? current.name,
      purchasePrice: patch.purchasePrice ?? current.purchasePrice,
      purchaseQuantity: patch.purchaseQuantity ?? current.purchaseQuantity,
      purchaseUnit: patch.purchaseUnit ?? current.purchaseUnit,
    });
    const next: Packaging = { ...current, ...merged, updatedAt: ctx.now().toISOString() };
    await db.packaging.put(next);
    return next;
  });
}

export async function setPackagingActive(ctx: Context, id: string, active: boolean): Promise<void> {
  if ((await ctx.db.packaging.update(id, { active, updatedAt: ctx.now().toISOString() })) === 0) {
    throw new RepoError('not_found', `Packaging ${id} not found`);
  }
}

export async function listPackaging(ctx: Context, opts: ListOptions = {}): Promise<Packaging[]> {
  const all = await ctx.db.packaging.toArray();
  return all.filter((p) => opts.includeInactive || p.active).sort(byName);
}

// ---------- ingredients ----------

export async function listIngredients(ctx: Context, opts: ListOptions = {}): Promise<Ingredient[]> {
  const all = await ctx.db.ingredients.toArray();
  return all.filter((i) => opts.includeInactive || i.active).sort(byName);
}

/** Archive or restore. Never touches purchase data, so it never writes Jejak Harga. */
export async function setIngredientActive(ctx: Context, id: string, active: boolean): Promise<void> {
  if ((await ctx.db.ingredients.update(id, { active, updatedAt: ctx.now().toISOString() })) === 0) {
    throw new RepoError('not_found', `Ingredient ${id} not found`);
  }
}
