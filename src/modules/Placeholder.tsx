import { Hammer } from 'lucide-react';

/** Temporary screen for modules being delivered in an upcoming phase. */
export function ModulePlaceholder({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Hammer size={28} className="text-notion-muted" />
      <h1 className="text-xl font-bold">{name}</h1>
      <p className="max-w-md text-sm text-notion-muted">{desc}</p>
      <span className="rounded-full bg-notion-hover px-3 py-1 text-xs text-notion-muted dark:bg-notion-hover-dark">
        Livraison dans une prochaine phase
      </span>
    </div>
  );
}
