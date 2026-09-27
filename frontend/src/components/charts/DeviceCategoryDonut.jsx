import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  Smartphone,
  Tablet,
  Laptop,
  Gamepad2,
  Watch,
  Package
} from 'lucide-react';

const getCategoryIcon = (categoria = '') => {
  const lower = String(categoria).toLowerCase();
  if (lower.includes('phone') || lower.includes('celular') || lower.includes('smart')) return Smartphone;
  if (lower.includes('laptop') || lower.includes('comput') || lower.includes('pc') || lower.includes('mac')) return Laptop;
  if (lower.includes('tab') || lower.includes('ipad')) return Tablet;
  if (lower.includes('cons') || lower.includes('juego') || lower.includes('play')) return Gamepad2;
  if (lower.includes('watch') || lower.includes('reloj')) return Watch;
  return Package;
};

// Paleta corporativa institucional
const BRAND_RED_LIGHT = '#DC2626'; // Rojo 600 corporativo
const BRAND_RED_DARK = '#EF4444';  // Rojo 500 para alto contraste en modo oscuro

const SLATE_SCALE_LIGHT = [
  '#334155', // Slate 700
  '#475569', // Slate 600
  '#64748B', // Slate 500
  '#94A3B8', // Slate 400
  '#CBD5E1', // Slate 300
  '#E2E8F0'  // Slate 200
];

const SLATE_SCALE_DARK = [
  '#E2E8F0', // Slate 200
  '#CBD5E1', // Slate 300
  '#94A3B8', // Slate 400
  '#64748B', // Slate 500
  '#475569', // Slate 600
  '#334155'  // Slate 700
];

/**
 * Gráfico Donut de Categorías de Dispositivos reutilizable con diseño premium
 */
