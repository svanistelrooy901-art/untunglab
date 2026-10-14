import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import qrcode from 'qrcode-generator';
import { formatQuantity } from '../../domain';
import { loadCostingData } from '../../db';
import { t } from '../../i18n/ms';
import { QR_MAX_LINK_CHARS, fitsInQr, priceListFileName, priceListFileText, priceListLink, type PriceList } from '../../link';
import { saveBackupFile } from '../backupFile';
import { EmptyState, Loading, PageHeader, btnPrimary, btnSecondary } from '../components/ui';
import { useLive } from '../data';
import { computeAllMenus } from '../menuAssembly';
import { PriceListBuildError, buildPriceList } from '../priceListBuild';

type Built = { kind: 'empty' } | { kind: 'ok'; list: PriceList; link: string } | { kind: 'error'; error: PriceListBuildError };

/** Send to JualanLab (D-96): the active menus as a link, a QR code (short lists) or a file. Nothing is stored or uploaded. */
export function HantarJualanLabPage() {
  const data = useLive((c) => loadCostingData(c));
  // Rebuilt only when the data changes, so the link (and its sentAt) stays put while the screen is open.
  const built = useMemo((): Built | null => {
    if (!data) return null;
    const costed = computeAllMenus(data);
    if (![...costed.values()].some((c) => c.menu.active)) return { kind: 'empty' };
    try {
      const list = buildPriceList(costed, new Date());
      return { kind: 'ok', list, link: priceListLink(list) };
    } catch (e) {
      if (e instanceof PriceListBuildError) return { kind: 'error', error: e };
      throw e;
    }
  }, [data]);

  if (!built) return <Loading />;
  return (
    <section>
      <PageHeader title={t('hantar.title')} />
      <p className="mt-1 text-sm text-muted">{t('hantar.intro')}</p>
      <p className="mt-3 rounded-xl border border-watch-line bg-watch-soft p-3 text-sm font-semibold text-watch" data-testid="jualanlab-belum-lancar">
        {t('jualanlab.belumLancar')}
      </p>
      {built.kind === 'empty' ? (
        <EmptyState title={t('hantar.kosongTajuk')} body={t('hantar.kosongIsi')} action={<Link to="/menu/baru" className={btnPrimary}>{t('menu.tambah')}</Link>} />
      ) : built.kind === 'error' ? (
        <BuildError error={built.error} />
      ) : (
        <SendPanel list={built.list} link={built.link} />
      )}
    </section>
  );
}

function BuildError({ error }: { error: PriceListBuildError }) {
  const path = error.error.path ?? '';
  const field = path.endsWith('.name')
    ? t('hantar.medanNama')
    : path.endsWith('.category')
      ? t('hantar.medanKategori')
      : path.endsWith('.priceSen')
        ? t('hantar.medanHarga')
        : t('hantar.medanLain');
  return (
    <div role="alert" className="mt-4 rounded-2xl border border-loss-line bg-loss-soft p-4 text-sm text-loss" data-testid="hantar-ralat">
      <p className="font-semibold">{t('hantar.ralat')}</p>
      {error.menuName !== null ? (
        <p className="mt-1">
          {t('hantar.ralatMenu').replace('{name}', error.menuName.length > 60 ? `${error.menuName.slice(0, 60)}…` : error.menuName).replace('{field}', field)}{' '}
          {error.menuId && <Link to={`/menu/${error.menuId}`} className="font-semibold underline">{t('menu.tajukEdit')}</Link>}
        </p>
      ) : path === 'menus' ? (
        <p className="mt-1">{t('hantar.terlaluBanyak')}</p>
      ) : null}
      <p className="mt-2 font-mono text-xs text-muted">{error.error.code} {path}</p>
    </div>
  );
}

