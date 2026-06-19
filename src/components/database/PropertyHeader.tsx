import { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Hash,
  List,
  Tags,
  Trash2,
  Type,
} from 'lucide-react';
import type { PropertyDef, PropertyType } from '@/types';
import { useDatabaseStore } from '@/store/useDatabaseStore';

const TYPE_META: Record<PropertyType, { icon: typeof Type; label: string }> = {
  text: { icon: Type, label: 'Texte' },
  number: { icon: Hash, label: 'Nombre' },
  date: { icon: Calendar, label: 'Date' },
  checkbox: { icon: CheckSquare, label: 'Case à cocher' },
  select: { icon: List, label: 'Sélection' },
  multiselect: { icon: Tags, label: 'Multi-sélection' },
};

export function PropertyTypeIcon({ type }: { type: PropertyType }) {
  const Icon = TYPE_META[type].icon;
  return <Icon size={14} className="text-notion-muted" />;
}

interface PropertyHeaderProps {
  dbId: string;
  prop: PropertyDef;
  isTitle: boolean;
}

export function PropertyHeader({ dbId, prop, isTitle }: PropertyHeaderProps) {
  const [open, setOpen] = useState(false);
  const updateProperty = useDatabaseStore((s) => s.updateProperty);
  const deleteProperty = useDatabaseStore((s) => s.deleteProperty);

  return (
    <div className="relative flex h-full items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-full w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
      >
        <PropertyTypeIcon type={prop.type} />
        <span className="flex-1 truncate">{prop.name}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-md border border-notion-border bg-white p-2 shadow-lg dark:border-notion-border-dark dark:bg-[#252525]">
            <input
              value={prop.name}
              onChange={(e) => updateProperty(dbId, prop.id, { name: e.target.value })}
              className="mb-2 w-full rounded border border-notion-border bg-transparent px-2 py-1 text-sm outline-none dark:border-notion-border-dark"
            />
            <div className="mb-1 px-1 text-[11px] uppercase tracking-wide text-notion-muted">Type</div>
            <div className="grid grid-cols-2 gap-1">
              {(Object.keys(TYPE_META) as PropertyType[]).map((t) => {
                const Icon = TYPE_META[t].icon;
                const active = prop.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={isTitle}
                    onClick={() => updateProperty(dbId, prop.id, { type: t })}
                    className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs ${
                      active ? 'bg-notion-hover dark:bg-notion-hover-dark' : ''
                    } ${isTitle ? 'cursor-not-allowed opacity-40' : 'hover:bg-notion-hover dark:hover:bg-notion-hover-dark'}`}
                  >
                    <Icon size={13} /> {TYPE_META[t].label}
                  </button>
                );
              })}
            </div>
            {!isTitle && (
              <button
                type="button"
                onClick={() => {
                  deleteProperty(dbId, prop.id);
                  setOpen(false);
                }}
                className="mt-2 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
              >
                <Trash2 size={14} /> Supprimer la propriété
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AddPropertyMenu({ dbId }: { dbId: string }) {
  const [open, setOpen] = useState(false);
  const addProperty = useDatabaseStore((s) => s.addProperty);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-full items-center px-3 py-1.5 text-sm text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        title="Ajouter une propriété"
      >
        +
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-md border border-notion-border bg-white p-1 shadow-lg dark:border-notion-border-dark dark:bg-[#252525]">
            {(Object.keys(TYPE_META) as PropertyType[]).map((t) => {
              const Icon = TYPE_META[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    addProperty(dbId, t);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
                >
                  <Icon size={14} className="text-notion-muted" /> {TYPE_META[t].label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
