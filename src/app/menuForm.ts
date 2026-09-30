import type { PackagingSemantics } from '../domain';
import type { MenuDraft } from '../db';
import { t } from '../i18n/ms';
import { parseNumber } from './forms';

export interface MenuForm {
  name: string;
  yield: string;
  minutes: string;
  price: string;
  ingredients: { ingredientId: string; quantity: string; unit: string }[];
  packaging: { packagingId: string; quantity: string; semantics: PackagingSemantics }[];
  equipment: { equipmentId: string; minutes: string }[];
}

export const emptyForm = (): MenuForm => ({ name: '', yield: '', minutes: '', price: '', ingredients: [], packaging: [], equipment: [] });

export type MenuFormErrors = Partial<Record<'name' | 'yield' | 'minutes' | 'price' | 'lines', string>>;

/** Text fields to a storable draft. Every wrong field is reported at once, in Bahasa Melayu. */
export function parseMenuForm(f: MenuForm, id?: string): { ok: true; value: MenuDraft } | { ok: false; errors: MenuFormErrors } {
  const errors: MenuFormErrors = {};
  const yieldN = parseNumber(f.yield);
  const minutes = f.minutes.trim() === '' ? 0 : parseNumber(f.minutes);
  const price = f.price.trim() === '' ? 0 : parseNumber(f.price);
  if (f.name.trim() === '') errors.name = t('menu.errNama');
  if (yieldN === null || yieldN <= 0) errors.yield = t('menu.errHasil');
  if (minutes === null || minutes < 0) errors.minutes = t('menu.errMasa');
  if (price === null || price < 0) errors.price = t('menu.errHarga');

  const ingredients = f.ingredients.map((l) => ({ ingredientId: l.ingredientId, quantity: parseNumber(l.quantity), usageUnit: l.unit.trim() }));
  const packaging = f.packaging.map((l) => ({ packagingId: l.packagingId, quantityUsed: parseNumber(l.quantity), usageSemantics: l.semantics }));
  const equipment = f.equipment.map((l) => ({ equipmentId: l.equipmentId, durationMinutes: l.minutes.trim() === '' ? null : parseNumber(l.minutes) }));
  const badLine =
    ingredients.some((l) => l.ingredientId === '' || l.quantity === null || l.quantity <= 0 || l.usageUnit === '') ||
    packaging.some((l) => l.packagingId === '' || l.quantityUsed === null || l.quantityUsed <= 0) ||
    equipment.some((l) => l.equipmentId === '' || l.durationMinutes === null || l.durationMinutes < 0);
  if (badLine) errors.lines = t('menu.errBaris');

  if (Object.keys(errors).length > 0 || yieldN === null || minutes === null || price === null) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...(id ? { id } : {}),
      name: f.name.trim(),
      yield: yieldN,
      productionMinutesPerBatch: minutes,
      sellingPrice: price,
      ingredients: ingredients.map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity as number, usageUnit: l.usageUnit })),
      packaging: packaging.map((l) => ({ packagingId: l.packagingId, quantityUsed: l.quantityUsed as number, usageSemantics: l.usageSemantics })),
      equipment: equipment.map((l) => ({ equipmentId: l.equipmentId, durationMinutes: l.durationMinutes as number })),
    },
  };
}
