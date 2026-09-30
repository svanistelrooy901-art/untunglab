import { Link } from 'react-router-dom';
import { t } from '../../i18n/ms';
import type { LimitState } from '../../license/entitlement';

/** Usage counter for the free plan, and the upgrade prompt once the limit is reached. Renders nothing on the full version. */
export function LimitNote({ state }: { state: LimitState }) {
  if (state.limit === null) return null;
  return (
    <div className="mt-3 rounded-xl bg-primary-soft px-3 py-2 text-sm" data-testid="limit-note">
      <span className="font-medium">{t('lesen.penggunaan').replace('{used}', String(state.used)).replace('{limit}', String(state.limit))}</span>
      {!state.canAdd && (
        <>
          <p className="mt-1 text-muted">{t('lesen.penuhIsi')}</p>
          <Link to="/lesen" className="mt-1 inline-flex min-h-11 items-center font-semibold text-primary underline">
            {t('lesen.naiktaraf')}
          </Link>
        </>
      )}
    </div>
  );
}
