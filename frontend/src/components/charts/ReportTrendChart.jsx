import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';

/**
 * Genera curvas continuas Bézier/Spline suaves (Catmull-Rom) sin quiebres poligonales rígidos
 */
const buildSmoothAreaPath = (points, width, height, maxY) => {
  if (!points.length || maxY <= 0) {
    return { line: '', area: '', coords: [] };
  }

  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((value, index) => {
    const x = Number((index * stepX).toFixed(2));
    const rawY = height - (Number(value || 0) / maxY) * height;
    const y = Number(Math.max(4, Math.min(height - 4, rawY)).toFixed(2));
    return { x, y, value: Number(value || 0) };
  });

  if (coords.length === 1) {
    const line = `M 0 ${coords[0].y} L ${width} ${coords[0].y}`;
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { line, area, coords };
  }

  let line = `M ${coords[0].x} ${coords[0].y}`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? i : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

    const cp1x = Number((p1.x + (p2.x - p0.x) / 6).toFixed(2));
    const cp1y = Number((p1.y + (p2.y - p0.y) / 6).toFixed(2));
    const cp2x = Number((p2.x - (p3.x - p1.x) / 6).toFixed(2));
    const cp2y = Number((p2.y - (p3.y - p1.y) / 6).toFixed(2));

    line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const area = `${line} L ${width.toFixed(2)} ${height.toFixed(2)} L 0 ${height.toFixed(2)} Z`;
  return { line, area, coords };
};

