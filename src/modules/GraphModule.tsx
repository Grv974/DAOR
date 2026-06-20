import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Filter, Route, X } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import type { EntityType, RelationType } from '@/types/aura';
import {
  GRAPH_TYPES,
  LINK_STYLE,
  LINKABLE_TYPES,
  NODE_COLOR,
  shortestPath,
} from '@/lib/aura/graph';

interface PNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

type Layout = 'force' | 'free' | 'radial';

export function GraphModule() {
  const entities = useEntityStore((s) => s.entities);
  const relations = useEntityStore((s) => s.relations);
  const updateProps = useEntityStore((s) => s.updateProps);
  const updateEntity = useEntityStore((s) => s.updateEntity);
  const addRelation = useEntityStore((s) => s.addRelation);
  const removeRelation = useEntityStore((s) => s.removeRelation);

  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef<Map<string, PNode>>(new Map());
  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => (t + 1) % 1_000_000);

  const [transform, setTransform] = useState({ k: 1, tx: 0, ty: 0 });
  const [layout, setLayout] = useState<Layout>('force');
  const [visibleTypes, setVisibleTypes] = useState<Set<EntityType>>(new Set(GRAPH_TYPES.map((t) => t.type)));
  const [visibleLinks, setVisibleLinks] = useState<Set<RelationType>>(new Set([...LINKABLE_TYPES, 'worksAt', 'opportunity']));
  const [showFilters, setShowFilters] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const [pathMode, setPathMode] = useState(false);
  const [pathA, setPathA] = useState<string | null>(null);
  const [pathIds, setPathIds] = useState<string[]>([]);

  const [linkMenu, setLinkMenu] = useState<{ source: string; target: string; sx: number; sy: number } | null>(null);

  // Candidate nodes: AURA entities that belong on the relational graph.
  const graphTypeSet = useMemo(() => new Set(GRAPH_TYPES.map((t) => t.type)), []);
  const nodes = useMemo(
    () => Object.values(entities).filter((e) => graphTypeSet.has(e.type) && !e.archived),
    [entities, graphTypeSet],
  );
  const nodeIds = useMemo(() => nodes.map((n) => n.id), [nodes]);

  // Interaction refs (avoid stale closures in window listeners).
  const dragNode = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const linkDrag = useRef<{ source: string; x: number; y: number } | null>(null);
  const bgPointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; k: number; cx: number; cy: number; tx: number; ty: number } | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Measure the viewport so we can center content (graph origin is 0,0) and
  // place the mini-map, instead of pinning everything to the top-left corner.
  const [size, setSize] = useState({ w: 0, h: 0 });
  const centered = useRef(false);
  const userMoved = useRef(false);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Frame all nodes within the viewport (fit-to-content).
  const fitView = () => {
    if (size.w === 0) return;
    const pts = [...posRef.current.values()];
    if (pts.length === 0) { setTransform({ k: 1, tx: size.w / 2, ty: size.h / 2 }); return; }
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 100;
    const k = Math.max(0.2, Math.min(2, Math.min((size.w - pad) / ((maxX - minX) || 1), (size.h - pad) / ((maxY - minY) || 1))));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setTransform({ k, tx: size.w / 2 - cx * k, ty: size.h / 2 - cy * k });
  };

  // Auto-fit on first display; re-fit once after the force layout settles
  // (unless the user has already panned/zoomed).
  useEffect(() => {
    if (centered.current || size.w === 0) return;
    centered.current = true;
    fitView();
    const t = setTimeout(() => { if (!userMoved.current) fitView(); }, 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // Initialise / reconcile node positions.
  useEffect(() => {
    const pos = posRef.current;
    let i = 0;
    for (const n of nodes) {
      if (!pos.has(n.id)) {
        const px = n.props.x as number | undefined;
        const py = n.props.y as number | undefined;
        const angle = i * 2.399;
        const r = 60 + i * 12;
        pos.set(n.id, {
          x: typeof px === 'number' ? px : Math.cos(angle) * r,
          y: typeof py === 'number' ? py : Math.sin(angle) * r,
          vx: 0,
          vy: 0,
        });
      }
      i++;
    }
    for (const id of [...pos.keys()]) if (!nodeIds.includes(id)) pos.delete(id);
    rerender();
  }, [nodes, nodeIds]);

  // Force simulation.
  useEffect(() => {
    if (layout !== 'force') return;
    let raf = 0;
    let alpha = 1;
    const edges = relations.filter((r) => posRef.current.has(r.source) && posRef.current.has(r.target));
    const step = () => {
      const pos = posRef.current;
      const arr = [...pos.entries()];
      // Repulsion
      for (let a = 0; a < arr.length; a++) {
        for (let b = a + 1; b < arr.length; b++) {
          const [, na] = arr[a];
          const [, nb] = arr[b];
          let dx = na.x - nb.x;
          let dy = na.y - nb.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) { d2 = 0.01; dx = Math.random(); dy = Math.random(); }
          const f = (4000 / d2) * alpha;
          const d = Math.sqrt(d2);
          na.vx += (dx / d) * f;
          na.vy += (dy / d) * f;
          nb.vx -= (dx / d) * f;
          nb.vy -= (dy / d) * f;
        }
      }
      // Springs
      for (const e of edges) {
        const s = pos.get(e.source)!;
        const t = pos.get(e.target)!;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = ((d - 110) / d) * 0.05 * alpha;
        s.vx += dx * f;
        s.vy += dy * f;
        t.vx -= dx * f;
        t.vy -= dy * f;
      }
      // Centering + integrate
      for (const [id, n] of arr) {
        if (dragNode.current?.id === id) { n.vx = 0; n.vy = 0; continue; }
        n.vx -= n.x * 0.002 * alpha;
        n.vy -= n.y * 0.002 * alpha;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += Math.max(-20, Math.min(20, n.vx));
        n.y += Math.max(-20, Math.min(20, n.vy));
      }
      alpha *= 0.985;
      rerender();
      if (alpha > 0.02) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [layout, relations, nodeIds]);

  // Radial layout (one-shot arrangement).
  useEffect(() => {
    if (layout !== 'radial') return;
    const pos = posRef.current;
    const arr = [...pos.keys()];
    arr.forEach((id, i) => {
      const a = (i / arr.length) * Math.PI * 2;
      const r = 60 + (i % 3) * 80;
      const n = pos.get(id)!;
      n.x = Math.cos(a) * r;
      n.y = Math.sin(a) * r;
    });
    rerender();
  }, [layout]);

  // Window-level pointer handlers for drag / pan / link-drag / pinch-zoom.
  // Pointer events unify mouse + touch; two background pointers = pinch.
  useEffect(() => {
    const toGraph = (clientX: number, clientY: number) => {
      const rect = svgRef.current!.getBoundingClientRect();
      const { k, tx, ty } = transformRef.current;
      return { x: (clientX - rect.left - tx) / k, y: (clientY - rect.top - ty) / k };
    };
    const onMove = (e: PointerEvent) => {
      if (bgPointers.current.has(e.pointerId)) bgPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // Pinch-zoom (two fingers on the background).
      if (pinch.current && bgPointers.current.size >= 2) {
        const [p1, p2] = [...bgPointers.current.values()];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
        const k = Math.max(0.2, Math.min(3, pinch.current.k * (dist / pinch.current.dist)));
        const r = k / pinch.current.k;
        setTransform({
          k,
          tx: pinch.current.cx - (pinch.current.cx - pinch.current.tx) * r,
          ty: pinch.current.cy - (pinch.current.cy - pinch.current.ty) * r,
        });
        return;
      }
      if (dragNode.current) {
        const g = toGraph(e.clientX, e.clientY);
        const n = posRef.current.get(dragNode.current.id);
        if (n) { n.x = g.x - dragNode.current.dx; n.y = g.y - dragNode.current.dy; n.vx = 0; n.vy = 0; rerender(); }
      } else if (linkDrag.current) {
        const g = toGraph(e.clientX, e.clientY);
        linkDrag.current.x = g.x; linkDrag.current.y = g.y; rerender();
      } else if (pan.current) {
        setTransform((tf) => ({ ...tf, tx: pan.current!.tx + (e.clientX - pan.current!.x), ty: pan.current!.ty + (e.clientY - pan.current!.y) }));
      }
    };
    const onUp = (e: PointerEvent) => {
      bgPointers.current.delete(e.pointerId);
      if (bgPointers.current.size < 2) pinch.current = null;
      if (bgPointers.current.size === 0) pan.current = null;
      if (dragNode.current) {
        const n = posRef.current.get(dragNode.current.id);
        if (n) updateProps(dragNode.current.id, { x: Math.round(n.x), y: Math.round(n.y) });
        dragNode.current = null;
      }
      if (linkDrag.current) {
        const g = toGraph(e.clientX, e.clientY);
        let best: string | null = null;
        let bestD = 30;
        for (const [id, n] of posRef.current) {
          if (id === linkDrag.current.source) continue;
          const d = Math.hypot(n.x - g.x, n.y - g.y);
          if (d < bestD) { bestD = d; best = id; }
        }
        if (best) setLinkMenu({ source: linkDrag.current.source, target: best, sx: e.clientX, sy: e.clientY });
        linkDrag.current = null;
        rerender();
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [updateProps]);

  const onWheel = (e: React.WheelEvent) => {
    userMoved.current = true;
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform((tf) => {
      const k = Math.max(0.2, Math.min(3, tf.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      const ratio = k / tf.k;
      return { k, tx: mx - (mx - tf.tx) * ratio, ty: my - (my - tf.ty) * ratio };
    });
  };

  const recenter = () => { userMoved.current = true; fitView(); };

  const onNodeClick = (id: string) => {
    if (pathMode) {
      if (!pathA) { setPathA(id); setPathIds([id]); }
      else { setPathIds(shortestPath(relations, pathA, id)); setPathA(null); }
      return;
    }
    setSelected(id);
  };

  // Visibility helpers (hidden → faded, not removed).
  const typeVisible = (t: EntityType) => visibleTypes.has(t);
  const neighborSet = useMemo(() => {
    if (!hovered) return null;
    const set = new Set<string>([hovered]);
    for (const r of relations) {
      if (r.source === hovered) set.add(r.target);
      if (r.target === hovered) set.add(r.source);
    }
    return set;
  }, [hovered, relations]);

  const pathEdgeKey = new Set<string>();
  for (let i = 0; i < pathIds.length - 1; i++) pathEdgeKey.add([pathIds[i], pathIds[i + 1]].sort().join('|'));

  const visibleRelations = relations.filter(
    (r) => posRef.current.has(r.source) && posRef.current.has(r.target) && visibleLinks.has(r.type),
  );

  const sel = selected ? entities[selected] : undefined;
  const { k, tx, ty } = transform;
  const ld = linkDrag.current;

  // Mini-map bounds
  const allPos = [...posRef.current.values()];
  const minX = Math.min(0, ...allPos.map((p) => p.x)) - 40;
  const maxX = Math.max(0, ...allPos.map((p) => p.x)) + 40;
  const minY = Math.min(0, ...allPos.map((p) => p.y)) - 40;
  const maxY = Math.max(0, ...allPos.map((p) => p.y)) + 40;

  return (
    <div className="relative flex h-full">
      <div className="relative flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1">
          {(['force', 'free', 'radial'] as Layout[]).map((l) => (
            <button
              key={l}
              onClick={() => {
                if (l === 'free' && layout !== 'free') for (const [id, n] of posRef.current) updateProps(id, { x: Math.round(n.x), y: Math.round(n.y) });
                setLayout(l);
              }}
              className={`rounded-md border px-2 py-1 text-xs ${layout === l ? 'border-notion-accent bg-notion-accent text-white' : 'border-notion-border bg-white dark:border-notion-border-dark dark:bg-[#252525]'}`}
            >
              {l === 'force' ? 'Libre (auto)' : l === 'free' ? 'Manuel' : 'Radial'}
            </button>
          ))}
          <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-1 rounded-md border border-notion-border bg-white px-2 py-1 text-xs dark:border-notion-border-dark dark:bg-[#252525]">
            <Filter size={12} /> Filtres
          </button>
          <button onClick={() => { setPathMode((v) => !v); setPathA(null); setPathIds([]); }} className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${pathMode ? 'border-notion-accent bg-notion-accent text-white' : 'border-notion-border bg-white dark:border-notion-border-dark dark:bg-[#252525]'}`}>
            <Route size={12} /> Chemin
          </button>
          <button onClick={recenter} className="flex items-center gap-1 rounded-md border border-notion-border bg-white px-2 py-1 text-xs dark:border-notion-border-dark dark:bg-[#252525]">
            <Crosshair size={12} /> Recentrer
          </button>
        </div>

        {showFilters && (
          <div className="absolute left-3 top-14 z-10 w-52 rounded-md border border-notion-border bg-white p-2 text-xs shadow-lg dark:border-notion-border-dark dark:bg-[#252525]">
            <div className="mb-1 font-semibold">Entités</div>
            {GRAPH_TYPES.map((t) => (
              <label key={t.type} className="flex items-center gap-2 py-0.5">
                <input type="checkbox" checked={visibleTypes.has(t.type)} onChange={(e) => setVisibleTypes((s) => { const n = new Set(s); e.target.checked ? n.add(t.type) : n.delete(t.type); return n; })} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLOR[t.type] }} /> {t.label}
              </label>
            ))}
            <div className="mb-1 mt-2 font-semibold">Liens</div>
            {[...LINKABLE_TYPES, 'worksAt', 'opportunity'].map((lt) => (
              <label key={lt} className="flex items-center gap-2 py-0.5">
                <input type="checkbox" checked={visibleLinks.has(lt as RelationType)} onChange={(e) => setVisibleLinks((s) => { const n = new Set(s); e.target.checked ? n.add(lt as RelationType) : n.delete(lt as RelationType); return n; })} />
                <span className="h-0.5 w-4" style={{ background: LINK_STYLE[lt as RelationType].color }} /> {LINK_STYLE[lt as RelationType].label}
              </label>
            ))}
          </div>
        )}

        {nodes.length === 0 && (
          <div className="absolute inset-0 z-0 flex items-center justify-center px-6 text-center text-sm text-notion-muted">
            Le graphe se peuple avec vos contacts, entreprises, opportunités, projets et objectifs.<br />
            Créez-en (CRM, Opportunités…) puis tracez des liens en glissant la pastille d'un nœud vers un autre.
          </div>
        )}

        <svg
          ref={svgRef}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onWheel={onWheel}
          onPointerDown={(e) => {
            if (e.target !== svgRef.current) return;
            userMoved.current = true;
            const rect = svgRef.current.getBoundingClientRect();
            bgPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (bgPointers.current.size === 2) {
              const [p1, p2] = [...bgPointers.current.values()];
              pan.current = null;
              pinch.current = {
                dist: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1,
                k,
                cx: (p1.x + p2.x) / 2 - rect.left,
                cy: (p1.y + p2.y) / 2 - rect.top,
                tx,
                ty,
              };
            } else if (bgPointers.current.size === 1) {
              pan.current = { x: e.clientX, y: e.clientY, tx, ty };
              setSelected(null);
            }
          }}
        >
          <defs>
            {Object.entries(LINK_STYLE).map(([t, st]) => (
              <marker key={t} id={`arrow-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={st.color} />
              </marker>
            ))}
          </defs>
          <g transform={`translate(${tx},${ty}) scale(${k})`}>
            {/* Edges */}
            {visibleRelations.map((r) => {
              const s = posRef.current.get(r.source)!;
              const t = posRef.current.get(r.target)!;
              const st = LINK_STYLE[r.type];
              const inPath = pathEdgeKey.has([r.source, r.target].sort().join('|'));
              const faded = neighborSet ? !(neighborSet.has(r.source) && neighborSet.has(r.target)) : false;
              return (
                <line
                  key={r.id}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={inPath ? '#f59e0b' : st.color}
                  strokeWidth={(inPath ? st.width + 2 : st.width) / 1}
                  strokeDasharray={st.dash}
                  markerEnd={st.arrow ? `url(#arrow-${r.type})` : undefined}
                  opacity={faded ? 0.08 : inPath ? 1 : 0.7}
                />
              );
            })}

            {/* Link-drag preview */}
            {ld && posRef.current.get(ld.source) && (
              <line x1={posRef.current.get(ld.source)!.x} y1={posRef.current.get(ld.source)!.y} x2={ld.x} y2={ld.y} stroke="#2383e2" strokeWidth={1.5} strokeDasharray="4 3" />
            )}

            {/* Nodes */}
            {nodes.map((n) => {
              const p = posRef.current.get(n.id);
              if (!p) return null;
              const color = NODE_COLOR[n.type] ?? '#888';
              const isContact = n.type === 'contact';
              const score = isContact ? ((n.props.score as number) ?? 50) : 50;
              const radius = isContact ? 14 + (score / 100) * 8 : 16;
              const hiddenType = !typeVisible(n.type);
              const faded = (neighborSet && !neighborSet.has(n.id)) || hiddenType || (pathIds.length > 0 && !pathIds.includes(n.id));
              const isSel = selected === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x},${p.y})`}
                  opacity={faded ? 0.18 : 1}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    userMoved.current = true;
                    const rect = svgRef.current!.getBoundingClientRect();
                    const gx = (e.clientX - rect.left - tx) / k;
                    const gy = (e.clientY - rect.top - ty) / k;
                    dragNode.current = { id: n.id, dx: gx - p.x, dy: gy - p.y };
                  }}
                  onClick={(e) => { e.stopPropagation(); onNodeClick(n.id); }}
                >
                  <circle r={radius + 4} fill={color} opacity={0.18} />
                  <circle r={radius} fill={color} stroke={isSel ? '#111' : '#fff'} strokeWidth={isSel ? 2.5 : 1.5} />
                  <text textAnchor="middle" dy={radius + 12} fontSize={11} fill="currentColor" className="select-none">
                    {(n.title || 'Sans titre').slice(0, 22)}
                  </text>
                  {/* Link handle */}
                  {(hovered === n.id || isSel) && (
                    <circle
                      r={6} cx={radius} cy={-radius} fill="#2383e2" stroke="#fff" strokeWidth={1.5}
                      style={{ cursor: 'crosshair' }}
                      onPointerDown={(e) => { e.stopPropagation(); linkDrag.current = { source: n.id, x: p.x, y: p.y }; }}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* Mini-map (bottom-right) */}
          <g transform={`translate(${Math.max(12, size.w - 132)}, ${Math.max(12, size.h - 92)})`}>
            <rect width={120} height={80} fill="rgba(127,127,127,0.08)" stroke="rgba(127,127,127,0.3)" rx={4} />
            {allPos.map((p, i) => {
              const mx = ((p.x - minX) / (maxX - minX || 1)) * 116 + 2;
              const my = ((p.y - minY) / (maxY - minY || 1)) * 76 + 2;
              return <circle key={i} cx={mx} cy={my} r={1.5} fill="#888" />;
            })}
          </g>
        </svg>

        {pathMode && (
          <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-notion-accent px-3 py-1 text-xs text-white">
            {pathA ? 'Cliquez le nœud cible…' : pathIds.length > 1 ? `Chemin : ${pathIds.length - 1} saut(s)` : 'Cliquez le nœud de départ'}
          </div>
        )}

        {/* Link-type context menu */}
        {linkMenu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setLinkMenu(null)} />
            <div className="fixed z-30 w-44 rounded-md border border-notion-border bg-white p-1 shadow-lg dark:border-notion-border-dark dark:bg-[#252525]" style={{ left: linkMenu.sx, top: linkMenu.sy }}>
              <div className="px-2 py-1 text-[11px] text-notion-muted">Type de lien</div>
              {LINKABLE_TYPES.map((lt) => (
                <button key={lt} onClick={() => { addRelation(linkMenu.source, linkMenu.target, lt); setLinkMenu(null); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-notion-hover dark:hover:bg-notion-hover-dark">
                  <span className="h-0.5 w-4" style={{ background: LINK_STYLE[lt].color }} /> {LINK_STYLE[lt].label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Side panel */}
      {sel && selected && (
        <aside className="fixed inset-0 z-30 flex h-full w-full shrink-0 flex-col gap-3 overflow-y-auto border-l border-notion-border bg-notion-bg p-4 dark:border-notion-border-dark dark:bg-notion-bg-dark md:static md:z-auto md:w-72 dark:md:bg-transparent">
          <div className="flex items-center justify-between">
            <span className="rounded px-1.5 py-0.5 text-[10px] text-white" style={{ background: NODE_COLOR[sel.type] }}>{sel.type}</span>
            <button onClick={() => setSelected(null)} className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"><X size={16} /></button>
          </div>
          <input value={sel.title} onChange={(e) => updateEntity(selected, { title: e.target.value })} className="bg-transparent text-lg font-semibold outline-none" />
          <div>
            <div className="mb-1 text-xs font-medium text-notion-muted">Liens ({relations.filter((r) => r.source === selected || r.target === selected).length})</div>
            <div className="space-y-1">
              {relations.filter((r) => r.source === selected || r.target === selected).map((r) => {
                const otherId = r.source === selected ? r.target : r.source;
                const other = entities[otherId];
                return (
                  <div key={r.id} className="group flex items-center gap-1 text-xs">
                    <span className="h-0.5 w-3 shrink-0" style={{ background: LINK_STYLE[r.type].color }} />
                    <span className="text-notion-muted">{LINK_STYLE[r.type].label}</span>
                    <span className="flex-1 truncate">{other?.title || '?'}</span>
                    <button onClick={() => removeRelation(r.id)} className="text-notion-muted opacity-0 hover:text-red-600 group-hover:opacity-100"><X size={11} /></button>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-notion-muted">Astuce : survolez un nœud et glissez la pastille bleue vers un autre nœud pour créer un lien typé.</p>
        </aside>
      )}
    </div>
  );
}
