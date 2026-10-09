/** Browser plumbing for backups. Everything is best-effort: a blocked storage API never stops the app. */

const KEY = 'untunglab.lastBackupAt';

export function lastBackupAt(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function markBackup(at: Date): void {
  try {
    localStorage.setItem(KEY, at.toISOString());
  } catch {
    /* private mode or blocked storage: the reminder simply keeps showing */
  }
}

export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `untunglab-sandaran-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/**
 * Touch devices get the share sheet (so "Save to Files" works in an installed iPhone app); everything else
 * gets a normal download. Returns false if the user dismissed the share sheet.
 */
export async function saveBackupFile(name: string, data: string | Uint8Array<ArrayBuffer>, mime = 'application/json'): Promise<boolean> {
  const file = new File([data], name, { type: mime });
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (touch && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false;
      // fall through to a plain download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export type Persistence = 'persisted' | 'not_persisted' | 'unsupported';

export async function persistenceState(): Promise<Persistence> {
  try {
    if (!navigator.storage?.persisted) return 'unsupported';
    return (await navigator.storage.persisted()) ? 'persisted' : 'not_persisted';
  } catch {
    return 'unsupported';
  }
}

/** Asks the browser not to evict our data. Safe to call repeatedly; the browser may say no. */
export async function requestPersistence(): Promise<Persistence> {
  try {
    if (!navigator.storage?.persist) return 'unsupported';
    return (await navigator.storage.persist()) ? 'persisted' : 'not_persisted';
  } catch {
    return 'unsupported';
  }
}
