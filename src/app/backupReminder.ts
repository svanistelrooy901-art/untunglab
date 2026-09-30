/** A backup older than this many days gets a gentle reminder on the Dashboard (D-54). */
export const BACKUP_REMINDER_DAYS = 14;

export type BackupReminder = { kind: 'none' } | { kind: 'never' } | { kind: 'stale'; days: number };

export function backupReminder(input: { hasData: boolean; lastBackupAt: string | null; now: Date }): BackupReminder {
  if (!input.hasData) return { kind: 'none' };
  const last = input.lastBackupAt === null ? NaN : Date.parse(input.lastBackupAt);
  if (Number.isNaN(last)) return { kind: 'never' };
  const days = Math.floor((input.now.getTime() - last) / 86_400_000);
  return days >= BACKUP_REMINDER_DAYS ? { kind: 'stale', days } : { kind: 'none' };
}