function SendPanel({ list, link }: { list: PriceList; link: string }) {
  const [copy, setCopy] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [showQr, setShowQr] = useState(false);
  const [file, setFile] = useState<'idle' | 'ok' | 'fail'>('idle');
  const incomplete = list.menus.filter((m) => m.marginPct === null).length;
  const qrOk = fitsInQr(link);
  const fileName = priceListFileName(list.sentAt);

  async function copyLink() {
    setCopy('idle');
    try {
      await navigator.clipboard.writeText(link);
      setCopy('ok');
    } catch {
      setCopy('fail');
    }
  }

  async function saveFile() {
    setFile('idle');
    try {
      if (await saveBackupFile(fileName, priceListFileText(list), 'application/json')) setFile('ok');
    } catch {
      setFile('fail');
    }
  }

  return (
    <>
      <div className="mt-4 rounded-2xl border border-border bg-surface p-4" data-testid="hantar-ringkasan">
        <p className="text-base font-bold">{t('hantar.bilMenu').replace('{n}', String(list.menus.length))}</p>
        {incomplete > 0 ? (
          <p className="mt-1 text-sm font-medium text-watch">{t('hantar.bilBelum').replace('{n}', String(incomplete))}</p>
        ) : (
          <p className="mt-1 text-sm text-muted">{t('hantar.semuaLengkap')}</p>
        )}
        <p className="mt-3 text-sm text-muted">{t('hantar.internet')}</p>
        <p className="mt-1 text-xs text-muted">{t('hantar.tiadaPelayan')}</p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div>
          <a href={link} target="_blank" rel="noopener" className={`${btnPrimary} w-full`}>
            {t('hantar.buka')}
          </a>
          <p className="mt-1 text-xs text-muted">{t('hantar.bukaNota')}</p>
        </div>

        <button type="button" className={`${btnSecondary} w-full`} onClick={() => void copyLink()}>
          {t('hantar.salin')}
        </button>
        {copy === 'ok' && <p role="status" className="text-sm font-medium text-healthy">✓ {t('hantar.disalin')}</p>}
        {copy === 'fail' && (
          <div role="alert">
            <p className="text-sm font-medium text-loss">{t('hantar.salinGagal')}</p>
            <textarea readOnly value={link} rows={4} onFocus={(e) => e.currentTarget.select()} className="mt-2 w-full rounded-xl border border-border-strong bg-surface p-3 font-mono text-xs break-all" />
          </div>
        )}

        {qrOk ? (
          <button type="button" className={`${btnSecondary} w-full`} aria-expanded={showQr} onClick={() => setShowQr((s) => !s)}>
            {showQr ? t('hantar.qrSorok') : t('hantar.qr')}
          </button>
        ) : (
          <p className="rounded-xl bg-watch-soft p-3 text-sm text-watch" data-testid="qr-terlalu-panjang">
            {t('hantar.qrTerlaluPanjang').replace('{n}', formatQuantity(link.length)).replace('{max}', formatQuantity(QR_MAX_LINK_CHARS))}
          </p>
        )}
        {qrOk && showQr && (
          <figure className="mx-auto w-full max-w-[420px] rounded-2xl border border-border bg-white p-3" data-testid="hantar-qr">
            <QrSvg text={link} label={t('hantar.qrLabel')} />
            <figcaption className="mt-2 text-center text-sm text-muted">{t('hantar.qrNota')}</figcaption>
          </figure>
        )}

        <div>
          <button type="button" className={`${btnSecondary} w-full`} onClick={() => void saveFile()}>
            {t('hantar.fail')}
          </button>
          <p className="mt-1 text-xs text-muted">{t('hantar.failNota').replace('{name}', fileName)}</p>
          {file === 'ok' && <p role="status" className="mt-1 text-sm font-medium text-healthy">✓ {t('hantar.failDisimpan')}</p>}
          {file === 'fail' && <p role="alert" className="mt-1 text-sm font-medium text-loss">{t('common.gagalSimpan')}</p>}
        </div>
      </div>
    </>
  );
}

/** QR code as inline SVG (black on white, 4-module quiet zone). Type 0 = smallest version that fits, error level L. */
function QrSvg({ text, label }: { text: string; label: string }) {
  const { size, d } = useMemo(() => {
    const qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 4;
    let path = '';
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!qr.isDark(r, c)) {
          c++;
          continue;
        }
        const start = c;
        while (c < n && qr.isDark(r, c)) c++;
        path += `M${start + quiet} ${r + quiet}h${c - start}v1h-${c - start}z`;
      }
    }
    return { size: n + quiet * 2, d: path };
  }, [text]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges" className="block h-auto w-full">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
