import type { PropertyDef } from '@/types';
import { OPTION_COLORS } from '@/lib/colors';
import { PropertyTypeIcon } from './PropertyHeader';

/** Read-only rendering of a property value, used on kanban / gallery cards. */
export function ValueDisplay({ prop, value }: { prop: PropertyDef; value: unknown }) {
  if (prop.type === 'checkbox') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-notion-muted">
        <PropertyTypeIcon type="checkbox" /> {value ? 'Oui' : 'Non'}
      </span>
    );
  }

  if (prop.type === 'select' || prop.type === 'multiselect') {
    const ids = Array.isArray(value) ? (value as string[]) : value ? [value as string] : [];
    const opts = (prop.options ?? []).filter((o) => ids.includes(o.id));
    if (opts.length === 0) return null;
    return (
      <span className="flex flex-wrap gap-1">
        {opts.map((o) => (
          <span key={o.id} className={`rounded px-1.5 py-0.5 text-xs ${OPTION_COLORS[o.color]}`}>
            {o.name}
          </span>
        ))}
      </span>
    );
  }

  if (value === null || value === undefined || value === '') return null;

  return <span className="text-xs text-notion-muted">{String(value)}</span>;
}
