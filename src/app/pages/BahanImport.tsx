import { useState } from 'react';
import { Link } from 'react-router-dom';
import { applyIngredientImport, listIngredients } from '../../db';
import { formatRM } from '../../domain';
import { t } from '../../i18n/ms';
import { saveBackupFile } from '../backupFile';
import { Badge, Sheet, btnPrimary, btnSecondary } from '../components/ui';
import { useData } from '../data';
import { buildTemplate, parseCsv, parseWorkbook, planImport, type ImportPlan } from '../ingredientImport';
import { useLicense } from '../license';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Import Excel for Bahan (D-87): full version only; preview with problem rows before anything is saved. */
export function ImportExcel() {
  const { plan: licence } = useLicense();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btnSecondary} onClick={() => setOpen(true)}>{t('bahan.importTombol')}</button>
      <Sheet open={open} title={t('bahan.importTajuk')} onClose={() => setOpen(false)}>
        {open && (licence === 'pro' ? <ImportBody onDone={() => setOpen(false)} /> : (
          <div className="mt-3 text-sm">
            <p>{t('bahan.importPro')}</p>
            <Link to="/lesen" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline">{t('lesen.naiktaraf')}</Link>
          </div>
        ))}
      </Sheet>
    </>
  );
}

function ImportBody({ onDone }: { onDone: () => void }) {
  const ctx = useData();
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const units = t('form.unitOptions').split(',');

  async function downloadTemplate() {
    const rows = t('bahan.importContoh').split(';').map((x) => {
      const [name = '', unit = ''] = x.split('|');
      return { name, unit };
    });
    const bytes = buildTemplate({ headers: t('bahan.importKepala').split(','), units, rows });
    await saveBackupFile(t('bahan.importFailNama'), bytes as Uint8Array<ArrayBuffer>, XLSX);
  }

  async function pick(file: File | undefined) {
    setResult(null);
    setError(false);
    setPlan(null);
    if (!file) return;
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
      const rows = isZip ? parseWorkbook(buf) : parseCsv(new TextDecoder().decode(buf));
      if (rows.length === 0) throw new Error('empty');
      const existing = await listIngredients(ctx, { includeInactive: true });
      setPlan(planImport(rows, { units, existing }));
    } catch {
      setError(true);
    }
  }

  async function confirm() {
    if (!plan || plan.rows.length === 0) return;
    setBusy(true);
    const r = await applyIngredientImport(ctx, plan.rows);
    setBusy(false);
    setPlan(null);
    setResult(`${t('bahan.importSiap').replace('{baharu}', String(r.created)).replace('{kemas}', String(r.updated))}${r.failed.length > 0 ? ` ${t('bahan.importGagal').replace('{n}', String(r.failed.length))}` : ''}`);
  }

  return (
    <div className="mt-3 text-sm" data-testid="import-excel">
      <p>{t('bahan.importLangkah1')}</p>
      <button type="button" className={`${btnSecondary} mt-2`} onClick={() => void downloadTemplate()}>{t('bahan.importTemplat')}</button>
      <p className="mt-4">{t('bahan.importLangkah2')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className={`${btnSecondary} relative cursor-pointer focus-within:ring-2 focus-within:ring-primary`}>
          {t('bahan.importFail')}
          <input
            type="file"
            accept=".xlsx,.csv,text/csv"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileName(f?.name ?? '');
              void pick(f);
            }}
          />
        </label>
        {fileName && <span className="min-w-0 truncate text-muted" data-testid="import-nama-fail">{fileName}</span>}
      </div>
      {error && <p role="alert" className="mt-3 font-medium text-loss">{t('bahan.importRosak')}</p>}
      {result && <p role="status" className="mt-3 rounded-xl bg-primary-soft p-3 font-semibold text-primary">✓ {result}</p>}
      {plan && <Preview plan={plan} busy={busy} onConfirm={() => void confirm()} />}
      {result && <button type="button" className={`${btnPrimary} mt-3`} onClick={onDone}>{t('common.tutup')}</button>}
    </div>
  );
}

function Preview({ plan, busy, onConfirm }: { plan: ImportPlan; busy: boolean; onConfirm: () => void }) {
  const created = plan.rows.filter((r) => r.action === 'create').length;
  const updated = plan.rows.length - created;
  return (
    <div className="mt-4" data-testid="import-pratonton">
      <p className="font-semibold">{t('bahan.importRingkas')}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-muted">{t('bahan.importBaharu')}</dt><dd className="text-right font-semibold">{created}</dd>
        <dt className="text-muted">{t('bahan.importKemas')}</dt><dd className="text-right font-semibold">{updated}</dd>
        <dt className="text-muted">{t('bahan.importTiada')}</dt><dd className="text-right font-semibold">{plan.unchanged}</dd>
        <dt className="text-muted">{t('bahan.importLangkau')}</dt><dd className="text-right font-semibold">{plan.blank + plan.notFilled}</dd>
        <dt className="text-muted">{t('bahan.importMasalah')}</dt><dd className={`text-right font-semibold ${plan.problems.length > 0 ? 'text-loss' : ''}`}>{plan.problems.length}</dd>
      </dl>
      {plan.rows.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {plan.rows.map((r) => (
            <li key={r.row} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.name}</span>
                <span className="block text-xs text-muted">{formatRM(r.price)} / {r.qty} {r.unit}</span>
              </span>
              <Badge>{r.action === 'create' ? t('bahan.importBadgeBaharu') : t('bahan.importBadgeKemas')}</Badge>
            </li>
          ))}
        </ul>
      )}
      {plan.problems.length > 0 && (
        <div className="mt-3 rounded-xl border border-loss-line bg-loss-soft p-3 text-loss" data-testid="import-masalah">
          <p className="text-xs">{t('bahan.importMasalahNota')}</p>
          <ul className="mt-2 space-y-1">
            {plan.problems.map((p) => (
              <li key={p.row}>{t('bahan.importBaris')} {p.row}{p.name ? ` (${p.name})` : ''}: {t(`bahan.importErr.${p.reason}`)}</li>
            ))}
          </ul>
        </div>
      )}
      {plan.rows.length === 0 ? (
        <p className="mt-3 text-muted">{t('bahan.importKosong')}</p>
      ) : (
        <button type="button" disabled={busy} className={`${btnPrimary} mt-3`} onClick={onConfirm}>{t('bahan.importSahkan').replace('{n}', String(plan.rows.length))}</button>
      )}
    </div>
  );
}
