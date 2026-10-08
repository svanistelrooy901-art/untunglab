import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clearActivation, saveActivation } from '../../db';
import { t } from '../../i18n/ms';
import { activateDevice, releaseDevice, type ActivateError, type DeviceInfo } from '../../license/client';
import { normaliseCode } from '../../license/code';
import { BUY_URL, LICENSE_API_URL } from '../../license/config';
import { Field, PageHeader, btnPrimary, btnQuiet, btnSecondary } from '../components/ui';
import { useData } from '../data';
import { useLicense } from '../license';

const ERROR_TEXT: Record<Exclude<ActivateError, 'device_limit'>, Parameters<typeof t>[0]> = {
  invalid_code: 'lesen.kodTakSah',
  revoked: 'lesen.kodBatal',
  rate_limited: 'lesen.terlaluBanyak',
  network: 'lesen.rangkai',
  server: 'lesen.pelayan',
  bad_response: 'lesen.responsTakSah',
};

function deviceLabel(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Peranti';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : '';
  return `${os}${browser ? ` · ${browser}` : ''}`;
}

export function LesenPage() {
  const ctx = useData();
  const { plan, ready, deviceId, codeHint } = useLicense();
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => params.get('kod') ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[] | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);

  const configured = LICENSE_API_URL !== null;
  const pro = plan === 'pro';

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    if (!LICENSE_API_URL || !deviceId || busy) return;
    setBusy(true);
    setMessage(null);
    setDevices(null);
    const r = await activateDevice(LICENSE_API_URL, code, deviceId, deviceLabel());
    if (r.ok) {
      await saveActivation(ctx, { token: r.token, codeHint: r.codeHint });
      setCode('');
      setMessage({ kind: 'ok', text: t('lesen.berjaya') });
    } else if (r.error === 'device_limit') {
      setDevices(r.devices);
      setMessage({ kind: 'error', text: t('lesen.had') });
    } else {
      setMessage({ kind: 'error', text: t(ERROR_TEXT[r.error]) });
    }
    setBusy(false);
  }

  async function release(e: React.FormEvent) {
    e.preventDefault();
    if (!LICENSE_API_URL || !deviceId || busy) return;
    setBusy(true);
    setMessage(null);
    const r = await releaseDevice(LICENSE_API_URL, code, deviceId);
    if (r.ok) {
      await clearActivation(ctx);
      setCode('');
      setConfirmRelease(false);
      setMessage({ kind: 'ok', text: t('lesen.lepasBerjaya') });
    } else {
      setMessage({ kind: 'error', text: r.error === 'invalid_code' ? t('lesen.kodTakSah') : r.error === 'network' ? t('lesen.rangkai') : t('lesen.lepasGagal') });
    }
    setBusy(false);
  }

  return (
    <section>
      <PageHeader title={t('lesen.title')} />
      <div className="mt-4 rounded-2xl border border-border bg-surface p-4" data-testid="plan-card">
        <p className="text-sm font-bold" data-testid="plan-name">
          {!ready ? t('common.memuatkan') : pro ? `✓ ${t('lesen.pelanPro')}` : t('lesen.pelanPercuma')}
        </p>
        <p className="mt-1 text-sm text-muted">
          {pro ? t('lesen.proIsi') : t('lesen.percumaIsi')}
        </p>
        {pro && codeHint && <p className="mt-1 text-xs text-muted">{t('lesen.kodHint').replace('{hint}', codeHint)}</p>}
      </div>

      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm font-medium ${message.kind === 'error' ? 'text-loss' : 'text-healthy'}`}>
          {message.kind === 'ok' ? '✓ ' : ''}
          {message.text}
        </p>
      )}
      {devices && devices.length > 0 && (
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border text-sm">
          {devices.map((d, i) => (
            <li key={i} className="flex justify-between gap-2 px-3 py-2">
              <span>{d.label}</span>
              <span className="text-muted">{d.activatedAt.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}

      {!configured ? (
        <p className="mt-4 text-sm text-muted">{t('lesen.belumSedia')}</p>
      ) : !pro ? (
        <>
          <form onSubmit={activate} noValidate className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-sm font-bold">{t('lesen.tajukAktif')}</h2>
            <Field
              label={t('lesen.kodLabel')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('lesen.kodContoh')}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <p className="text-xs text-muted">{t('lesen.perluInternet')}</p>
            <button type="submit" className={`${btnPrimary} mt-3`} disabled={busy || !ready || normaliseCode(code) === null}>
              {busy ? t('lesen.mengaktifkan') : t('lesen.aktifkan')}
            </button>
          </form>
          {BUY_URL && (
            <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
              <a href={BUY_URL} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                {t('lesen.beli')}
              </a>
              <p className="mt-2 text-xs text-muted">{t('lesen.beliNota')}</p>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          {!confirmRelease ? (
            <>
              <button type="button" className={btnQuiet} onClick={() => setConfirmRelease(true)}>
                {t('lesen.lepas')}
              </button>
              <p className="text-xs text-muted">{t('lesen.lepasNota')}</p>
            </>
          ) : (
            <form onSubmit={release} noValidate>
              <Field label={t('lesen.kodLabel')} value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('lesen.kodContoh')} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="submit" className={btnPrimary} disabled={busy || normaliseCode(code) === null}>
                  {t('lesen.lepasSahkan')}
                </button>
                <button type="button" className={btnSecondary} onClick={() => (setConfirmRelease(false), setCode(''))}>
                  {t('common.batal')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">{t('lesen.nota')}</p>
    </section>
  );
}
