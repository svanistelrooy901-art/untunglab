import { historyChanges, perDisplayUnit, normalisedUnitCost, type HistoryChange, type Issue, type StatusCode } from '../domain';
import type { CostingData, Ingredient, PriceHistoryRecord } from '../db';
import { computeAllMenus } from './menuAssembly';

/**
 * A latest movement of at least this many percent (either direction) becomes a Dashboard insight.
 * Every movement, whatever its size, is still shown on Jejak Harga. Product guidance, not a financial rule (D-43).
 */
export const PRICE_ALERT_PCT = 10;

export interface MenuRef {
  id: string;
  name: string;
}

type Change = Extract<HistoryChange<PriceHistoryRecord>, { kind: 'change' }>;

export interface IngredientTrail {
  ingredient: Ingredient;
  /** Oldest first, each compared to the one before it on normalised unit cost. */
  changes: HistoryChange<PriceHistoryRecord>[];
  latest: PriceHistoryRecord | null;
  /** Latest normalised unit cost in the unit people read (per kg, per litre, per counted unit). */
  latestUnit: { amount: number; unit: string } | null;
  /** The newest record compared with the one before it. Null for a baseline-only ingredient or incomparable units. */
  lastChange: Change | null;
  /** True when the newest record's units cannot be compared with the one before it. */
  incomparable: boolean;
  affectedMenus: MenuRef[];
}

function usedBy(data: CostingData, ingredientId: string): MenuRef[] {
  return data.menus
    .filter((m) => m.active && m.ingredients.some((l) => l.ingredientId === ingredientId))
    .map((m) => ({ id: m.menuId, name: m.name }));
}

/** Jejak Harga rows: newest change first, then by name. Archived ingredients are left out. */
export function buildTrails(data: CostingData, history: readonly PriceHistoryRecord[]): IngredientTrail[] {
  const byIngredient = new Map<string, PriceHistoryRecord[]>();
  for (const r of history) byIngredient.set(r.ingredientId, [...(byIngredient.get(r.ingredientId) ?? []), r]);

  const trails = data.ingredients
    .filter((i) => i.active)
    .map((ingredient): IngredientTrail => {
      const changes = historyChanges(byIngredient.get(ingredient.id) ?? [], ingredient.packMappings);
      const newest = changes[changes.length - 1];
      const latest = newest?.entry ?? null;
      let latestUnit: IngredientTrail['latestUnit'] = null;
      if (latest) {
        latestUnit = perDisplayUnit(normalisedUnitCost(latest.purchasePrice, latest.packageQuantity, latest.packageUnit, latest.packMappings));
      }
      return {
        ingredient,
        changes,
        latest,
        latestUnit,
        lastChange: newest?.kind === 'change' ? newest : null,
        incomparable: newest?.kind === 'incompatible_units',
        affectedMenus: usedBy(data, ingredient.id),
      };
    });

  return trails.sort((a, b) => {
    const da = a.latest?.purchaseDate ?? '';
    const db = b.latest?.purchaseDate ?? '';
    return da === db ? a.ingredient.name.localeCompare(b.ingredient.name, 'ms', { sensitivity: 'base' }) : da < db ? 1 : -1;
  });
}

export interface RankedMenu {
  menuId: string;
  name: string;
  sellingPrice: number;
  fullCost: number;
  profit: number;
  marginPct: number;
  status: StatusCode;
}

export interface IncompleteMenu {
  menuId: string;
  name: string;
  issues: Issue[];
}

export type InsightItem =
  | { type: 'loss'; severity: 'critical'; menus: MenuRef[]; to: string }
  | {
      type: 'price_move';
      /** Identifies this exact price event. Closing the alert stores it; the next price change has a new key. */
      key: string;
      severity: 'warning' | 'info';
      direction: 'up' | 'down';
      ingredientId: string;
      name: string;
      percent: number;
      displayUnit: string;
      /** Normalised unit cost per display unit, before and after. */
      fromAmount: number;
      toAmount: number;
      affected: MenuRef[];
      to: string;
    }
  | { type: 'incomplete'; severity: 'info'; menus: MenuRef[]; to: string };

