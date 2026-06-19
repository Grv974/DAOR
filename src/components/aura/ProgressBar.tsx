interface ProgressBarProps {
  value: number; // 0..1
  className?: string;
  showPct?: boolean;
}

/** Notion-like progress bar with a percentage label. */
export function ProgressBar({ value, className = '', showPct = true }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const color =
    pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-notion-accent' : pct > 0 ? 'bg-amber-500' : 'bg-gray-400';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-notion-border dark:bg-notion-border-dark">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {showPct && <span className="w-9 shrink-0 text-right text-xs tabular-nums text-notion-muted">{pct}%</span>}
    </div>
  );
}
