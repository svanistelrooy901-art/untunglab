import type { Context } from './repo';

/**
 * Backup and restore (Doc 05 §9 "backup/export capability recommended"). With no cloud sync, this file is the only
 * copy of the user's data outside the phone, so it is versioned, checksummed and validated before anything is touched.
 * The checksum catches damage (truncation, a bad copy); it is not a defence against deliberate editing.
 */
export const BACKUP_FORMAT = 1;

/** Tables that hold the user's data. Equipment presets are app data re-seeded on startup, so they are not exported. */
const TABLES = [
  'businesses',
  'costProfiles',
  'operatingCosts',
  'tariffs',
  'equipment',
  'ingredients',
  'priceHistory',
  'packaging',
  'recipes',
  'recipeIngredients',
  'recipePackaging',
  'recipeEquipmentUsage',
  'menus',
  'scenarios',
  'insights',
] as const;
type TableName = (typeof TABLES)[number];

export interface BackupFile {
  app: 'untunglab';
  format: number;
  exportedAt: string;
  data: Record<TableName, Record<string, unknown>[]>;
  checksum: string;
}

export type BackupIssueCode =
  | 'not_json'
  | 'not_untunglab'
  | 'newer_format'
  | 'checksum_mismatch'
  | 'missing_table'
  | 'bad_row'
  | 'duplicate_id'
  | 'duplicate_key'
  | 'broken_reference';

export interface BackupIssue {
  code: BackupIssueCode;
  detail?: string;
}

export interface BackupSummary {
  exportedAt: string;
  ingredients: number;
  packaging: number;
  equipment: number;
  menus: number;
  historyRecords: number;
}

export class BackupError extends Error {
  readonly issues: BackupIssue[];
  constructor(issues: BackupIssue[]) {
    super(`Backup cannot be used: ${issues.map((i) => i.code).join(', ')}`);
    this.name = 'BackupError';
    this.issues = issues;
  }
}

type FieldType = 'string' | 'number' | 'boolean' | 'array';
const SPEC: Record<TableName, { key: string; fields: Record<string, FieldType> }> = {
  businesses: { key: 'id', fields: { id: 'string' } },
  costProfiles: { key: 'businessId', fields: { businessId: 'string' } },
  operatingCosts: { key: 'id', fields: { id: 'string', businessId: 'string', category: 'string', simpleAmount: 'number', active: 'boolean' } },
  tariffs: { key: 'id', fields: { id: 'string', businessId: 'string', ratePerKwh: 'number', effectiveDate: 'string' } },
  equipment: { key: 'id', fields: { id: 'string', businessId: 'string', name: 'string', powerWatts: 'number', active: 'boolean' } },
  ingredients: { key: 'id', fields: { id: 'string', businessId: 'string', name: 'string', purchasePrice: 'number', packageQuantity: 'number', packageUnit: 'string', packMappings: 'array', active: 'boolean' } },
  priceHistory: { key: 'id', fields: { id: 'string', ingredientId: 'string', seq: 'number', purchaseDate: 'string', purchasePrice: 'number', packageQuantity: 'number', packageUnit: 'string', packMappings: 'array', sourceType: 'string' } },
  packaging: { key: 'id', fields: { id: 'string', businessId: 'string', name: 'string', purchasePrice: 'number', purchaseQuantity: 'number', purchaseUnit: 'string', active: 'boolean' } },
  recipes: { key: 'id', fields: { id: 'string', businessId: 'string', name: 'string', yield: 'number', productionMinutesPerBatch: 'number' } },
  recipeIngredients: { key: 'id', fields: { id: 'string', recipeId: 'string', position: 'number', ingredientId: 'string', quantity: 'number', usageUnit: 'string' } },
  recipePackaging: { key: 'id', fields: { id: 'string', recipeId: 'string', position: 'number', packagingId: 'string', quantityUsed: 'number', usageSemantics: 'string' } },
  recipeEquipmentUsage: { key: 'id', fields: { id: 'string', recipeId: 'string', position: 'number', equipmentId: 'string', durationMinutes: 'number' } },
  menus: { key: 'id', fields: { id: 'string', businessId: 'string', recipeId: 'string', sellingPrice: 'number', active: 'boolean' } },
  scenarios: { key: 'id', fields: { id: 'string', businessId: 'string' } },
  insights: { key: 'id', fields: { id: 'string', businessId: 'string', type: 'string' } },
};

/** [table, field, target table, target field] */
const REFS: [TableName, string, TableName, string][] = [
  ['costProfiles', 'businessId', 'businesses', 'id'],
  ['operatingCosts', 'businessId', 'businesses', 'id'],
  ['tariffs', 'businessId', 'businesses', 'id'],
  ['equipment', 'businessId', 'businesses', 'id'],
  ['ingredients', 'businessId', 'businesses', 'id'],
  ['packaging', 'businessId', 'businesses', 'id'],
  ['recipes', 'businessId', 'businesses', 'id'],
  ['menus', 'businessId', 'businesses', 'id'],
  ['priceHistory', 'ingredientId', 'ingredients', 'id'],
  ['menus', 'recipeId', 'recipes', 'id'],
  ['recipeIngredients', 'recipeId', 'recipes', 'id'],
  ['recipeIngredients', 'ingredientId', 'ingredients', 'id'],
  ['recipePackaging', 'recipeId', 'recipes', 'id'],
  ['recipePackaging', 'packagingId', 'packaging', 'id'],
  ['recipeEquipmentUsage', 'recipeId', 'recipes', 'id'],
  ['recipeEquipmentUsage', 'equipmentId', 'equipment', 'id'],
];

