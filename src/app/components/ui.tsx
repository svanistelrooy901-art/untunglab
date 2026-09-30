import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { t } from '../../i18n/ms';

export const btnPrimary =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50';
export const btnSecondary =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50';
export const btnQuiet = 'inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-medium text-primary hover:bg-primary-soft';

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border-strong bg-surface p-6 text-center">
      <div className="text-base font-semibold">{title}</div>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Loading() {
  return <p className="mt-6 text-sm text-muted">{t('common.memuatkan')}</p>;
}

/** Visible label always (Doc 04 §10: no placeholder-only forms). */
export function Field({
  label,
  error,
  hint,
  tip,
  ...input
}: { label: string; error?: string | undefined; hint?: string; tip?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {tip && <InfoTip text={tip} label={label} />}
      </div>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined}
        className={`mt-1 min-h-11 w-full rounded-xl border bg-surface px-3 text-base ${error ? 'border-loss' : 'border-border-strong'}`}
        {...input}
      />
      {error ? (
        <p id={`${id}-e`} className="mt-1 text-sm font-medium text-loss">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-h`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Tap-to-open help; never relies on hover (Doc 04 §6). */
export function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${t('common.maklumat')}: ${label}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-11 items-center justify-center text-muted hover:text-primary"
      >
        <span className="inline-flex size-5 items-center justify-center rounded-full border border-current text-xs font-semibold">i</span>
      </button>
      {open && (
        <span id={id} role="note" className="absolute top-10 left-0 z-20 w-64 rounded-xl border border-border bg-surface p-3 text-sm text-muted shadow-md">
          {text}
        </span>
      )}
    </span>
  );
}

/** Native dialog: focus trap, Escape to close, and a bottom sheet on phones. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-ink backdrop:bg-black/40 md:m-auto md:max-w-lg md:rounded-3xl"
    >
      {open && (
        <div className="px-5 pt-5 pb-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            <button type="button" onClick={onClose} className={btnQuiet}>
              {t('common.tutup')}
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'watch' | 'healthy' }) {
  const tones = {
    neutral: 'border-border bg-canvas text-muted',
    watch: 'border-watch-line bg-watch-soft text-watch',
    healthy: 'border-healthy-line bg-healthy-soft text-healthy',
  } as const;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
