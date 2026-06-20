import { useState } from 'react';
import { Github, Loader2, X } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { buildBackupString } from '@/lib/backup';
import { loadGitConfig, pushToGitHub, saveGitConfig } from '@/lib/aura/gitSync';

export function GitSyncModal() {
  const { syncOpen, setSyncOpen } = useUIStore();
  const [config, setConfig] = useState(loadGitConfig);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  if (!syncOpen) return null;

  const push = async () => {
    saveGitConfig(config);
    setLoading(true);
    setError('');
    setResult('');
    try {
      const content = await buildBackupString();
      const url = await pushToGitHub(config, content);
      setResult(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const field = (k: keyof typeof config, label: string, placeholder: string, type = 'text') => (
    <div>
      <div className="mb-1 text-xs font-medium text-notion-muted">{label}</div>
      <input
        type={type}
        value={config[k]}
        onChange={(e) => setConfig({ ...config, [k]: e.target.value })}
        placeholder={placeholder}
        className="w-full rounded border border-notion-border bg-transparent px-2 py-1.5 text-sm outline-none dark:border-notion-border-dark"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSyncOpen(false)}>
      <div className="w-full max-w-md rounded-xl border border-notion-border bg-white p-5 shadow-2xl dark:border-notion-border-dark dark:bg-[#202020]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <Github size={18} />
          <h2 className="text-base font-semibold">Sauvegarde GitHub</h2>
          <button onClick={() => setSyncOpen(false)} className="ml-auto rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"><X size={18} /></button>
        </div>
        <p className="mb-3 text-xs text-notion-muted">
          Commite un instantané JSON dans un dépôt GitHub via l'API (niveau 1 du CDC). Le token (PAT à portée <code>repo</code>) est stocké <b>uniquement en local</b>.
        </p>
        <div className="space-y-2">
          {field('repo', 'Dépôt (owner/repo)', 'mon-compte/mon-coffre')}
          {field('path', 'Chemin du fichier', 'daor-backup.json')}
          {field('token', 'Token GitHub (PAT)', 'github_pat_…', 'password')}
        </div>
        <button onClick={push} disabled={loading} className="mt-3 flex items-center gap-2 rounded-md bg-notion-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />} Sauvegarder maintenant
        </button>
        {result && (
          <p className="mt-3 text-sm text-green-700 dark:text-green-300">
            ✓ Sauvegardé. <a href={result} target="_blank" rel="noreferrer" className="underline">Voir le commit</a>
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
