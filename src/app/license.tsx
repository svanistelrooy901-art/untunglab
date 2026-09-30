import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getActivation, getDeviceId } from '../db';
import { LICENSE_PUBLIC_KEY } from '../license/config';
import { limitState, type LimitedKind, type LimitState, type Plan } from '../license/entitlement';
import { verifyLicense } from '../license/token';
import { useLive } from './data';

interface LicenseInfo {
  /** 'pro' only while a stored token verifies for this device with the embedded public key. Anything else is free. */
  plan: Plan;
  /** False until the first check finishes; gating waits so a paid user never sees a flash of locked screens. */
  ready: boolean;
  deviceId: string | null;
  codeHint: string | null;
}

const Ctx = createContext<LicenseInfo>({ plan: 'free', ready: false, deviceId: null, codeHint: null });

export function LicenseProvider({ children }: { children: ReactNode }) {
  const deviceId = useLive((c) => getDeviceId(c));
  const activation = useLive((c) => getActivation(c).then((a) => a ?? null));
  const [info, setInfo] = useState<LicenseInfo>({ plan: 'free', ready: false, deviceId: null, codeHint: null });

  useEffect(() => {
    if (deviceId === undefined || activation === undefined) return;
    let live = true;
    (async () => {
      let plan: Plan = 'free';
      if (activation && deviceId && LICENSE_PUBLIC_KEY) {
        const r = await verifyLicense(activation.token, LICENSE_PUBLIC_KEY, deviceId).catch(() => null);
        if (r && r.ok) plan = 'pro';
      }
      if (live) setInfo({ plan, ready: true, deviceId: deviceId ?? null, codeHint: plan === 'pro' ? (activation?.codeHint ?? null) : null });
    })();
    return () => {
      live = false;
    };
  }, [deviceId, activation]);

  return <Ctx.Provider value={info}>{children}</Ctx.Provider>;
}

export const useLicense = (): LicenseInfo => useContext(Ctx);

/** Until the licence check finishes we treat the plan as pro for gating so nothing paid is ever wrongly blocked. */
export function useLimit(kind: LimitedKind, used: number): LimitState {
  const { plan, ready } = useLicense();
  return limitState(ready ? plan : 'pro', kind, used);
}
