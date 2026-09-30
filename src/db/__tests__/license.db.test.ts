import { describe, expect, it } from 'vitest';
import { createBackup } from '../backup';
import { clearActivation, ensureDeviceId, getActivation, getDeviceId, saveActivation } from '../license';
import { restoreBackup, backupToText } from '../backup';
import { createIngredient } from '../repo';
import { freshContext } from './helpers';

describe('device and activation storage', () => {
  it('the device id is created once and stays the same', async () => {
    const { ctx } = freshContext();
    expect(await getDeviceId(ctx)).toBeNull(); // read-only getter never creates
    const a = await ensureDeviceId(ctx);
    const b = await ensureDeviceId(ctx);
    expect(a).toBe(b);
    expect(await getDeviceId(ctx)).toBe(a);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });
  it('an activation can be saved, read and cleared', async () => {
    const { ctx } = freshContext('2026-09-30T08:00:00');
    expect(await getActivation(ctx)).toBeNull();
    await saveActivation(ctx, { token: 'a.b', codeHint: 'K3M7' });
    expect(await getActivation(ctx)).toMatchObject({ token: 'a.b', codeHint: 'K3M7' });
    await saveActivation(ctx, { token: 'c.d', codeHint: 'K3M7' });
    expect((await getActivation(ctx))?.token).toBe('c.d');
    await clearActivation(ctx);
    expect(await getActivation(ctx)).toBeNull();
  });
  it('licence and device id are never part of a backup, and a restore leaves them alone', async () => {
    const { ctx, db } = freshContext();
    const deviceId = await ensureDeviceId(ctx);
    await saveActivation(ctx, { token: 'a.b', codeHint: 'K3M7' });
    await createIngredient(ctx, { name: 'Ayam', purchasePrice: 15, packageQuantity: 1, packageUnit: 'kg' });
    const backup = await createBackup(ctx);
    expect(Object.keys(backup.data)).not.toContain('license');
    expect(JSON.stringify(backup)).not.toContain('a.b');
    await restoreBackup(ctx, backupToText(backup));
    expect(await getDeviceId(ctx)).toBe(deviceId);
    expect((await getActivation(ctx))?.token).toBe('a.b');
    expect(await db.license.count()).toBe(2);
  });
  it('opening a version-1 database upgrades it without losing data', async () => {
    const { UntungLabDB } = await import('../db');
    const name = `upgrade-${Math.random()}`;
    // Simulate a v1 database created by the earlier app.
    const Dexie = (await import('dexie')).default;
    const old = new Dexie(name);
    old.version(1).stores({ businesses: 'id', ingredients: 'id, businessId, name, marketItemId, active' });
    await old.open();
    await old.table('ingredients').add({ id: 'i1', businessId: 'b', name: 'Ayam', active: true });
    old.close();
    const upgraded = new UntungLabDB(name);
    await upgraded.open();
    expect(await upgraded.ingredients.count()).toBe(1);
    expect(await upgraded.license.count()).toBe(0);
  });
});
