import { useState } from 'react';
import { Lock } from 'lucide-react';

const PASSCODE_KEY = 'daor:passcode';
const UNLOCK_KEY = 'daor:unlocked';
const DEFAULT_PASSCODE = '20102';

export function getPasscode(): string {
  try {
    return localStorage.getItem(PASSCODE_KEY) || DEFAULT_PASSCODE;
  } catch {
    return DEFAULT_PASSCODE;
  }
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return true;
  }
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === getPasscode()) {
      try {
        sessionStorage.setItem(UNLOCK_KEY, '1');
      } catch {
        /* ignore */
      }
      onUnlock();
    } else {
      setError(true);
      setValue('');
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-notion-bg p-6 text-notion-text dark:bg-notion-bg-dark dark:text-notion-text-dark">
      <form onSubmit={submit} className="w-full max-w-xs text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-notion-accent/10 text-notion-accent">
          <Lock size={26} />
        </div>
        <h1 className="mb-1 text-lg font-bold">DAOR</h1>
        <p className="mb-4 text-sm text-notion-muted">Saisissez votre code d'accès.</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          placeholder="••••"
          className={`w-full rounded-lg border bg-transparent px-3 py-2.5 text-center text-lg tracking-widest outline-none ${error ? 'border-red-500' : 'border-notion-border dark:border-notion-border-dark'}`}
        />
        {error && <p className="mt-2 text-sm text-red-600">Code incorrect.</p>}
        <button type="submit" className="mt-4 w-full rounded-lg bg-notion-accent py-2.5 text-sm font-semibold text-white">
          Déverrouiller
        </button>
      </form>
    </div>
  );
}
