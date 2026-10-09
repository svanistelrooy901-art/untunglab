import { createIngredient, updateIngredient, type Context } from './repo';

export interface ImportRowInput {
  row: number;
  name: string;
  price: number;
  qty: number;
  unit: string;
  action: 'create' | 'update';
  existingId?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  failed: { row: number; name: string }[];
}

/**
 * Applies an already-validated import plan (D-87). Each row is its own transaction, so one bad row cannot undo the rest.
 * An update changes the price, quantity and unit and writes a Jejak Harga record marked as an import.
 */
export async function applyIngredientImport(ctx: Context, rows: ImportRowInput[]): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, failed: [] };
  for (const r of rows) {
    try {
      if (r.action === 'update' && r.existingId) {
        await updateIngredient(ctx, r.existingId, { purchasePrice: r.price, packageQuantity: r.qty, packageUnit: r.unit }, { sourceType: 'import' });
        result.updated++;
      } else {
        await createIngredient(ctx, { name: r.name, purchasePrice: r.price, packageQuantity: r.qty, packageUnit: r.unit });
        result.created++;
      }
    } catch {
      result.failed.push({ row: r.row, name: r.name });
    }
  }
  return result;
}
