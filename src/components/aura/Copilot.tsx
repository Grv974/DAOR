import { useState } from 'react';
import { KeyRound, Loader2, Sparkles, Sun, Users, Wand2, X } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useEntityStore } from '@/store/useEntityStore';
import { askCopilot, buildContactContext, buildContext, getApiKey, setApiKey } from '@/lib/aura/ai';

export function Copilot() {
  const { copilotOpen, setCopilotOpen } = useUIStore();
  const entities = useEntityStore((s) => s.entities);
  const [key, setKey] = useState(getApiKey());
  const [keySaved, setKeySaved] = useState(Boolean(getApiKey()));
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contactId, setContactId] = useState('');

  const contacts = Object.values(entities).filter((e) => e.type === 'contact' && !e.archived);

  if (!copilotOpen) return null;

  const saveKey = () => {
    setApiKey(key.trim());
    setKeySaved(Boolean(key.trim()));
  };

  const run = async (userPrompt: string, context: string) => {
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      setAnswer(await askCopilot(userPrompt, context));
    } catch (e) {
      setError((e as Error).message || 'Erreur lors de l’appel.');
    } finally {
      setLoading(false);
    }
  };

  const briefing = () =>
    run(
      "Rédige mon briefing du matin : 3 priorités du jour alignées sur mes objectifs, les contacts à relancer en priorité, et les opportunités à faire avancer. Termine par une phrase d'encouragement.",
      buildContext(),
    );
  const nextAction = () =>
    run('Quelle est la prochaine action la plus utile que je devrais entreprendre maintenant, et pourquoi ? Donne 1 à 3 suggestions classées par impact.', buildContext());
  const prepMeeting = () => {
    const c = entities[contactId];
    if (!c) return;
    run(
      `Prépare-moi une fiche express avant un échange avec ce contact : points clés à retenir, sujets à aborder, promesses à honorer, et une question d'ouverture pertinente.`,
      buildContactContext(c),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setCopilotOpen(false)}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-notion-border bg-white shadow-2xl dark:border-notion-border-dark dark:bg-[#202020]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-notion-border px-4 py-3 dark:border-notion-border-dark">
          <Sparkles size={18} className="text-notion-accent" />
          <h2 className="text-base font-semibold">Copilote IA</h2>
          <button onClick={() => setCopilotOpen(false)} className="ml-auto rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* API key */}
          {!keySaved ? (
            <div className="rounded-lg border border-notion-border p-3 text-sm dark:border-notion-border-dark">
              <div className="mb-2 flex items-center gap-2 font-medium"><KeyRound size={15} /> Clé API Anthropic</div>
              <p className="mb-2 text-xs text-notion-muted">
                Le copilote appelle Claude directement depuis ton navigateur. Ta clé est stockée <b>uniquement en local</b> (localStorage) et n'est envoyée qu'à l'API Anthropic.
              </p>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-ant-…"
                className="mb-2 w-full rounded border border-notion-border bg-transparent px-2 py-1.5 text-sm outline-none dark:border-notion-border-dark"
              />
              <button onClick={saveKey} className="rounded-md bg-notion-accent px-3 py-1.5 text-sm font-medium text-white">Enregistrer</button>
            </div>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button onClick={briefing} disabled={loading} className={actBtn}><Sun size={15} /> Briefing du matin</button>
                <button onClick={nextAction} disabled={loading} className={actBtn}><Wand2 size={15} /> Prochaine action</button>
              </div>

              <div className="mb-3 rounded-lg border border-notion-border p-2 dark:border-notion-border-dark">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-notion-muted"><Users size={13} /> Préparer une rencontre</div>
                <div className="flex gap-1">
                  <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="min-w-0 flex-1 rounded border border-notion-border bg-transparent px-2 py-1 text-sm dark:border-notion-border-dark">
                    <option value="">Choisir un contact…</option>
                    {contacts.map((c) => <option key={c.id} value={c.id}>{c.title || 'Sans nom'}</option>)}
                  </select>
                  <button onClick={prepMeeting} disabled={loading || !contactId} className="rounded-md bg-notion-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-40">Préparer</button>
                </div>
              </div>

              <div className="mb-3">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={2}
                  placeholder="Pose ta question au copilote…"
                  className="w-full resize-y rounded-lg border border-notion-border bg-transparent px-2 py-1.5 text-sm outline-none dark:border-notion-border-dark"
                />
                <button onClick={() => prompt.trim() && run(prompt.trim(), buildContext())} disabled={loading || !prompt.trim()} className="mt-1 rounded-md bg-notion-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">
                  Demander
                </button>
              </div>

              <button onClick={() => { setApiKey(''); setKey(''); setKeySaved(false); }} className="text-xs text-notion-muted hover:underline">
                Changer la clé API
              </button>
            </>
          )}

          {loading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-notion-muted">
              <Loader2 size={16} className="animate-spin" /> Le copilote réfléchit…
            </div>
          )}
          {error && <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
          {answer && (
            <div className="mt-4 whitespace-pre-wrap rounded-lg border border-notion-border bg-notion-sidebar/40 p-3 text-sm dark:border-notion-border-dark dark:bg-notion-sidebar-dark/40">
              {answer}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

const actBtn =
  'flex items-center justify-center gap-1.5 rounded-md border border-notion-border px-2 py-2 text-xs font-medium hover:bg-notion-hover disabled:opacity-40 dark:border-notion-border-dark dark:hover:bg-notion-hover-dark';
