/**
 * Builds the price list sent to JualanLab (D-96, format in spec/LINK-FORMAT.md).
 * Every margin and status is the engine's own result (`menuSummary`); nothing is worked out here.
 */
import { menuSummary } from '../domain';
import { ringgitToSen, roundMargin, validatePriceList, type LinkError, type PriceList, type PriceListMenu } from '../link';
import type { CostedMenu } from './menuAssembly';

/** Malaysia is UTC+8 all year (no daylight saving). */
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

/** ISO 8601 in Malaysian time with its offset, to the second: 2026-10-14T20:42:05+08:00. */
export function malaysiaDateTime(now: Date): string {
  return new Date(now.getTime() + MYT_OFFSET_MS).toISOString().slice(0, 19) + '+08:00';
}

/** Today's date in Malaysia, YYYY-MM-DD. */
export function malaysiaDate(now: Date): string {
  return malaysiaDateTime(now).slice(0, 10);
}

/** The list failed the format's own check. Names the menu so the screen can say which one to fix. */
export class PriceListBuildError extends Error {
  constructor(
    readonly error: LinkError,
    readonly menuId: string | null,
    readonly menuName: string | null,
  ) {
    super(`price list is not valid: ${error.code}${error.path ? ' at ' + error.path : ''}`);
    this.name = 'PriceListBuildError';
  }
}

/**
 * One entry per active menu (variations included). An incomplete menu, or one without a price, goes with
 * `marginPct: null` and `status: null`, never a guessed number. A variation keeps `baseMenuId` only when its base is in
 * the same list; otherwise it travels as a standalone menu.
 */
export function buildPriceList(costed: Map<string, CostedMenu>, now: Date): PriceList {
  const active = [...costed.values()].filter((c) => c.menu.active);
  const sent = new Map(active.map((c) => [c.menu.id, c.menu]));

  const menus: PriceListMenu[] = active.map(({ menu, result }) => {
    const priceSen = ringgitToSen(menu.sellingPrice);
    // The format allows no margin without a price; a menu at RM0 is reported incomplete by the engine anyway.
    const summary = priceSen > 0 ? menuSummary(result) : null;
    const base = menu.baseMenuId ? sent.get(menu.baseMenuId) : undefined;
    return {
      id: menu.id,
      name: menu.name,
      category: menu.category ?? null,
      priceSen,
      marginPct: summary ? roundMargin(summary.marginPct) : null,
      status: summary ? summary.status : null,
      baseMenuId: base && !base.baseMenuId ? base.id : null,
    };
  });

  const list: PriceList = { app: 'untunglab', kind: 'price-list', format: 1, sentAt: malaysiaDateTime(now), currency: 'MYR', menus };
  const checked = validatePriceList(list);
  if (!checked.ok) {
    const at = /^menus\[(\d+)\]/.exec(checked.error.path ?? '');
    const menu = at ? menus[Number(at[1])] : undefined;
    throw new PriceListBuildError(checked.error, menu?.id ?? null, menu?.name ?? null);
  }
  return checked.value;
}
