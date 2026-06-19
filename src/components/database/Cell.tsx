import type { PropertyDef } from '@/types';
import { SelectCell } from './SelectCell';

interface CellProps {
  dbId: string;
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function Cell({ dbId, prop, value, onChange }: CellProps) {
  switch (prop.type) {
    case 'number':
      return (
        <input
          type="number"
          value={(value as number | null) ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="h-full w-full bg-transparent px-2 py-1 text-sm tabular-nums outline-none"
        />
      );
    case 'date':
      return (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-full w-full bg-transparent px-2 py-1 text-sm outline-none"
        />
      );
    case 'checkbox':
      return (
        <div className="flex h-full w-full items-center px-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 accent-notion-accent"
          />
        </div>
      );
    case 'select':
      return <SelectCell dbId={dbId} prop={prop} value={value} multiple={false} onChange={onChange} />;
    case 'multiselect':
      return <SelectCell dbId={dbId} prop={prop} value={value} multiple onChange={onChange} />;
    case 'text':
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-full w-full bg-transparent px-2 py-1 text-sm outline-none"
        />
      );
  }
}
