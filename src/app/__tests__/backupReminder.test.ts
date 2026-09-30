import { describe, expect, it } from 'vitest';
import { BACKUP_REMINDER_DAYS, backupReminder } from '../backupReminder';

const now = new Date('2026-09-30T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

describe('backup reminder', () => {
  it('says nothing while there is nothing worth saving', () => {
    expect(backupReminder({ hasData: false, lastBackupAt: null, now })).toEqual({ kind: 'none' });
  });
  it('a device with data and no backup yet is told so', () => {
    expect(backupReminder({ hasData: true, lastBackupAt: null, now })).toEqual({ kind: 'never' });
  });
  it('a recent backup is quiet; an old one reports its age', () => {
    expect(backupReminder({ hasData: true, lastBackupAt: daysAgo(BACKUP_REMINDER_DAYS - 1), now })).toEqual({ kind: 'none' });
    expect(backupReminder({ hasData: true, lastBackupAt: daysAgo(BACKUP_REMINDER_DAYS), now })).toEqual({ kind: 'stale', days: BACKUP_REMINDER_DAYS });
    expect(backupReminder({ hasData: true, lastBackupAt: daysAgo(40), now })).toEqual({ kind: 'stale', days: 40 });
  });
  it('an unreadable date counts as never backed up', () => {
    expect(backupReminder({ hasData: true, lastBackupAt: 'garbage', now })).toEqual({ kind: 'never' });
  });
  it('is 14 days', () => expect(BACKUP_REMINDER_DAYS).toBe(14));
});
