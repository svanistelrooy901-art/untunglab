/** What the free version allows (D-58). Existing data above a limit is never deleted; it just blocks adding more. */
export const FREE_LIMITS = { menus: 2, ingredients: 10, packaging: 2 } as const;

export type Plan = 'free' | 'pro';
export type LimitedKind = keyof typeof FREE_LIMITS;

export function canAdd(plan: Plan, kind: LimitedKind, currentCount: number): boolean {
  return plan === 'pro' || currentCount < FREE_LIMITS[kind];
}

export const canUseDetailedOperating = (plan: Plan): boolean => plan === 'pro';

export interface LimitState {
  used: number;
  limit: number | null;
  canAdd: boolean;
}

export function limitState(plan: Plan, kind: LimitedKind, used: number): LimitState {
  return { used, limit: plan === 'pro' ? null : FREE_LIMITS[kind], canAdd: canAdd(plan, kind, used) };
}
