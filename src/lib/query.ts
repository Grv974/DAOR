import type {
  Database,
  DatabaseView,
  Filter,
  FilterOp,
  PropertyDef,
  PropertyType,
  Row,
} from '@/types';

// Operators offered in the filter UI, per property type.
export const OPS_BY_TYPE: Record<PropertyType, { op: FilterOp; label: string }[]> = {
  text: [
    { op: 'contains', label: 'contient' },
    { op: 'notContains', label: 'ne contient pas' },
    { op: 'equals', label: 'est' },
    { op: 'isEmpty', label: 'est vide' },
    { op: 'isNotEmpty', label: 'non vide' },
  ],
  number: [
    { op: 'equals', label: '=' },
    { op: 'notEquals', label: '≠' },
    { op: 'gt', label: '>' },
    { op: 'lt', label: '<' },
    { op: 'isEmpty', label: 'est vide' },
    { op: 'isNotEmpty', label: 'non vide' },
  ],
  date: [
    { op: 'equals', label: 'le' },
    { op: 'before', label: 'avant' },
    { op: 'after', label: 'après' },
    { op: 'isEmpty', label: 'est vide' },
    { op: 'isNotEmpty', label: 'non vide' },
  ],
  checkbox: [
    { op: 'checked', label: 'cochée' },
    { op: 'unchecked', label: 'décochée' },
  ],
  select: [
    { op: 'equals', label: 'est' },
    { op: 'notEquals', label: 'n’est pas' },
    { op: 'isEmpty', label: 'est vide' },
    { op: 'isNotEmpty', label: 'non vide' },
  ],
  multiselect: [
    { op: 'contains', label: 'contient' },
    { op: 'notContains', label: 'ne contient pas' },
    { op: 'isEmpty', label: 'est vide' },
    { op: 'isNotEmpty', label: 'non vide' },
  ],
};

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function matchFilter(value: unknown, filter: Filter): boolean {
  switch (filter.op) {
    case 'isEmpty':
      return isEmpty(value);
    case 'isNotEmpty':
      return !isEmpty(value);
    case 'checked':
      return Boolean(value);
    case 'unchecked':
      return !value;
    case 'contains':
      if (Array.isArray(value)) return value.includes(filter.value);
      return String(value ?? '').toLowerCase().includes(String(filter.value ?? '').toLowerCase());
    case 'notContains':
      if (Array.isArray(value)) return !value.includes(filter.value);
      return !String(value ?? '').toLowerCase().includes(String(filter.value ?? '').toLowerCase());
    case 'equals':
      return String(value ?? '') === String(filter.value ?? '');
    case 'notEquals':
      return String(value ?? '') !== String(filter.value ?? '');
    case 'gt':
      return Number(value) > Number(filter.value);
    case 'lt':
      return Number(value) < Number(filter.value);
    case 'before':
      return String(value ?? '') !== '' && String(value) < String(filter.value);
    case 'after':
      return String(value ?? '') !== '' && String(value) > String(filter.value);
    default:
      return true;
  }
}

function compare(a: unknown, b: unknown, type: PropertyType): number {
  if (type === 'number') return (Number(a) || 0) - (Number(b) || 0);
  if (type === 'checkbox') return (a ? 1 : 0) - (b ? 1 : 0);
  return String(a ?? '').localeCompare(String(b ?? ''), 'fr');
}

export function applyFiltersAndSorts(rows: Row[], db: Database, view: DatabaseView): Row[] {
  const propById = new Map(db.properties.map((p) => [p.id, p]));
  let result = rows.filter((row) =>
    view.filters.every((f) => {
      if (!propById.has(f.propId)) return true;
      return matchFilter(row.values[f.propId], f);
    }),
  );

  if (view.sorts.length > 0) {
    result = [...result].sort((ra, rb) => {
      for (const sort of view.sorts) {
        const prop = propById.get(sort.propId);
        if (!prop) continue;
        const cmp = compare(ra.values[sort.propId], rb.values[sort.propId], prop.type);
        if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp;
      }
      return ra.order - rb.order;
    });
  }

  return result;
}

export interface RowGroup {
  key: string | null; // optionId, value, or null for "empty"
  label: string;
  rows: Row[];
}

/** Group rows by a property (used by table grouping & kanban columns). */
export function groupRows(rows: Row[], prop: PropertyDef): RowGroup[] {
  const groups = new Map<string | null, Row[]>();

  // For select properties, pre-seed a column per option (Notion-like).
  if (prop.type === 'select') {
    for (const opt of prop.options ?? []) groups.set(opt.id, []);
  }

  for (const row of rows) {
    const raw = row.values[prop.id];
    const key = isEmpty(raw) ? null : (raw as string);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const labelFor = (key: string | null): string => {
    if (key === null) return 'Sans valeur';
    if (prop.type === 'select' || prop.type === 'multiselect') {
      return prop.options?.find((o) => o.id === key)?.name ?? key;
    }
    if (prop.type === 'checkbox') return key === 'true' ? 'Coché' : 'Non coché';
    return key;
  };

  return Array.from(groups.entries()).map(([key, groupRowsList]) => ({
    key,
    label: labelFor(key),
    rows: groupRowsList,
  }));
}