export interface DashboardModel {
  menuCount: number;
  /** Complete menus, best margin first. Values are read straight from the shared engine result. */
  ranking: RankedMenu[];
  incomplete: IncompleteMenu[];
  insights: InsightItem[];
  summary: DashboardSummary;
}

export interface DashboardSummary {
  /** Complete menus that make a profit (status low, watch or healthy). */
  profitable: number;
  loss: number;
  incomplete: number;
  completeCount: number;
  /** Plain mean of the complete menus' margin. Null when there is none, never a made-up zero. No sales volume is stored, so it is not weighted (D-75). */
  averageMarginPct: number | null;
  best: { name: string; marginPct: number } | null;
}

/** `ranking` must already be sorted best margin first. */
export function summariseMenus(ranking: readonly RankedMenu[], incompleteCount: number): DashboardSummary {
  const loss = ranking.filter((r) => r.status === 'loss').length;
  const top = ranking[0];
  return {
    profitable: ranking.length - loss,
    loss,
    incomplete: incompleteCount,
    completeCount: ranking.length,
    averageMarginPct: ranking.length === 0 ? null : ranking.reduce((sum, r) => sum + r.marginPct, 0) / ranking.length,
    best: top ? { name: top.name, marginPct: top.marginPct } : null,
  };
}

export function buildDashboard(data: CostingData, history: readonly PriceHistoryRecord[], dismissed: ReadonlySet<string> = new Set()): DashboardModel {
  const costed = computeAllMenus(data);
  const menus = [...costed.values()].filter((c) => c.menu.active);

  const ranking: RankedMenu[] = [];
  const incomplete: IncompleteMenu[] = [];
  for (const { menu, result } of menus) {
    if (result.complete) {
      ranking.push({
        menuId: menu.menuId,
        name: menu.name,
        sellingPrice: menu.sellingPrice,
        fullCost: result.fullCost,
        profit: result.profit,
        marginPct: result.marginPct,
        status: result.status,
      });
    } else {
      incomplete.push({ menuId: menu.menuId, name: menu.name, issues: result.issues });
    }
  }
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' });
  ranking.sort((a, b) => b.marginPct - a.marginPct || byName(a, b));
  incomplete.sort(byName);

  const insights: InsightItem[] = [];

  const loss = ranking.filter((r) => r.status === 'loss').map((r) => ({ id: r.menuId, name: r.name }));
  if (loss.length > 0) {
    insights.push({ type: 'loss', severity: 'critical', menus: loss, to: loss.length === 1 ? `/menu/${loss[0]!.id}` : '/menu' });
  }

  const moves: Extract<InsightItem, { type: 'price_move' }>[] = [];
  for (const trail of buildTrails(data, history)) {
    const c = trail.lastChange;
    const pct = c?.comparison.percentChange;
    if (!c || pct === null || pct === undefined || Math.abs(pct) < PRICE_ALERT_PCT) continue;
    if (trail.affectedMenus.length === 0) continue;
    const key = `price:${trail.ingredient.id}:${c.entry.id}`;
    if (dismissed.has(key)) continue;
    moves.push({
      type: 'price_move',
      key,
      severity: pct > 0 ? 'warning' : 'info',
      direction: pct > 0 ? 'up' : 'down',
      ingredientId: trail.ingredient.id,
      name: trail.ingredient.name,
      percent: pct,
      displayUnit: c.comparison.displayUnit,
      fromAmount: c.comparison.previousPerDisplayUnit,
      toAmount: c.comparison.currentPerDisplayUnit,
      affected: trail.affectedMenus,
      to: `/kesan-harga?bahan=${trail.ingredient.id}`,
    });
  }
  moves.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent) || a.name.localeCompare(b.name, 'ms'));
  insights.push(...moves);

  if (incomplete.length > 0) {
    const refs = incomplete.map((m) => ({ id: m.menuId, name: m.name }));
    insights.push({ type: 'incomplete', severity: 'info', menus: refs, to: refs.length === 1 ? `/menu/${refs[0]!.id}` : '/menu' });
  }

  return { menuCount: menus.length, ranking, incomplete, insights, summary: summariseMenus(ranking, incomplete.length) };
}
