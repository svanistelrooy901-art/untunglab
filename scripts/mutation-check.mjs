import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const muts = [
  ['cached cost beats live source', 'src/domain/costing.ts',
    'if (line.ingredient) {\n        ingredientBatch += ingredientCostFromSource(line.ingredient, line.quantity, line.unit);',
    'if (line.ingredient && !isNonNegative(line.cachedCost)) {\n        ingredientBatch += ingredientCostFromSource(line.ingredient, line.quantity, line.unit);'],
  ['per-portion packaging divided by yield again', 'src/domain/costing.ts',
    "if (line.semantics === 'per_portion') packagingPerPortion += cost;",
    "if (line.semantics === 'per_portion') packagingPerPortion += yieldOk ? cost / menu.yield : cost;"],
  ['missing sales treated as zero overhead', 'src/domain/operating.ts',
    "return { ok: false, reason: 'expected_sales_missing' };\n  }\n  assertAmount",
    "return { ok: true, rate: 0, ratePct: 0 };\n  }\n  assertAmount"],
  ['price change on sticker price not unit cost', 'src/domain/priceChange.ts',
    'percentChange: p.perBaseUnit > 0 ? ((c.perBaseUnit - p.perBaseUnit) / p.perBaseUnit) * 100 : null,',
    'percentChange: previous.purchasePrice > 0 ? ((current.purchasePrice - previous.purchasePrice) / previous.purchasePrice) * 100 : null,'],
  ['negative sign dropped in display', 'src/domain/format.ts',
    "const sign = value < 0 && rounded !== 0 ? MINUS : '';\n  return `${sign}RM",
    "const sign = '';\n  return `${sign}RM"],
  ['loss no longer overrides margin band', 'src/domain/status.ts',
    "if (profit < -EPSILON) return 'loss';\n  if (marginPct < thresholds.lowBelow - EPSILON) return 'low';",
    "if (marginPct < thresholds.lowBelow - EPSILON) return 'low';\n  if (profit < -EPSILON) return 'loss';"],
  ['direct utilities still counted as shared', 'src/domain/operating.ts',
    ".filter((e) => e.active && e.classification === 'shared')",
    '.filter((e) => e.active)'],
  ['switching mode wipes advanced detail', 'src/domain/operating.ts',
    'return { ...entry, mode };',
    'return { ...entry, mode, detail: undefined };'],
  ['scenario mutates live ingredient', 'src/domain/scenario.ts',
    'return { ...source, purchasePrice: (source.purchasePrice * (100 + pct)) / 100 };',
    'source.purchasePrice = (source.purchasePrice * (100 + pct)) / 100; return source;'],
  ['labour divided by 100 instead of 60', 'src/domain/costing.ts',
    'return (productionMinutes / 60) * valueOfTimePerHour;',
    'return (productionMinutes / 100) * valueOfTimePerHour;'],
  ['incompatible units converted silently', 'src/domain/units.ts',
    "throw new UnitError('incompatible', `Cannot convert ${from} to ${to}`);",
    'return quantity;'],
  ['floor-area uses wrong ratio', 'src/domain/operating.ts',
    'return (businessArea / homeArea) * 100;',
    'return (homeArea / businessArea) * 100;'],
  ['name-only edit writes a history record', 'src/domain/priceHistory.ts',
    "previous.packageUnit.trim().toLowerCase() !== next.packageUnit.trim().toLowerCase()\n  );",
    "previous.packageUnit.trim().toLowerCase() !== next.packageUnit.trim().toLowerCase()\n  ) || true;"],
  ['package-size change ignored by history', 'src/domain/priceHistory.ts',
    'previous.packageQuantity !== next.packageQuantity ||', ''],
  ['history compares out of order', 'src/domain/priceHistory.ts',
    'a.purchaseDate < b.purchaseDate ? -1 : a.purchaseDate > b.purchaseDate ? 1 : a.seq - b.seq',
    'a.seq - b.seq'],
  ['no baseline record on create', 'src/db/repo.ts',
    "await db.priceHistory.add(\n      historyRecord(ctx, ingredient.id, 1,",
    "if (false) await db.priceHistory.add(\n      historyRecord(ctx, ingredient.id, 1,"],
  ['backfill not idempotent', 'src/db/repo.ts',
    '.count()) > 0) continue;', '.count()) > 99) continue;'],
  ['history immutability hook removed', 'src/db/db.ts',
    "this.priceHistory.hook('deleting', () => {\n      throw new ImmutableRecordError('priceHistory');\n    });",
    ''],
  ['duplicate operating category allowed', 'src/db/db.ts',
    "operatingCosts: 'id, &[businessId+category]'", "operatingCosts: 'id, [businessId+category]'"],
  ['operating save creates a new row every time', 'src/db/repo.ts',
    'id: existing?.id ?? ctx.newId(),', 'id: ctx.newId(),'],
];

let survived = 0;
for (const [name, file, from, to] of muts) {
  const original = readFileSync(file, 'utf8');
  if (!original.includes(from)) { console.log(`?? pattern not found: ${name}`); survived++; continue; }
  writeFileSync(file, original.replace(from, to));
  let killed = false;
  try { execSync('npx vitest run', { stdio: 'pipe' }); } catch { killed = true; }
  writeFileSync(file, original);
  if (!killed) survived++;
  console.log(`${killed ? 'KILLED  ' : 'SURVIVED'}  ${name}`);
}
console.log(`\n${muts.length - survived}/${muts.length} mutations caught`);
