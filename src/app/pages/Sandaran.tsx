import { useEffect, useState } from 'react';
import { BackupError, backupToText, createBackup, readBackup, restoreBackup, type BackupIssue, type BackupSummary } from '../../db';
import { t, type MsKey } from '../../i18n/ms';
import { PageHeader, Sheet, btnPrimary, btnQuiet, btnSecondary } from '../components/ui';
import { backupFileName, lastBackupAt, markBackup, persistenceState, requestPersistence, saveBackupFile, type Persistence } from '../backupFile';
import { useData } from '../data';

const dateText = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? t('sandaran.tarikhTiada') : d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
};

export function SandaranPage() {
  const ctx = useData();
  const [last, setLast] = useState<string | null>(lastBackupAt());
  const [saved, setSaved] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [picked, setPicked] = useState<{ text: string; summary: BackupSummary } | null>(null);
  const [issues, setIssues] = useState<BackupIssue[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [restored, setRestored] = useState<BackupSummary | null>(null);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [persistence, setPersistence] = useState<Persistence>('unsupported');

  useEffect(() => {
    void persistenceState().then(setPersistence);
  }, []);

  const save = async (): Promise<boolean> => {
    setSaveFailed(false);
    try {
      const now = ctx.now();
      const name = backupFileName(now);
      const done = await saveBackupFile(name, backupToText(await createBackup(ctx)));
      if (done) {
        markBackup(now);
        setLast(now.toISOString());
        setSaved(name);
      }
      return done;
    } catch {
      setSaveFailed(true);
      return false;
    }
  };

  const choose = async (file: File | undefined) => {
    setPicked(null);
    setIssues(null);
    setRestored(null);
    setRestoreFailed(false);
    if (!file) return;
    const text = await file.text();
    const read = await readBackup(text);
    if (read.ok) setPicked({ text, summary: read.summary });
    else setIssues(read.issues);
  };

  const replace = async () => {
    if (!picked) return;
    try {
      setRestored(await restoreBackup(ctx, picked.text));
      setPicked(null);
      setRestoreFailed(false);
    } catch (e) {
      if (e instanceof BackupError) setIssues(e.issues);
      else setRestoreFailed(true);
    }
    setConfirming(false);
  };

  const distinct = issues ? [...new Set(issues.map((i) => i.code))] : [];

  return (
    <section>
      <PageHeader title={t('sandaran.title')} />
      <p className="mt-1 text-sm text-muted">{t('sandaran.intro')}</p>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-base font-bold">{t('sandaran.simpanTajuk')}</h2>
        <p className="mt-1 text-sm text-muted">{t('sandaran.simpanIsi')}</p>
        <p className="mt-2 text-sm font-medium">{last ? t('sandaran.terakhir').replace('{tarikh}', dateText(last)) : t('sandaran.belumPernah')}</p>
        <button type="button" className={`${btnPrimary} mt-3`} onClick={() => void save()}>
          {t('sandaran.simpanBtn')}
        </button>
        {saved && (
          <p role="status" className="mt-3 text-sm font-medium text-healthy">
            <span aria-hidden="true">✓ </span>
            {t('sandaran.disimpan').replace('{nama}', saved)}
          </p>
        )}
        {saveFailed && (
          <p role="alert" className="mt-3 text-sm font-medium text-loss">
            {t('sandaran.gagalSimpan')}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-base font-bold">{t('sandaran.pulihTajuk')}</h2>
        <p className="mt-1 text-sm text-muted">{t('sandaran.pulihIsi')}</p>
        <label className={`${btnSecondary} mt-3 cursor-pointer`}>
          {t('sandaran.pilihFail')}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            data-testid="fail-sandaran"
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

        {distinct.length > 0 && (
          <ul role="alert" className="mt-3 space-y-1 text-sm font-medium text-loss">
            {distinct.map((code) => (
              <li key={code}>✕ {t(`sandaran.isu.${code}` as MsKey)}</li>
            ))}
          </ul>
        )}

        {picked && (
          <div className="mt-3 rounded-xl border border-watch-line bg-watch-soft p-3" data-testid="pratonton">
            <p className="text-sm">
              {t('sandaran.ringkasan')
                .replace('{tarikh}', dateText(picked.summary.exportedAt))
                .replace('{bahan}', String(picked.summary.ingredients))
                .replace('{menu}', String(picked.summary.menus))
                .replace('{pembungkusan}', String(picked.summary.packaging))
                .replace('{alat}', String(picked.summary.equipment))
                .replace('{sejarah}', String(picked.summary.historyRecords))}
            </p>
            <p className="mt-2 text-sm font-semibold">
              <span aria-hidden="true">! </span>
              {t('sandaran.amaran')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} onClick={() => void save()}>
                {t('sandaran.simpanDulu')}
              </button>
              <button type="button" className={btnPrimary} onClick={() => setConfirming(true)}>
                {t('sandaran.ganti')}
              </button>
            </div>
          </div>
        )}
        {restored && (
          <p role="status" className="mt-3 text-sm font-medium text-healthy">
            <span aria-hidden="true">✓ </span>
            {t('sandaran.berjaya').replace('{bahan}', String(restored.ingredients)).replace('{menu}', String(restored.menus)).replace('{sejarah}', String(restored.historyRecords))}
          </p>
        )}
        {restoreFailed && (
          <p role="alert" className="mt-3 text-sm font-medium text-loss">
            {t('sandaran.gagalPulih')}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-base font-bold">{t('sandaran.storanTajuk')}</h2>
        <p className="mt-1 text-sm text-muted">
          {persistence === 'persisted' ? t('sandaran.storanKekal') : persistence === 'not_persisted' ? t('sandaran.storanBelum') : t('sandaran.storanTiada')}
        </p>
        {persistence === 'not_persisted' && (
          <button type="button" className={`${btnSecondary} mt-3`} onClick={() => void requestPersistence().then(setPersistence)}>
            {t('sandaran.storanMohon')}
          </button>
        )}
      </div>

      <Sheet open={confirming} title={t('sandaran.sahTajuk')} onClose={() => setConfirming(false)}>
        <p className="mt-3 text-sm">{t('sandaran.sahIsi')}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" className={btnQuiet} onClick={() => setConfirming(false)}>
            {t('common.batal')}
          </button>
          <button type="button" className={btnPrimary} onClick={() => void replace()}>
            {t('sandaran.sahYa')}
          </button>
        </div>
      </Sheet>
    </section>
  );
}
