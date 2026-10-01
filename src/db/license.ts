import { newUuid } from './uuid';
import type { Context } from './repo';
import type { LicenseRow } from './types';

/**
 * Device identity and activation live in their own table, outside backups. Restoring a backup on a new phone
 * therefore never copies another phone's identity or licence (D-56).
 */
export async function getDeviceId(ctx: Context): Promise<string | null> {
  const row = await ctx.db.license.get('device');
  return row && row.id === 'device' ? row.deviceId : null;
}

/** Creates the id on first use. Writes, so call it at startup, never inside a live query. */
export async function ensureDeviceId(ctx: Context): Promise<string> {
  return ctx.db.transaction('rw', ctx.db.license, async () => {
    const existing = await getDeviceId(ctx);
    if (existing) return existing;
    const deviceId = newUuid();
    await ctx.db.license.put({ id: 'device', deviceId, createdAt: ctx.now().toISOString() });
    return deviceId;
  });
}

export async function getActivation(ctx: Context): Promise<Extract<LicenseRow, { id: 'activation' }> | null> {
  const row = await ctx.db.license.get('activation');
  return row && row.id === 'activation' ? row : null;
}

export async function saveActivation(ctx: Context, input: { token: string; codeHint: string }): Promise<void> {
  await ctx.db.license.put({ id: 'activation', token: input.token, codeHint: input.codeHint, activatedAt: ctx.now().toISOString() });
}

export async function clearActivation(ctx: Context): Promise<void> {
  await ctx.db.license.delete('activation');
}
