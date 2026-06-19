import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import type { SlashItem } from './items';

export interface SlashListProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export interface SlashListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashList = forwardRef<SlashListRef, SlashListProps>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        const item = items[selected];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return <div className="daor-slash-menu px-3 py-2 text-sm text-notion-muted">Aucun résultat</div>;
  }

  return (
    <div className="daor-slash-menu text-notion-text dark:text-notion-text-dark">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            onMouseEnter={() => setSelected(i)}
            onClick={() => command(item)}
            className={`flex w-full items-center gap-3 rounded px-2 py-1.5 text-left ${
              i === selected ? 'bg-notion-hover dark:bg-notion-hover-dark' : ''
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded border border-notion-border dark:border-notion-border-dark">
              <Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{item.title}</span>
              <span className="block truncate text-xs text-notion-muted">{item.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
});

SlashList.displayName = 'SlashList';