export const DeviceCategoryDonut = ({
  data = [],
  title = 'Categorías de Dispositivos',
  subtitle = 'Distribución de trabajos atendidos',
  className = '',
  mostrarDetalle = true,
  periodLabel = 'En el período'
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  // Normalización de items si viene como array o como { total_mes, items }
  const rawItems = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  }, [data]);

  const totalPeriodo = useMemo(() => {
    if (!Array.isArray(data) && data?.total_mes != null) {
      return Number(data.total_mes) || 0;
    }
    return rawItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  }, [data, rawItems]);

  const items = useMemo(() => {
    return rawItems.map((item) => {
      const tot = Number(item.total) || 0;
      const pct = item.porcentaje != null
        ? Number(item.porcentaje)
        : totalPeriodo > 0
          ? Math.round((tot / totalPeriodo) * 1000) / 10
          : 0;
      return {
        ...item,
        total: tot,
        porcentaje: pct
      };
    });
  }, [rawItems, totalPeriodo]);

  const activeSegments = useMemo(() => {
    return items.filter((item) => (Number(item.total) || 0) > 0);
  }, [items]);

  const legendItems = useMemo(() => {
    return items
      .map((item, idx) => ({ ...item, originalIndex: idx }))
      .filter((item) => (Number(item.total) || 0) > 0);
  }, [items]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
  }, [items]);

  const maxTotal = sortedItems.length > 0 ? (Number(sortedItems[0].total) || 0) : 0;

  const getItemColor = useCallback((item) => {
    if (!item) return isDark ? '#94A3B8' : '#64748B';

    const rank = sortedItems.findIndex(
      (s) => (s.id && item.id && s.id === item.id) || s.categoria === item.categoria
    );

    if (rank === 0 && maxTotal > 0) {
      return isDark ? BRAND_RED_DARK : BRAND_RED_LIGHT;
    }

    const secondaryIdx = Math.max(0, rank <= 0 ? 0 : rank - 1);
    const scale = isDark ? SLATE_SCALE_DARK : SLATE_SCALE_LIGHT;
    return scale[secondaryIdx % scale.length];
  }, [sortedItems, maxTotal, isDark]);

  const cx = 110;
  const cy = 110;
  const R = 74;
  const C = 2 * Math.PI * R; // ~464.95

  const segmentsData = useMemo(() => {
    if (totalPeriodo === 0 || activeSegments.length === 0) return [];

    let accumulatedFraction = 0;
    const isSingle = activeSegments.length === 1;

    return activeSegments.map((item) => {
      const fraction = (Number(item.total) || 0) / totalPeriodo;
      const segmentPx = fraction * C;

      const gapPx = isSingle ? 0 : Math.min(22, Math.max(14, segmentPx * 0.25));
      const effectivePx = isSingle ? C : Math.max(1, segmentPx - gapPx);
      const offsetPx = isSingle ? 0 : -(accumulatedFraction * C + gapPx / 2);

      accumulatedFraction += fraction;
      const color = getItemColor(item);

      return {
        ...item,
        color,
        effectivePx,
        offsetPx,
        originalIndex: items.findIndex((orig) => (orig.id && orig.id === item.id) || orig.categoria === item.categoria)
      };
    });
  }, [activeSegments, totalPeriodo, C, items, getItemColor]);

  const hoveredItem = hoveredIndex !== null && items[hoveredIndex] ? items[hoveredIndex] : null;
  const hoveredColor = hoveredItem ? getItemColor(hoveredItem) : (isDark ? BRAND_RED_DARK : BRAND_RED_LIGHT);
  const HoveredIcon = hoveredItem ? getCategoryIcon(hoveredItem.categoria) : Package;

  const handleMouseMove = (e, item, color) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      item,
      color
    });
  };

  return (
    <div className={`rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col ${mostrarDetalle ? 'justify-between' : ''} ${className}`}>
      {/* Encabezado */}
      <div className="mb-2 sm:mb-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 font-outfit">
          {title}
        </h3>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-inter">
          {subtitle}
        </p>
      </div>

      {/* Donut SVG Interactivo */}
      <div
        ref={containerRef}
        className={`relative flex items-center justify-center select-none ${
          mostrarDetalle ? 'my-2' : 'flex-1 my-auto py-4 sm:py-6'
        }`}
        onMouseLeave={() => {
          setHoveredIndex(null);
          setTooltip(null);
        }}
      >
        {/* Tooltip flotante interactivo */}
        {tooltip && (() => {
          const TooltipIcon = getCategoryIcon(tooltip.item.categoria);
          const count = Number(tooltip.item.total) || 0;
          const labelTrabajo = count === 1 ? 'dispositivo' : 'dispositivos';

          return (
            <div
              className="absolute pointer-events-none z-30 transition-all duration-75"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-xl px-3 py-2 min-w-[140px] whitespace-nowrap text-xs -mt-2 animate-in fade-in zoom-in-95 duration-75">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100">
                  <TooltipIcon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: tooltip.color }}
                  />
                  <span>{tooltip.item.categoria}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs mt-1">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-100 tabular-nums">
                    {tooltip.item.total} {labelTrabajo}
                  </span>
                  <span className="text-neutral-400 dark:text-neutral-600 font-normal">·</span>
                  <span className="font-medium text-neutral-500 dark:text-neutral-400 text-xs tabular-nums">
                    {tooltip.item.porcentaje}%
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        <svg
          viewBox="0 0 220 220"
          className={`${
            mostrarDetalle ? 'w-48 h-48 sm:w-52 sm:h-52' : 'w-56 h-56 sm:w-64 sm:h-64'
          } overflow-visible transition-all duration-300`}
          role="img"
          aria-label="Distribución por categoría de dispositivos"
        >
          {/* Pista circular de fondo */}
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={14}
            className="text-neutral-100 dark:text-neutral-800/60"
          />

          {/* Segmentos de la Dona */}
          {totalPeriodo === 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={14}
              className="text-neutral-200 dark:text-neutral-800"
              strokeDasharray="4 6"
            />
          ) : (
            segmentsData.map((seg, idx) => {
              const isHovered = hoveredIndex === seg.originalIndex;
              return (
                <circle
                  key={`donut-seg-${seg.id || seg.categoria || idx}`}
                  cx={cx}
                  cy={cy}
                  r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? 21 : 14}
                  strokeDasharray={`${seg.effectivePx} ${C - seg.effectivePx}`}
                  strokeDashoffset={seg.offsetPx}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    opacity: hoveredIndex !== null && !isHovered ? 0.35 : 1,
                    filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.20))' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    setHoveredIndex(seg.originalIndex);
                    handleMouseMove(e, seg, seg.color);
                  }}
                  onMouseMove={(e) => {
                    handleMouseMove(e, seg, seg.color);
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setTooltip(null);
                  }}
                />
              );
            })
          )}
        </svg>

        {/* Centro de la Dona */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
          {hoveredItem ? (
            <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-150">
              <span
                className={`font-extrabold font-outfit tracking-tight leading-none tabular-nums ${
                  mostrarDetalle ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-3xl'
                }`}
                style={{ color: hoveredColor }}
              >
                {hoveredItem.porcentaje}%
              </span>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 flex items-center justify-center gap-1.5 max-w-[130px] font-outfit truncate">
                <HoveredIcon className="w-3.5 h-3.5 shrink-0" style={{ color: hoveredColor }} />
                <span className="truncate">{hoveredItem.categoria}</span>
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium tabular-nums font-mono mt-0.5">
                {hoveredItem.total} {hoveredItem.total === 1 ? 'dispositivo' : 'dispositivos'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center transition-all duration-200">
              <span
                className={`font-extrabold text-neutral-900 dark:text-neutral-50 font-outfit tracking-tight leading-none tabular-nums ${
                  mostrarDetalle ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
                }`}
              >
                {totalPeriodo}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-1 font-inter">
                {totalPeriodo === 1 ? 'Dispositivo' : 'Dispositivos'}
              </span>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                {periodLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Leyenda Inferior */}
      {mostrarDetalle && legendItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {legendItems.map((item, idx) => {
              const CatIcon = getCategoryIcon(item.categoria);
              const color = getItemColor(item);
              const isHovered = hoveredIndex === item.originalIndex;

              return (
                <button
                  key={`cat-legend-${item.id || item.categoria || idx}`}
                  type="button"
                  onMouseEnter={() => setHoveredIndex(item.originalIndex)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-xl border transition-all text-left cursor-pointer ${
                    isHovered
                      ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800/70 shadow-2xs'
                      : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {CatIcon ? (
                      <CatIcon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color }}
                      />
                    ) : (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                      {item.categoria}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {item.total}
                    </span>
                    <span className="text-neutral-400 text-[10px] tabular-nums">
                      ({item.porcentaje}%)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceCategoryDonut;
