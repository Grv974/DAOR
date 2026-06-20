import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, NotebookPen, Target, Users, Wallet, Zap } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useEntityStore } from '@/store/useEntityStore';
import type { EntityType } from '@/types/aura';

const TYPES: { type: EntityType; label: string; icon: typeof Zap; route: string }[] = [
  { type: 'task', label: 'Tâche', icon: CheckSquare, route: '/m/objectives' },
  { type: 'journal', label: 'Note', icon: NotebookPen, route: '/m/journal' },
  { type: 'contact', label: 'Contact', icon: Users, route: '/m/crm' },
  { type: 'opportunity', label: 'Opportunité', icon: Wallet, route: '/m/opportunities' },
  { type: 'objective', label: 'Objectif', icon: Target, route: '/m/objectives' },
];

export function QuickCapture() {
  const navigate = useNavigate();
  const { captureOpen, setCaptureOpen } = useUIStore();
  const createEntity = useEntityStore((s) => s.createEntity);
  const [type, setType] = useState<EntityType>('task');
  const [text, setText] = useState('');

  useEffect(() => {
    if (captureOpen) {
      setText('');
      setType('task');
    }
  }, [captureOpen]);

  if (!captureOpen) return null;

  const submit = async (navigateTo: boolean) => {
    if (!text.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const props: Record<string, unknown> =
      type === 'task'
        ? { status: 'todo', priority: 'medium' }
        : type === 'journal'
          ? { kind: 'note', date: today, text: text.trim() }
          : type === 'opportunity'
            ? { stage: 'identified', valueType: 'monetary', value: 0, probability: 50 }
            : type === 'objective'
              ? { horizon: 'quarter', priority: 'medium' }
              : { proximity: 'acquaintance', cadence: 90 };
    await createEntity(type, { title: text.trim(), props });
    setText('');
    if (navigateTo) {
      setCaptureOpen(false);
      navigate(TYPES.find((t) => t.type === type)!.route);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[18vh]" onClick={() => setCaptureOpen(false)}>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-notion-border bg-white shadow-2xl dark:border-notion-border-dark dark:bg-[#252525]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-notion-border px-4 py-2.5 dark:border-notion-border-dark">
          <Zap size={16} className="text-notion-accent" />
          <span className="text-sm font-semibold">Capture rapide</span>
          <span className="ml-auto text-[11px] text-notion-muted">Entrée = créer · Maj+Entrée = créer & ouvrir</span>
        </div>
        <div className="flex flex-wrap gap-1 px-4 pt-3">
          {TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.type} onClick={() => setType(t.type)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${type === t.type ? 'bg-notion-accent text-white' : 'text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark'}`}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="p-4">
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void submit(e.shiftKey); }
              else if (e.key === 'Escape') setCaptureOpen(false);
            }}
            placeholder={`Nouveau/elle ${TYPES.find((t) => t.type === type)!.label.toLowerCase()}…`}
            className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-sm outline-none dark:border-notion-border-dark"
          />
        </div>
      </div>
    </div>
  );
}
