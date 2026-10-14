/**
 * Screen-side helpers for Plan a Batch (D-97): reading the form, the JualanLab link prefill, wording and the
 * WhatsApp text. The calculation itself is `planBatch` in src/domain.
 */
import { formatQuantity, formatRM, isRoundedForDisplay, planBatch, type BatchIssue, type BatchIssueCode, type BatchPlanResult } from '../domain';
import type { CostingData } from '../db';
import { t, type MsKey } from '../i18n/ms';
import { MAX_QUANTITY, type BatchList, type LinkError, type LinkErrorCode } from '../link';
import { parseNumber } from './forms';
import type { CostedMenu } from './menuAssembly';

/** Blank means 0 (not in this batch). Otherwise a whole number from 0 to the format's limit. */
export function parsePieces(text: string): number | null {
  if (text.trim() === '') return 0;
  const n = parseNumber(text);
  return n !== null && Number.isInteger(n) && n >= 0 && n <= MAX_QUANTITY ? n : null;
}

export interface NotCalculated {
  name: string;
  quantity: number;
}

export interface LinkPrefill {
  batchDate: string;
  /** Pieces by UntungLab menu id, for menus found and active here. */
  quantities: Map<string, number>;
  /** Items whose menu is not here (deleted or inactive) and JualanLab-only items: listed, never calculated. */
  notCalculated: NotCalculated[];
}

export function prefillFromBatchList(list: BatchList, activeMenuIds: ReadonlySet<string>): LinkPrefill {
  const quantities = new Map<string, number>();
  const notCalculated: NotCalculated[] = [];
  for (const it of list.items) {
    if (activeMenuIds.has(it.menuId)) quantities.set(it.menuId, it.quantity);
    else notCalculated.push({ name: it.name, quantity: it.quantity });
  }
  for (const x of list.notInUntungLab) notCalculated.push({ name: x.name, quantity: x.quantity });
  return { batchDate: list.batchDate, quantities, notCalculated };
}

/** Runs the domain calculation for the chosen menus, in the order given. Menus not active or at 0 are left out. */
export function planFor(order: CostedMenu[], data: CostingData, pieces: ReadonlyMap<string, number>): BatchPlanResult {
  const menus = order
    .filter((c) => c.menu.active && (pieces.get(c.menu.id) ?? 0) !== 0)
    .map((c) => ({ menuId: c.menu.id, name: c.menu.name, input: c.input, pieces: pieces.get(c.menu.id)! }));
  return planBatch({
    menus,
    ingredientNames: new Map(data.ingredients.map((i) => [i.id, i.name])),
    packagingNames: new Map(data.packaging.map((p) => [p.id, p.name])),
  });
}

/** A quantity as shown: "2.5", or "≈4.17" when the display had to round it. */
export function shownQuantity(n: number): string {
  return `${isRoundedForDisplay(n) ? '≈' : ''}${formatQuantity(n)}`;
}

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);

const ISSUE_KEYS: Record<BatchIssueCode, MsKey> = {
  pieces_invalid: 'batch.isuPiecesInvalid',
  yield_invalid: 'batch.isuYieldInvalid',
  ingredient_missing: 'batch.isuIngredientMissing',
  packaging_missing: 'batch.isuPackagingMissing',
  incompatible_units: 'batch.isuIncompatibleUnits',
  invalid_quantity: 'batch.isuInvalidQuantity',
};

export function issueText(i: BatchIssue): string {
  return fill(t(ISSUE_KEYS[i.code]), { menu: i.menuName, item: i.itemName ?? t('menu.hilang'), unit: i.unit ?? '' });
}

const LINK_ERROR_KEYS: Record<LinkErrorCode, MsKey> = {
  not_a_link: 'batch.ralatNotALink',
  bad_encoding: 'batch.ralatBadEncoding',
  bad_json: 'batch.ralatBadEncoding',
  too_large: 'batch.ralatTooLarge',
  wrong_app: 'batch.ralatWrongApp',
  wrong_kind: 'batch.ralatWrongKind',
  newer_format: 'batch.ralatNewerFormat',
  invalid: 'batch.ralatInvalid',
};

export function linkErrorText(e: LinkError): string {
  return fill(t(LINK_ERROR_KEYS[e.code]), { path: e.path ?? '' });
}

export function batchLine(m: BatchPlanResult['menus'][number]): string {
  return m.batches === null
    ? fill(t('batch.batchBelum'), { pieces: formatQuantity(m.pieces) })
    : fill(t('batch.batchBaris'), { pieces: formatQuantity(m.pieces), yield: formatQuantity(m.yield), batches: shownQuantity(m.batches) });
}

/** "5 kg", "50 pcs": a pack as bought. */
export const packSize = (quantity: number, unit: string) => `${formatQuantity(quantity)} ${unit}`.trim();

/**
 * Plain-text shopping list for WhatsApp (*bold* headings, • bullets). Same figures as the screen; lines that cannot be
 * worked out say so, and the total is left out when it is not known.
 */
export function batchPlanText(args: { date: string; plan: BatchPlanResult; packagingUnit: (id: string) => string; notCalculated: NotCalculated[] }): string {
  const { plan } = args;
  const out: string[] = [`*${fill(t('batch.teksTajuk'), { date: args.date })}*`];
  const section = (title: string, lines: string[]) => {
    if (lines.length === 0) return;
    out.push('', `*${title}*`, ...lines.map((l) => `• ${l}`));
  };

  section(
    t('batch.batchTajuk'),
    plan.menus.map((m) =>
      m.batches === null
        ? fill(t('batch.teksMenuBelum'), { name: m.name, pieces: formatQuantity(m.pieces) })
        : fill(t('batch.teksMenu'), { name: m.name, pieces: formatQuantity(m.pieces), batches: shownQuantity(m.batches) }),
    ),
  );
  section(
    t('batch.beliTajuk'),
    plan.shopping.map((s) =>
      s.needed === null || s.packsToBuy === null
        ? fill(t('batch.teksBelum'), { name: s.name })
        : fill(t('batch.teksBeli'), { name: s.name, amount: `${shownQuantity(s.needed)} ${s.unit}`, packs: String(s.packsToBuy), size: packSize(s.packQuantity, s.packUnit) }),
    ),
  );
  section(
    t('batch.packTajuk'),
    plan.packaging.map((p) =>
      p.needed === null || p.packsToBuy === null
        ? fill(t('batch.teksBelum'), { name: p.name })
        : fill(t('batch.teksBeli'), { name: p.name, amount: shownQuantity(p.needed), packs: String(p.packsToBuy), size: packSize(p.packQuantity, args.packagingUnit(p.packagingId)) }),
    ),
  );

  const totals: string[] = [];
  if (plan.shopping.length > 0 && plan.ingredientCost !== null) totals.push(fill(t('batch.teksJumlah'), { label: t('batch.jumlahBahan'), amount: formatRM(plan.ingredientCost) }));
  if (plan.packaging.length > 0 && plan.packagingCost !== null) totals.push(fill(t('batch.teksJumlah'), { label: t('batch.jumlahPack'), amount: formatRM(plan.packagingCost) }));
  if (totals.length > 0) out.push('', ...totals);

  section(t('batch.tidakDikiraTajuk'), args.notCalculated.map((x) => fill(t('batch.teksTidakDikira'), { name: x.name, quantity: formatQuantity(x.quantity) })));
  section(t('batch.isuTajuk'), plan.issues.map(issueText));
  return out.join('\n') + '\n';
}
