import type { StatusCode } from '../domain';
import type { CostingData } from '../db';
import { t } from '../i18n/ms';
import { computeAllMenus } from './menuAssembly';
import type { IncompleteMenu } from './insights';

/**
 * Laporan reads the shared engine result and only arranges it (Doc 02 §16). No formula lives here, and menus with
 * different volumes are never added together, so there is deliberately no "total profit" figure.
 */
export interface ReportRow {
  menuId: string;
  name: string;
  sellingPrice: number;
  ingredients: number;
  packaging: number;
  labour: number;
  utilities: number;
  sharedOperating: number;
  other: number;
  fullCost: number;
  profit: number;
  marginPct: number;
  status: StatusCode;
}

export interface Report {
  menus: ReportRow[];
  incomplete: IncompleteMenu[];
  byStatus: Record<StatusCode, number>;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' });

export function buildReport(data: CostingData): Report {
  const menus: ReportRow[] = [];
  const incomplete: IncompleteMenu[] = [];
  const byStatus: Record<StatusCode, number> = { loss: 0, low: 0, watch: 0, healthy: 0 };
  for (const { menu, result } of computeAllMenus(data).values()) {
    if (!menu.active) continue;
    if (!result.complete) {
      incomplete.push({ menuId: menu.menuId, name: menu.name, issues: result.issues });
      continue;
    }
    const p = result.perPortion;
    byStatus[result.status]++;
    menus.push({
      menuId: menu.menuId,
      name: menu.name,
      sellingPrice: menu.sellingPrice,
      ingredients: p.ingredients,
      packaging: p.packaging,
      labour: p.labour,
      utilities: p.utilities,
      sharedOperating: p.sharedOperating,
      other: p.other,
      fullCost: result.fullCost,
      profit: result.profit,
      marginPct: result.marginPct,
      status: result.status,
    });
  }
  return { menus: menus.sort(byName), incomplete: incomplete.sort(byName), byStatus };
}

/** One CSV cell. Text starting with a formula character is prefixed so a spreadsheet never runs a user-typed name. */
export function csvCell(text: string): string {
  let s = text;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Plain machine-readable numbers: dot decimal, ASCII minus, never "-0.00". */
const num = (value: number, decimals: number): string => {
  const s = value.toFixed(decimals);
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
};

export function menuReportCsv(report: Report): string {
  const header = ['Menu', 'Harga Jual (RM)', 'Bahan (RM)', 'Pembungkusan (RM)', 'Masa (RM)', 'Utiliti Pengeluaran (RM)', 'Kos Operasi Bersama (RM)', 'Kos Lain (RM)', 'Kos Sebenar (RM)', 'Anggaran Untung (RM)', 'Margin (%)', 'Status'];
  const lines = [header.join(',')];
  for (const r of report.menus) {
    lines.push([
      csvCell(r.name), num(r.sellingPrice, 2), num(r.ingredients, 2), num(r.packaging, 2), num(r.labour, 2), num(r.utilities, 2),
      num(r.sharedOperating, 2), num(r.other, 2), num(r.fullCost, 2), num(r.profit, 2), num(r.marginPct, 1), csvCell(t(`status.${r.status}`)),
    ].join(','));
  }
  for (const m of report.incomplete) lines.push([csvCell(m.name), '', '', '', '', '', '', '', '', '', '', 'Belum lengkap'].join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}