/** Numbers that must never be negative, and quantities that must be above zero. */
const NON_NEGATIVE = ['simpleAmount', 'ratePerKwh', 'powerWatts', 'purchasePrice', 'sellingPrice', 'quantity', 'quantityUsed', 'durationMinutes', 'productionMinutesPerBatch'];
const POSITIVE = ['packageQuantity', 'purchaseQuantity', 'yield'];

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return 'sha256:' + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createBackup(ctx: Context): Promise<BackupFile> {
  const { db } = ctx;
  const data = {} as BackupFile['data'];
  await db.transaction('r', TABLES.map((name) => db[name]), async () => {
    for (const name of TABLES) data[name] = (await db[name].toArray()) as unknown as Record<string, unknown>[];
  });
  return {
    app: 'untunglab',
    format: BACKUP_FORMAT,
    exportedAt: ctx.now().toISOString(),
    data,
    checksum: await sha256(JSON.stringify(data)),
  };
}

export const backupToText = (b: BackupFile): string => JSON.stringify(b);

export type ReadResult = { ok: true; backup: BackupFile; summary: BackupSummary } | { ok: false; issues: BackupIssue[] };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Everything is checked here. Nothing is written until this returns ok. */
export async function readBackup(text: string): Promise<ReadResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, issues: [{ code: 'not_json' }] };
  }
  if (!isObject(parsed) || parsed.app !== 'untunglab' || typeof parsed.format !== 'number' || !isObject(parsed.data)) {
    return { ok: false, issues: [{ code: 'not_untunglab' }] };
  }
  if (parsed.format > BACKUP_FORMAT) return { ok: false, issues: [{ code: 'newer_format' }] };
  if (parsed.checksum !== (await sha256(JSON.stringify(parsed.data)))) {
    return { ok: false, issues: [{ code: 'checksum_mismatch' }] };
  }

  const data = parsed.data as Record<string, unknown>;
  const issues: BackupIssue[] = [];
  const keys = new Map<TableName, Set<string>>();

  for (const name of TABLES) {
    const rows = data[name];
    if (!Array.isArray(rows)) {
      issues.push({ code: 'missing_table', detail: name });
      continue;
    }
    const { key, fields } = SPEC[name];
    const seen = new Set<string>();
    rows.forEach((row, i) => {
      if (!isObject(row)) {
        issues.push({ code: 'bad_row', detail: `${name}[${i}]` });
        return;
      }
      for (const [field, type] of Object.entries(fields)) {
        const v = row[field];
        const ok = type === 'array' ? Array.isArray(v) : type === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeof v === type;
        if (!ok) issues.push({ code: 'bad_row', detail: `${name}[${i}].${field}` });
      }
      for (const field of NON_NEGATIVE) if (typeof row[field] === 'number' && (row[field] as number) < 0) issues.push({ code: 'bad_row', detail: `${name}[${i}].${field}` });
      for (const field of POSITIVE) if (typeof row[field] === 'number' && (row[field] as number) <= 0) issues.push({ code: 'bad_row', detail: `${name}[${i}].${field}` });
      const id = row[key];
      if (typeof id === 'string') {
        if (seen.has(id)) issues.push({ code: 'duplicate_id', detail: `${name}:${id}` });
        seen.add(id);
      }
    });
    keys.set(name, seen);
  }
  if (issues.length > 0) return { ok: false, issues: issues.slice(0, 20) };

  for (const [table, field, target, targetField] of REFS) {
    const valid = targetField === 'id' ? keys.get(target)! : new Set<string>();
    for (const row of data[table] as Record<string, unknown>[]) {
      if (!valid.has(row[field] as string)) issues.push({ code: 'broken_reference', detail: `${table}.${field}` });
    }
  }

  const uniqueBy = (table: TableName, of: (r: Record<string, unknown>) => string) => {
    const seen = new Set<string>();
    for (const row of data[table] as Record<string, unknown>[]) {
      const k = of(row);
      if (seen.has(k)) issues.push({ code: 'duplicate_key', detail: `${table}:${k}` });
      seen.add(k);
    }
  };
  uniqueBy('priceHistory', (r) => `${r.ingredientId}#${r.seq}`);
  uniqueBy('operatingCosts', (r) => `${r.businessId}#${r.category}`);
  if (issues.length > 0) return { ok: false, issues: issues.slice(0, 20) };

  const count = (name: TableName) => (data[name] as unknown[]).length;
  return {
    ok: true,
    backup: parsed as unknown as BackupFile,
    summary: {
      exportedAt: String(parsed.exportedAt ?? ''),
      ingredients: count('ingredients'),
      packaging: count('packaging'),
      equipment: count('equipment'),
      menus: count('menus'),
      historyRecords: count('priceHistory'),
    },
  };
}

/**
 * Replaces everything on this device with the backup, in one transaction: either all of it is restored or none of it.
 * The price-history delete guard is lifted only for the duration of this call.
 */
export async function restoreBackup(ctx: Context, text: string): Promise<BackupSummary> {
  const read = await readBackup(text);
  if (!read.ok) throw new BackupError(read.issues);
  const { db } = ctx;
  db.restoring = true;
  try {
    await db.transaction('rw', TABLES.map((name) => db[name]), async () => {
      for (const name of TABLES) await db[name].clear();
      for (const name of TABLES) {
        const rows = read.backup.data[name];
        if (rows.length > 0) await (db[name] as unknown as { bulkAdd: (r: unknown[]) => Promise<unknown> }).bulkAdd(rows);
      }
    });
  } finally {
    db.restoring = false;
  }
  return read.summary;
}
