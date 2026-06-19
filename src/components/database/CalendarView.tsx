import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Database, DatabaseView, Row } from '@/types';

interface CalendarViewProps {
  database: Database;
  view: DatabaseView;
  rows: Row[];
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function CalendarView({ database, view, rows }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const dateProp = database.properties.find((p) => p.id === view.datePropId);
  const titleProp = database.titlePropId;

  if (!dateProp || dateProp.type !== 'date') {
    return (
      <div className="px-4 py-6 text-sm text-notion-muted">
        Sélectionnez une propriété de type « Date » dans <b>Calendrier</b> pour l’afficher.
      </div>
    );
  }

  // Bucket rows by their YYYY-MM-DD date value.
  const byDay = new Map<string, Row[]>();
  for (const row of rows) {
    const d = row.values[dateProp.id];
    if (typeof d === 'string' && d) {
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(row);
    }
  }

  const first = new Date(cursor.year, cursor.month, 1);
  // Monday-first offset.
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const move = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      const year = c.year + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      return { year, month };
    });
  };

  const key = (day: number) =>
    `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <div className="px-2 pb-4">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-sm font-medium">
          {MONTHS[cursor.month]} {cursor.year}
        </span>
        <button
          type="button"
          onClick={() => move(-1)}
          className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-notion-border dark:border-notion-border-dark">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="border-b border-r border-notion-border px-2 py-1 text-xs font-medium text-notion-muted dark:border-notion-border-dark"
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className="min-h-[88px] border-b border-r border-notion-border p-1 align-top dark:border-notion-border-dark"
          >
            {day && (
              <>
                <div className="mb-1 text-xs text-notion-muted">{day}</div>
                <div className="flex flex-col gap-1">
                  {(byDay.get(key(day)) ?? []).map((row) => (
                    <div
                      key={row.id}
                      className="truncate rounded bg-notion-accent/15 px-1.5 py-0.5 text-xs text-notion-accent"
                      title={(row.values[titleProp] as string) || 'Sans titre'}
                    >
                      {(row.values[titleProp] as string) || 'Sans titre'}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
