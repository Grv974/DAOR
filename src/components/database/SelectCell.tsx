import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { PropertyDef } from '@/types';
import { OPTION_COLORS } from '@/lib/colors';
import { useDatabaseStore } from '@/store/useDatabaseStore';

interface SelectCellProps {
  dbId: string;
  prop: PropertyDef;
  value: unknown;
  multiple: boolean;
  onChange: (value: unknown) => void;
}

export function SelectCell({ dbId, prop, value, multiple, onChange }: SelectCellProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const addOption = useDatabaseStore((s) => s.addOption);
  const options = prop.options ?? [];

  const selectedIds: string[] = multiple
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : value
      ? [value as string]
      : [];

  const selectedOptions = options.filter((o) => selectedIds.includes(o.id));
  const filtered = options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));
  const exactExists = options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());

  const toggle = (optId: string) => {
    if (multiple) {
      const next = selectedIds.includes(optId)
        ? selectedIds.filter((id) => id !== optId)
        : [...selectedIds, optId];
      onChange(next);
    } else {
      onChange(selectedIds.includes(optId) ? null : optId);
      setOpen(false);
    }
  };

  const create = () => {
    const name = query.trim();
    if (!name) return;
    const opt = addOption(dbId, prop.id, name);
    if (opt) {
      if (multiple) onChange([...selectedIds, opt.id]);
      else {
        onChange(opt.id);
        setOpen(false);
      }
    }
    setQuery('');
  };

  return (
    <div className="relative h-full w-full">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-full w-full flex-wrap items-center gap-1 px-2 py-1 text-left"
      >
        {selectedOptions.map((o) => (
          <span
            key={o.id}
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${OPTION_COLORS[o.color]}`}
          >
            {o.name}
            {multiple && (
              <X
                size={11}
                className="cursor-pointer opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selectedIds.filter((id) => id !== o.id));
                }}
              />
            )}
          </span>
        ))}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-md border border-notion-border bg-white p-2 shadow-lg dark:border-notion-border-dark dark:bg-[#252525]">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim() && !exactExists) create();
              }}
              placeholder="Rechercher ou créer…"
              className="mb-2 w-full rounded border border-notion-border bg-transparent px-2 py-1 text-sm outline-none dark:border-notion-border-dark"
            />
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
                >
                  <span className={`rounded px-1.5 py-0.5 text-xs ${OPTION_COLORS[o.color]}`}>
                    {o.name}
                  </span>
                  {selectedIds.includes(o.id) && <Check size={14} />}
                </button>
              ))}
              {query.trim() && !exactExists && (
                <button
                  type="button"
                  onClick={create}
                  className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-sm hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
                >
                  <Plus size={14} /> Créer « {query.trim()} »
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
