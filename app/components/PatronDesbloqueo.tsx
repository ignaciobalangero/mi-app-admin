"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Patron = number[]; // índices 0..8 (fila-major)

const PUNTOS = Array.from({ length: 9 }, (_, i) => i);

function idxToCoord(idx: number) {
  const r = Math.floor(idx / 3);
  const c = idx % 3;
  return { r, c };
}

function puntoIntermedio(a: number, b: number): number | null {
  const ca = idxToCoord(a);
  const cb = idxToCoord(b);
  const mr = (ca.r + cb.r) / 2;
  const mc = (ca.c + cb.c) / 2;
  if (Number.isInteger(mr) && Number.isInteger(mc)) {
    const mid = mr * 3 + mc;
    if (mid !== a && mid !== b) return mid;
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizarPatron(p: unknown): Patron {
  if (!Array.isArray(p)) return [];
  return p
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 8)
    .map((n) => Math.trunc(n));
}

function patronIguales(a: Patron, b: Patron): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function puntosSVG(size: number) {
  // Coordenadas centradas para un SVG cuadrado (size x size).
  const pad = size * 0.12;
  const gap = (size - pad * 2) / 2;
  return PUNTOS.map((idx) => {
    const { r, c } = idxToCoord(idx);
    return {
      idx,
      x: pad + c * gap,
      y: pad + r * gap,
    };
  });
}

/** Flecha sobre el tramo (x1,y1)→(x2,y2), ~38 % del recorrido, sentido hacia el final. */
function FlechaSegmento({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  const t = 0.38;
  const mx = x1 + (x2 - x1) * t;
  const my = y1 + (y2 - y1) * t;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const tip = 5.5;
  const back = 4;
  const halfW = 3.2;
  const tipX = mx + Math.cos(ang) * tip;
  const tipY = my + Math.sin(ang) * tip;
  const bx = mx - Math.cos(ang) * back;
  const by = my - Math.sin(ang) * back;
  const perp = ang + Math.PI / 2;
  const p2x = bx + Math.cos(perp) * halfW;
  const p2y = by + Math.sin(perp) * halfW;
  const p3x = bx - Math.cos(perp) * halfW;
  const p3y = by - Math.sin(perp) * halfW;
  return (
    <polygon
      points={`${tipX},${tipY} ${p2x},${p2y} ${p3x},${p3y}`}
      fill="#ffffff"
      stroke="#1d4ed8"
      strokeWidth={1.25}
      strokeLinejoin="round"
      opacity={0.95}
      style={{ pointerEvents: "none" }}
    />
  );
}

function TextoOrdenPaso({
  x,
  y,
  paso,
  fontSize,
}: {
  x: number;
  y: number;
  paso: number;
  fontSize: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#ffffff"
      stroke="rgba(15,23,42,0.35)"
      strokeWidth={0.6}
      paintOrder="stroke fill"
      fontSize={fontSize}
      fontWeight={700}
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      {paso}
    </text>
  );
}

export function PatronViewer({
  patron,
  size = 220,
}: {
  patron: unknown;
  size?: number;
}) {
  const p = useMemo(() => normalizarPatron(patron), [patron]);
  const pts = useMemo(() => puntosSVG(size), [size]);
  const byIdx = useMemo(() => new Map(pts.map((t) => [t.idx, t])), [pts]);

  const segments = useMemo(() => {
    const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 1; i < p.length; i++) {
      const a = byIdx.get(p[i - 1]);
      const b = byIdx.get(p[i]);
      if (a && b) segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    return segs;
  }, [p, byIdx]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3"
        style={{ width: size + 24 }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((s, i) => (
            <line
              key={i}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="#2563eb"
              strokeWidth={10}
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}
          {segments.map((s, i) => (
            <FlechaSegmento
              key={`f-${i}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
            />
          ))}
          {pts.map((pt) => {
            const activo = p.includes(pt.idx);
            const esInicio = p.length > 0 && pt.idx === p[0];
            const paso = activo ? p.indexOf(pt.idx) + 1 : null;
            const fillRing = !activo
              ? "#f1f5f9"
              : esInicio
                ? "#dcfce7"
                : "#dbeafe";
            const strokeRing = !activo
              ? "#94a3b8"
              : esInicio
                ? "#16a34a"
                : "#2563eb";
            const fillDot = esInicio ? "#16a34a" : "#2563eb";
            const fs = Math.max(9, size * 0.048);
            return (
              <g key={pt.idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={18}
                  fill={fillRing}
                  stroke={strokeRing}
                  strokeWidth={3}
                />
                {activo && (
                  <>
                    <circle cx={pt.x} cy={pt.y} r={9} fill={fillDot} opacity={0.92} />
                    {paso != null && (
                      <TextoOrdenPaso x={pt.x} y={pt.y} paso={paso} fontSize={fs} />
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-xs text-slate-600">
        {p.length >= 2 ? `Patrón de ${p.length} puntos` : "Sin patrón guardado"}
      </p>
    </div>
  );
}

export function PatronDrawer({
  initial,
  onChange,
  size = 260,
}: {
  initial?: Patron;
  onChange: (patron: Patron) => void;
  size?: number;
}) {
  const pts = useMemo(() => puntosSVG(size), [size]);
  const byIdx = useMemo(() => new Map(pts.map((t) => [t.idx, t])), [pts]);

  const [patron, setPatron] = useState<Patron>(() => normalizarPatron(initial));
  const [dragging, setDragging] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const next = normalizarPatron(initial);
    setPatron((prev) => (patronIguales(prev, next) ? prev : next));
  }, [initial]);

  useEffect(() => {
    onChangeRef.current(patron);
  }, [patron]);

  const segments = useMemo(() => {
    const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 1; i < patron.length; i++) {
      const a = byIdx.get(patron[i - 1]);
      const b = byIdx.get(patron[i]);
      if (a && b) segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    return segs;
  }, [patron, byIdx]);

  const tail = useMemo(() => {
    if (!dragging || !cursor || patron.length === 0) return null;
    const last = byIdx.get(patron[patron.length - 1]);
    if (!last) return null;
    return { x1: last.x, y1: last.y, x2: cursor.x, y2: cursor.y };
  }, [dragging, cursor, patron, byIdx]);

  function eventToLocal(e: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    // map DOM px to viewBox coords (size)
    return { x: (x / rect.width) * size, y: (y / rect.height) * size };
  }

  function tryAdd(idx: number) {
    setPatron((prev) => {
      if (prev.includes(idx)) return prev;
      if (prev.length) {
        const mid = puntoIntermedio(prev[prev.length - 1], idx);
        if (mid != null && !prev.includes(mid)) return [...prev, mid, idx];
      }
      return [...prev, idx];
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3">
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          onPointerDown={(e) => {
            (e.currentTarget as any).setPointerCapture?.(e.pointerId);
            setDragging(true);
            setCursor(eventToLocal(e));
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            setCursor(eventToLocal(e));
          }}
          onPointerUp={() => {
            setDragging(false);
            setCursor(null);
          }}
          className="touch-none select-none"
        >
          {segments.map((s, i) => (
            <line
              key={i}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="#2563eb"
              strokeWidth={10}
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}
          {segments.map((s, i) => (
            <FlechaSegmento
              key={`f-${i}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
            />
          ))}
          {tail && (
            <line
              x1={tail.x1}
              y1={tail.y1}
              x2={tail.x2}
              y2={tail.y2}
              stroke="#2563eb"
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.35}
            />
          )}

          {pts.map((pt) => {
            const activo = patron.includes(pt.idx);
            const esInicio = patron.length > 0 && pt.idx === patron[0];
            const paso = activo ? patron.indexOf(pt.idx) + 1 : null;
            const fillRing = !activo
              ? "#f1f5f9"
              : esInicio
                ? "#dcfce7"
                : "#dbeafe";
            const strokeRing = !activo
              ? "#94a3b8"
              : esInicio
                ? "#16a34a"
                : "#2563eb";
            const fillDot = esInicio ? "#16a34a" : "#2563eb";
            const fs = Math.max(10, size * 0.044);
            return (
              <g key={pt.idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={20}
                  fill={fillRing}
                  stroke={strokeRing}
                  strokeWidth={3}
                  onPointerEnter={() => {
                    if (!dragging) return;
                    tryAdd(pt.idx);
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    tryAdd(pt.idx);
                  }}
                />
                {activo && (
                  <>
                    <circle cx={pt.x} cy={pt.y} r={10} fill={fillDot} opacity={0.92} />
                    {paso != null && (
                      <TextoOrdenPaso x={pt.x} y={pt.y} paso={paso} fontSize={fs} />
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPatron([])}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Borrar
        </button>
        <p className="text-xs text-slate-600">
          {patron.length >= 2 ? `Patrón de ${patron.length} puntos` : "Dibujá el patrón"}
        </p>
      </div>
    </div>
  );
}