const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDayFullLabel = (fecha) => {
  if (!fecha) return '';
  const date = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleDateString('es-DO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).replace(/^\w/, (c) => c.toUpperCase());
};

const formatShortDate = (fecha) => {
  if (!fecha) return '';
  const date = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleDateString('es-DO', {
    day: 'numeric',
    month: 'short'
  });
};

/**
 * Gráfico de tendencia de entradas vs entregas con soporte de visualización temporal dinámico
 */
export const ReportTrendChart = ({
  serie = [],
  title = 'Flujo de Entradas vs. Entregas',
  subtitle = 'Evolución temporal de órdenes recibidas y despachadas',
  className = ''
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const containerRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(640);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setChartWidth(w);
      }
    };
    updateSize();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateSize);
      ro.observe(containerRef.current);
    } else {
      window.addEventListener('resize', updateSize);
    }

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const displaySerie = useMemo(() => {
    return Array.isArray(serie) ? serie : [];
  }, [serie]);

  const width = chartWidth;
  const height = 210;
  const padding = { top: 24, right: 30, bottom: 34, left: 36 };
  const chartW = Math.max(10, width - padding.left - padding.right);
  const chartH = Math.max(10, height - padding.top - padding.bottom);

  const maxY = Math.max(
    1,
    ...displaySerie.map((item) => Math.max(Number(item.entradas) || 0, Number(item.entregas) || 0))
  );
  const niceMax = Math.max(2, Math.ceil(maxY * 1.2));

  const entradasValues = displaySerie.map((item) => Number(item.entradas) || 0);
  const entregasValues = displaySerie.map((item) => Number(item.entregas) || 0);

  const totalEntradas = entradasValues.reduce((a, b) => a + b, 0);
  const totalEntregas = entregasValues.reduce((a, b) => a + b, 0);

  const entradasData = buildSmoothAreaPath(entradasValues, chartW, chartH, niceMax);
  const entregasData = buildSmoothAreaPath(entregasValues, chartW, chartH, niceMax);

  const ticks = [0, 0.5, 1].map((ratio) => Math.round(niceMax * ratio));

  const hoveredItem = hoveredIndex !== null && displaySerie[hoveredIndex] ? displaySerie[hoveredIndex] : null;
  const hoveredCoordEntradas = hoveredIndex !== null && entradasData.coords[hoveredIndex] ? entradasData.coords[hoveredIndex] : null;
  const hoveredCoordEntregas = hoveredIndex !== null && entregasData.coords[hoveredIndex] ? entregasData.coords[hoveredIndex] : null;

  const tooltipLeftPercent = hoveredIndex !== null && displaySerie.length > 1
    ? ((padding.left + (hoveredIndex * (chartW / (displaySerie.length - 1)))) / width) * 100
    : 50;

  // Fechas de inicio y fin para el eje X
  const firstDate = displaySerie[0]?.fecha;
  const lastDate = displaySerie[displaySerie.length - 1]?.fecha;
  const midDate = displaySerie[Math.floor(displaySerie.length / 2)]?.fecha;

  return (
    <div className={`rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between ${className}`}>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 font-outfit">
            {title}
          </h3>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-inter">
            {subtitle}
          </p>
        </div>

        {/* Resumen de totales y leyenda */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-neutral-600 dark:text-neutral-400">
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Entradas:</span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {totalEntradas}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-neutral-600 dark:text-neutral-400">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Entregas:</span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {totalEntregas}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas SVG con Tooltip Interactivo */}
      <div ref={containerRef} className="relative w-full select-none">
        {/* Tooltip Flotante */}
        {hoveredItem && (
          <div
            className="absolute pointer-events-none transition-all duration-150 z-20"
            style={{
              left: `${Math.min(85, Math.max(15, tooltipLeftPercent))}%`,
              top: '10px',
              transform: 'translate(-50%, 0)'
            }}
          >
            <div className="bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-xs border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-2.5 min-w-[155px] text-xs animate-in fade-in zoom-in-95 duration-100">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800/80 pb-1 mb-1.5 capitalize">
                {formatDayFullLabel(hoveredItem.fecha)}
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-neutral-600 dark:text-neutral-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    Entradas:
                  </span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                    {hoveredItem.entradas}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-neutral-600 dark:text-neutral-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Entregas:
                  </span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                    {hoveredItem.entregas}
                  </span>
                </div>
                {hoveredItem.monto_liquidado != null && Number(hoveredItem.monto_liquidado) > 0 && (
                  <div className="flex items-center justify-between gap-4 text-neutral-600 dark:text-neutral-300 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                    <span className="flex items-center gap-1.5 font-medium">
                      <DollarSign className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Cobrado:
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      RD$ {formatCurrency(hoveredItem.monto_liquidado)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {displaySerie.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-neutral-400">
            No hay datos de flujo para el período seleccionado
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-48 sm:h-52 select-none"
            role="img"
            aria-label="Tendencia de flujo de servicios"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="reportEntradasGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.00" />
              </linearGradient>
              <linearGradient id="reportEntregasGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Líneas horizontales de guía (Grid) */}
            {ticks.map((tick) => {
              const y = padding.top + chartH - (tick / niceMax) * chartH;
              return (
                <g key={`report-tick-${tick}`}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className="text-neutral-200/70 dark:text-neutral-800/80"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-neutral-400 dark:fill-neutral-500 text-[10px] font-mono font-medium"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Áreas y Curvas Bézier */}
            <g transform={`translate(${padding.left}, ${padding.top})`}>
              {entradasData.area && (
                <path d={entradasData.area} fill="url(#reportEntradasGrad)" />
              )}
              {entregasData.area && (
                <path d={entregasData.area} fill="url(#reportEntregasGrad)" />
              )}
              {entradasData.line && (
                <path
                  d={entradasData.line}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {entregasData.line && (
                <path
                  d={entregasData.line}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Guía vertical y puntos en Hover */}
              {hoveredIndex !== null && (
                <>
                  {hoveredCoordEntradas && (
                    <line
                      x1={hoveredCoordEntradas.x}
                      y1={0}
                      x2={hoveredCoordEntradas.x}
                      y2={chartH}
                      stroke="currentColor"
                      className="text-neutral-300 dark:text-neutral-700"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  )}
                  {hoveredCoordEntradas && (
                    <circle
                      cx={hoveredCoordEntradas.x}
                      cy={hoveredCoordEntradas.y}
                      r="4.5"
                      fill="#F43F5E"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="shadow-sm transition-all"
                    />
                  )}
                  {hoveredCoordEntregas && (
                    <circle
                      cx={hoveredCoordEntregas.x}
                      cy={hoveredCoordEntregas.y}
                      r="4.5"
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="shadow-sm transition-all"
                    />
                  )}
                </>
              )}
            </g>

            {/* Eje X Etiquetas (Inicio, Mitad, Fin) */}
            {firstDate && (
              <text
                x={padding.left}
                y={height - 10}
                textAnchor="start"
                className="fill-neutral-400 dark:fill-neutral-500 text-[10px] font-mono font-medium"
              >
                {formatShortDate(firstDate)}
              </text>
            )}
            {midDate && displaySerie.length > 5 && (
              <text
                x={padding.left + chartW / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-neutral-400 dark:fill-neutral-500 text-[10px] font-mono font-medium"
              >
                {formatShortDate(midDate)}
              </text>
            )}
            {lastDate && displaySerie.length > 1 && (
              <text
                x={width - padding.right}
                y={height - 10}
                textAnchor="end"
                className="fill-neutral-400 dark:fill-neutral-500 text-[10px] font-mono font-medium"
              >
                {formatShortDate(lastDate)}
              </text>
            )}

            {/* Zonas interactivas transparentes para capturar hover */}
            {displaySerie.map((_, index) => {
              const colWidth = chartW / Math.max(1, displaySerie.length - 1);
              const stepX = displaySerie.length > 1 ? chartW / (displaySerie.length - 1) : chartW;
              const x = padding.left + index * stepX - colWidth / 2;
              return (
                <rect
                  key={`trend-col-${index}`}
                  x={Math.max(0, x)}
                  y={0}
                  width={colWidth}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onTouchStart={() => setHoveredIndex(index)}
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

export default ReportTrendChart;
