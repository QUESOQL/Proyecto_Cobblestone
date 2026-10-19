"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Gráficos en SVG a mano, siguiendo las reglas de app-screens de la taste skill:
 * 3-5 líneas de guía tenues, sin línea de eje Y, marcas de escala redondas por sobre el
 * máximo, barras con esquinas rectas, etiquetas X planas, un solo tono por gráfico y
 * leyenda solo cuando hay más de una serie (construida desde el mismo mapa que las barras).
 */

export interface Bar {
  label: string;
  value: number;
  /** Variante de la barra: "now" el tono pleno, "future" el tinte, "muted" gris. */
  kind?: "now" | "future" | "muted";
  /** Texto del tooltip. */
  title?: string;
}

function niceStep(max: number, ticks = 4) {
  const raw = max / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

const FILL = { now: "var(--accent)", future: "var(--accent-track)", muted: "#c7cbd1" } as const;

export function BarChart({
  bars,
  height = 220,
  reference,
  max: forcedMax,
  unit = "",
  ariaLabel,
}: {
  bars: Bar[];
  height?: number;
  reference?: { value: number; label: string };
  max?: number;
  unit?: string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const top = Math.max(forcedMax ?? 0, reference?.value ?? 0, ...bars.map((b) => b.value), 1);
  const step = niceStep(top);
  const maxTick = Math.ceil((top * 1.08) / step) * step;
  const ticks = Array.from({ length: Math.round(maxTick / step) + 1 }, (_, i) => i * step);

  const padL = 34;
  const padR = 8;
  const padT = reference ? 18 : 8;
  const padB = 26;
  const plotH = height - padT - padB;
  const plotW = W - padL - padR;
  const slot = plotW / bars.length;
  const barW = Math.min(44, slot * 0.62);
  const y = (v: number) => padT + plotH - (v / maxTick) * plotH;

  return (
    <div className="relative" ref={ref}>
      <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" aria-label={ariaLabel} className="block max-w-full overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#9aa0a6" : "var(--border)"} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)" className="num">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {reference && (
          <g>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke="var(--text)"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <text x={W - padR} y={y(reference.value) - 6} textAnchor="end" fontSize="11" fill="var(--text)">
              {reference.label}
            </text>
          </g>
        )}
        {bars.map((b, i) => {
          const x = padL + slot * i + (slot - barW) / 2;
          const h = Math.max(0, y(0) - y(b.value));
          return (
            <g key={b.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + slot * i} y={padT} width={slot} height={plotH} fill="transparent" />
              {/* Un cero no lleva marca: solo la línea base. */}
              {b.value > 0 && <rect x={x} y={y(b.value)} width={barW} height={h} fill={FILL[b.kind ?? "now"]} opacity={hover === null || hover === i ? 1 : 0.55} />}
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--muted)" className="num">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 rounded-[6px] bg-primary px-2 py-1 text-[12px] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
          style={{ left: `${((padL + slot * hover + slot / 2) / W) * 100}%`, transform: "translate(-50%, -110%)" }}
        >
          <span className="num whitespace-nowrap">{bars[hover].title ?? `${bars[hover].label}: ${bars[hover].value}${unit}`}</span>
        </div>
      )}
    </div>
  );
}

/** Lista ordenada con una barra fina proporcional bajo cada etiqueta; la primera en tinta. */
export function BarList({ rows, total }: { rows: { label: string; value: number; sub?: string }[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="flex flex-col">
      {rows.map((r, i) => (
        <li key={r.label} className="py-2">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate">{r.label}</span>
            <span className="num flex-none">
              {r.value}
              <span className="ml-1.5 text-[12px] text-muted">{total ? Math.round((r.value / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-[3px] w-full">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 88}%`, background: i === 0 ? "var(--text)" : "#c7cbd1" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
