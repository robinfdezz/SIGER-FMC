import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSkeleton from './DashboardSkeleton';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Contact,
  DollarSign,
  Equal,
  Flame,
  Gamepad2,
  Home,
  Laptop,
  Layers,
  Package,
  PackageCheck,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  Tablet,
  Ticket,
  Users,
  UserX,
  Watch,
  Wrench,
  XCircle,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/common/Badge';
import Select from '../../components/common/Select';
import SimpleButton from '../../components/common/SimpleButton';
import AnimatedIconButton from '../../components/common/AnimatedIconButton';
import { RotateCw } from 'lucide';
import AnimatedTabs from '../../components/common/AnimatedTabs';
import { getDashboardResumen } from '../../services/servicios.service';
import { getSucursales } from '../../services/catalogs.service';

const getCargaSaturationConfig = (porcentaje, isSinAsignar) => {
  if (isSinAsignar) {
    return {
      color: '#EF4444',
      textColor: 'text-red-600 dark:text-red-400'
    };
  }
  if (porcentaje < 40) {
    return {
      color: '#F59E0B',
      textColor: 'text-amber-600 dark:text-amber-400'
    };
  }
  if (porcentaje <= 75) {
    return {
      color: '#F97316',
      textColor: 'text-orange-600 dark:text-orange-400'
    };
  }
  return {
    color: '#EF4444',
    textColor: 'text-red-600 dark:text-red-400'
  };
};

const formatCurrency = (value, decimals = 2) => {
  const amount = Number(value) || 0;
  return amount.toLocaleString('es-DO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const formatDayLabel = (fecha) => {
  if (!fecha) return '';
  const date = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric' })
    .replace('.', '')
    .replace(/^\w/, (c) => c.toUpperCase());
};

const formatDayFullLabel = (fecha) => {
  if (!fecha) return '';
  const date = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  }).replace(/^\w/, (c) => c.toUpperCase());
};

const formatTodayLabel = () => {
  const now = new Date();
  return now.toLocaleDateString('es-DO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getInitials = (name = '') => {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const shortTechName = (fullName = '') => {
  if (!fullName || fullName === 'Sin asignar') return 'Sin asignar';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
};

const getPrioridadConfig = (prioridad) => {
  switch (String(prioridad || '').toLowerCase()) {
    case 'urgente':
      return {
        label: 'Urgente',
        color: 'danger',
        icon: <Flame className="w-3.5 h-3.5 fill-current" />
      };
    case 'alta':
      return {
        label: 'Alta',
        color: 'warning',
        icon: ChevronsUp
      };
    case 'media':
      return {
        label: 'Media',
        color: 'info',
        icon: Equal
      };
    case 'baja':
    default:
      return {
        label: 'Baja',
        color: 'neutral',
        icon: ChevronsDown
      };
  }
};

const normalizeEstadoKey = (estado) => {
  if (!estado) return '';
  if (typeof estado === 'string') {
    const s = estado.toUpperCase().trim();
    if (s.includes('LISTO')) return 'LISTO_ENTREGA';
    if (s.includes('ENTREG')) return 'ENTREGADO';
    if (s.includes('RECIB')) return 'RECIBIDO';
    if (s.includes('DIAGN')) return 'EN_DIAGNOSTICO';
    if (s.includes('ESPERA') || s.includes('REPUESTO')) return 'ESPERA_REPUESTO';
    if (s.includes('REPARAC') || s.includes('PROCESO')) return 'EN_REPARACION';
    if (s.includes('CALIDAD') || s.includes('CONTROL')) return 'CONTROL_CALIDAD';
    if (s.includes('CANCEL') || s.includes('DEVUELT')) return 'CANCELADO';
    return s;
  }
  const cod = (estado.codigo_estado || estado.codigo || '').toUpperCase().trim();
  const nom = (estado.nombre_estado || estado.nombre || '').toUpperCase().trim();

  if (cod.includes('LISTO') || nom.includes('LISTO')) return 'LISTO_ENTREGA';
  if (
    (cod.includes('ENTREG') || nom.includes('ENTREG')) &&
    !cod.includes('LISTO') &&
    !nom.includes('LISTO')
  ) {
    return 'ENTREGADO';
  }

  if (cod.includes('RECIB') || nom.includes('RECIB')) return 'RECIBIDO';
  if (cod.includes('DIAGN') || nom.includes('DIAGN')) return 'EN_DIAGNOSTICO';
  if (cod.includes('ESPERA') || nom.includes('ESPERA') || cod.includes('REPUESTO') || nom.includes('REPUESTO')) return 'ESPERA_REPUESTO';
  if (cod.includes('REPARAC') || nom.includes('REPARAC') || cod.includes('PROCESO') || nom.includes('PROCESO')) return 'EN_REPARACION';
  if (cod.includes('CALIDAD') || nom.includes('CALIDAD') || cod.includes('CONTROL') || nom.includes('CONTROL')) return 'CONTROL_CALIDAD';
  if (cod.includes('CANCEL') || nom.includes('CANCEL') || nom.includes('DEVUELT')) return 'CANCELADO';

  return cod || nom;
};

const getEstadoIcon = (estado) => {
  const key = normalizeEstadoKey(estado);
  switch (key) {
    case 'RECIBIDO':
      return Package;
    case 'EN_DIAGNOSTICO':
      return Search;
    case 'ESPERA_REPUESTO':
      return Clock;
    case 'EN_REPARACION':
      return Wrench;
    case 'CONTROL_CALIDAD':
      return ClipboardCheck;
    case 'LISTO_ENTREGA':
      return PackageCheck;
    case 'ENTREGADO':
      return CheckCircle2;
    case 'CANCELADO':
      return XCircle;
    default:
      return Package;
  }
};

const shortEstadoName = (nombre = '') => {
  return String(nombre)
    .replace(/^En\s+/i, '')
    .replace(/\s*\/\s*.*$/, '')
    .replace(/\s+de\s+/i, ' de ')
    .trim();
};

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

const IncomeAreaChart = ({ data = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const containerRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(320);

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

  const displayList = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data;
  }, [data]);

  const width = chartWidth;
  const height = 66;
  const padding = { top: 12, right: 12, bottom: 8, left: 12 };
  const chartW = Math.max(10, width - padding.left - padding.right);
  const chartH = Math.max(10, height - padding.top - padding.bottom);

  const values = displayList.map((item) => Number(item.monto) || 0);
  const maxY = Math.max(1, ...values);
  const niceMax = Math.max(1, Math.ceil(maxY * 1.15));

  const chartData = buildSmoothAreaPath(values, chartW, chartH, niceMax);

  const hoveredItem = hoveredIndex !== null && displayList[hoveredIndex] ? displayList[hoveredIndex] : null;
  const hoveredCoord = hoveredIndex !== null && chartData.coords[hoveredIndex] ? chartData.coords[hoveredIndex] : null;

  const tooltipLeftPercent = hoveredIndex !== null && displayList.length > 1
    ? ((padding.left + (hoveredIndex * (chartW / (displayList.length - 1)))) / width) * 100
    : 50;

  if (displayList.length === 0) {
    return <div ref={containerRef} className="h-[66px] w-full" />;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[66px] select-none"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {/* Tooltip interactivo flotante tipo Entradas vs Entregas */}
      {hoveredItem && (
        <div
          className="absolute pointer-events-none -top-2 transform -translate-x-1/2 -translate-y-full bg-neutral-900/95 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] py-1 px-2.5 rounded-lg shadow-md whitespace-nowrap z-20 font-medium flex items-center gap-1.5 transition-all duration-75 border border-neutral-700/60 dark:border-neutral-200"
          style={{ left: `${Math.min(90, Math.max(10, tooltipLeftPercent))}%` }}
        >
          <span className="text-neutral-400 dark:text-neutral-500 font-normal">
            {formatDayLabel(hoveredItem.fecha)}:
          </span>
          <span className="font-bold font-mono text-emerald-400 dark:text-emerald-600">
            RD$ {formatCurrency(hoveredItem.monto)}
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="incomeAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Área degradada esmeralda suave */}
          {chartData.area && (
            <path d={chartData.area} fill="url(#incomeAreaFill)" />
          )}

          {/* Curva suave Bezier tipo Spline */}
          {chartData.line && (
            <path
              d={chartData.line}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Indicador de punto y línea vertical en hover */}
          {hoveredIndex !== null && hoveredCoord && (
            <>
              <line
                x1={hoveredCoord.x}
                y1={0}
                x2={hoveredCoord.x}
                y2={chartH}
                stroke="currentColor"
                className="text-neutral-300 dark:text-neutral-700"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={hoveredCoord.x}
                cy={hoveredCoord.y}
                r="4.5"
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="shadow-sm transition-all"
              />
            </>
          )}
        </g>

        {/* Zonas interactivas transparentes para capturar hover */}
        {displayList.map((_, index) => {
          const colWidth = chartW / Math.max(1, displayList.length - 1);
          const stepX = displayList.length > 1 ? chartW / (displayList.length - 1) : chartW;
          const x = padding.left + index * stepX - colWidth / 2;
          return (
            <rect
              key={`income-hover-${index}`}
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
    </div>
  );
};

const RANGE_TABS = [
  { id: '7d', label: '7 días' },
  { id: '14d', label: '14 días' },
  { id: '30d', label: '30 días' }
];

const TrendChart = ({ serie = [] }) => {
  const [activeRange, setActiveRange] = useState('7d');
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
    if (!Array.isArray(serie) || serie.length === 0) return [];
    if (activeRange === '7d') return serie.slice(-7);
    if (activeRange === '14d') return serie.slice(-14);
    if (activeRange === '30d') return serie.slice(-30);
    return serie;
  }, [serie, activeRange]);

  const width = chartWidth;
  const height = 190;
  const padding = { top: 20, right: 28, bottom: 30, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxY = Math.max(
    1,
    ...displaySerie.map((item) => Math.max(Number(item.entradas) || 0, Number(item.entregas) || 0))
  );
  const niceMax = Math.max(2, Math.ceil(maxY * 1.2));

  const entradasValues = displaySerie.map((item) => Number(item.entradas) || 0);
  const entregasValues = displaySerie.map((item) => Number(item.entregas) || 0);

  const entradasData = buildSmoothAreaPath(entradasValues, chartW, chartH, niceMax);
  const entregasData = buildSmoothAreaPath(entregasValues, chartW, chartH, niceMax);

  const ticks = [0, 0.5, 1].map((ratio) => Math.round(niceMax * ratio));

  const hoveredItem = hoveredIndex !== null && displaySerie[hoveredIndex] ? displaySerie[hoveredIndex] : null;
  const hoveredCoordEntradas = hoveredIndex !== null && entradasData.coords[hoveredIndex] ? entradasData.coords[hoveredIndex] : null;
  const hoveredCoordEntregas = hoveredIndex !== null && entregasData.coords[hoveredIndex] ? entregasData.coords[hoveredIndex] : null;

  const tooltipLeftPercent = hoveredIndex !== null && displaySerie.length > 1
    ? ((padding.left + (hoveredIndex * (chartW / (displaySerie.length - 1)))) / width) * 100
    : 50;

  return (
    <div className="mt-5">
      {/* Cabecera del gráfico: Título, selector de rango estilo tabs y leyenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
            Entradas vs Entregas
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-inter">
            Comparativa de flujo de órdenes recibidas y despachadas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Rango Rápido con AnimatedTabs homologado */}
          <AnimatedTabs
            items={RANGE_TABS}
            value={activeRange}
            onChange={setActiveRange}
            size="sm"
          />

          {/* Leyenda con iconos representativos homologados de flujo */}
          <div className="flex items-center gap-3.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <span className="inline-flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Entradas</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Entregas</span>
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas con Tooltip Interactivo */}
      <div ref={containerRef} className="relative w-full">
        {/* Tooltip Flotante Elevado */}
        {hoveredItem && (
          <div
            className="absolute pointer-events-none transition-all duration-150 z-20"
            style={{
              left: `${Math.min(85, Math.max(15, tooltipLeftPercent))}%`,
              top: '15px',
              transform: 'translate(-50%, 0)'
            }}
          >
            <div className="bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-xs border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-2.5 min-w-[145px] text-xs animate-in fade-in zoom-in-95 duration-100">
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
              </div>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 select-none"
          role="img"
          aria-label="Entradas vs entregas"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="entradasSmoothFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="entregasSmoothFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Líneas de Guía Horizontales (Grid) */}
          {ticks.map((tick) => {
            const y = padding.top + chartH - (tick / niceMax) * chartH;
            return (
              <g key={`tick-${tick}`}>
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

          {/* Área y Curva de Entradas y Entregas (Bézier suave) */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {entradasData.area && (
              <path d={entradasData.area} fill="url(#entradasSmoothFill)" />
            )}
            {entregasData.area && (
              <path d={entregasData.area} fill="url(#entregasSmoothFill)" />
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

            {/* Puntos y Línea Guía Vertical al hacer hover */}
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

          {/* Etiquetas del Eje X (Días) */}
          {displaySerie.map((item, index) => {
            const stepX = displaySerie.length > 1 ? chartW / (displaySerie.length - 1) : chartW;
            const x = padding.left + index * stepX;
            const isFirst = index === 0;
            const isLast = index === displaySerie.length - 1;
            const isSingle = displaySerie.length <= 1;

            // Evitar solapamiento cuando hay 14 o 30 días: etiquetas base estables
            const shouldShowLabel =
              displaySerie.length <= 7 ||
              (displaySerie.length <= 14
                ? index % 2 === 0 || index === displaySerie.length - 1
                : index % 5 === 0 || index === displaySerie.length - 1);

            if (!shouldShowLabel) return null;

            // Ajuste de anclaje y margen de seguridad para evitar desbordes en los extremos
            const textAnchor = isSingle ? 'middle' : isLast ? 'end' : (isFirst ? 'start' : 'middle');
            const labelX = isSingle ? x : isLast ? Math.min(x + 12, width - 6) : (isFirst ? Math.max(x - 12, 6) : x);

            return (
              <text
                key={item.fecha || index}
                x={labelX}
                y={height - 8}
                textAnchor={textAnchor}
                className="text-[11px] font-medium fill-neutral-400 dark:fill-neutral-500"
              >
                {formatDayLabel(item.fecha)}
              </text>
            );
          })}

          {/* Zonas Invisibles para Interacción Táctil y Hover del Cursor */}
          {displaySerie.map((_, index) => {
            const colWidth = chartW / Math.max(1, displaySerie.length - 1);
            const stepX = displaySerie.length > 1 ? chartW / (displaySerie.length - 1) : chartW;
            const x = padding.left + index * stepX - colWidth / 2;
            return (
              <rect
                key={`hover-col-${index}`}
                x={Math.max(padding.left, x)}
                y={padding.top}
                width={colWidth}
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onTouchStart={() => setHoveredIndex(index)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const CATEGORY_ICONS = {
  'Smartphone': Smartphone,
  'Tablet / iPad': Tablet,
  'Laptop': Laptop,
  'Consola de Videojuegos': Gamepad2,
  'Smartwatch': Watch,
  'Otros': Package
};

const getCategoryIcon = (catName) => {
  if (CATEGORY_ICONS[catName]) return CATEGORY_ICONS[catName];
  const lower = (catName || '').toLowerCase();
  if (lower.includes('phone') || lower.includes('cel') || lower.includes('tel')) return Smartphone;
  if (lower.includes('lap') || lower.includes('pc') || lower.includes('compu')) return Laptop;
  if (lower.includes('tab') || lower.includes('ipad')) return Tablet;
  if (lower.includes('cons') || lower.includes('juego') || lower.includes('play')) return Gamepad2;
  if (lower.includes('watch') || lower.includes('reloj')) return Watch;
  return Package;
};

// Paleta corporativa institucional:
// Categoría líder / predominante del mes: Rojo institucional FMC
const BRAND_RED_LIGHT = '#DC2626'; // Rojo 600 corporativo
const BRAND_RED_DARK = '#EF4444';  // Rojo 500 para alto contraste en modo oscuro

// Categorías secundarias: Escala refinada de Slate / Neutros elegantes
const SLATE_SCALE_LIGHT = [
  '#334155', // Slate 700 - alta presencia visual
  '#475569', // Slate 600
  '#64748B', // Slate 500
  '#94A3B8', // Slate 400
  '#CBD5E1', // Slate 300
  '#E2E8F0'  // Slate 200
];

const SLATE_SCALE_DARK = [
  '#E2E8F0', // Slate 200 - nítido sobre fondo oscuro
  '#CBD5E1', // Slate 300
  '#94A3B8', // Slate 400
  '#64748B', // Slate 500
  '#475569', // Slate 600
  '#334155'  // Slate 700
];

const DeviceCategoryDonut = ({ data = {}, className = '', mostrarDetalle = false }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  let isDark = false;
  try {
    const themeContext = useTheme();
    isDark = Boolean(themeContext?.isDark);
  } catch {
    if (typeof document !== 'undefined') {
      isDark = document.documentElement.classList.contains('dark');
    }
  }

  const total_mes = Number(data?.total_mes) || 0;
  const rawItems = Array.isArray(data?.items) ? data.items : [];

  const items = useMemo(() => {
    return rawItems;
  }, [rawItems]);

  const activeSegments = useMemo(() => {
    return items.filter((item) => (Number(item.total) || 0) > 0);
  }, [items]);

  // Filtrado inteligente: sólo categorías con al menos 1 trabajo para la leyenda
  const legendItems = useMemo(() => {
    return items
      .map((item, idx) => ({ ...item, originalIndex: idx }))
      .filter((item) => (Number(item.total) || 0) > 0);
  }, [items]);

  // Ordenar items para determinar la categoría líder y el orden jerárquico de colores
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
  }, [items]);

  const maxTotal = sortedItems.length > 0 ? (Number(sortedItems[0].total) || 0) : 0;

  const getItemColor = useCallback((item) => {
    if (!item) return isDark ? '#94A3B8' : '#64748B';

    const rank = sortedItems.findIndex(
      (s) => (s.id && item.id && s.id === item.id) || s.categoria === item.categoria
    );

    // Categoría predominante (con mayor volumen en el mes) -> Rojo corporativo
    if (rank === 0 && maxTotal > 0) {
      return isDark ? BRAND_RED_DARK : BRAND_RED_LIGHT;
    }

    // Categorías secundarias -> Escala degradada de slate/neutros
    const secondaryIdx = Math.max(0, rank <= 0 ? 0 : rank - 1);
    const scale = isDark ? SLATE_SCALE_DARK : SLATE_SCALE_LIGHT;
    return scale[secondaryIdx % scale.length];
  }, [sortedItems, maxTotal, isDark]);

  const cx = 110;
  const cy = 110;
  const R = 74;
  const C = 2 * Math.PI * R; // ~464.95

  const segmentsData = useMemo(() => {
    if (total_mes === 0 || activeSegments.length === 0) return [];

    let accumulatedFraction = 0;
    const isSingle = activeSegments.length === 1;

    return activeSegments.map((item, idx) => {
      const fraction = (Number(item.total) || 0) / total_mes;
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
  }, [activeSegments, total_mes, C, items, getItemColor]);

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
      {/* Encabezado limpio */}
      <div className="mb-2 sm:mb-3">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 font-outfit">
          Categorías de Dispositivos
        </h3>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-inter">
          Distribución de trabajos realizados este mes
        </p>
      </div>

      {/* Donut SVG Interactivo (Centrado vertical y horizontalmente cuando no hay detalle) */}
      <div
        ref={containerRef}
        className={`relative flex items-center justify-center select-none ${mostrarDetalle ? 'my-2' : 'flex-1 my-auto py-4 sm:py-6'
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
          const labelTrabajo = count === 1 ? 'trabajo' : 'trabajos';

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
          className={`${mostrarDetalle
              ? 'w-48 h-48 sm:w-52 sm:h-52'
              : 'w-56 h-56 sm:w-64 sm:h-64'
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

          {/* Segmentos de la Dona con extremos redondeados */}
          {total_mes === 0 ? (
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

        {/* Centro de la Dona (Dinámico con Hover) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
          {hoveredItem ? (
            <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-150">
              <span
                className={`font-extrabold font-outfit tracking-tight leading-none tabular-nums ${mostrarDetalle ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-3xl'
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
                {hoveredItem.total} {hoveredItem.total === 1 ? 'orden' : 'órdenes'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center transition-all duration-200">
              <span className={`font-extrabold text-neutral-900 dark:text-neutral-50 font-outfit tracking-tight leading-none tabular-nums ${mostrarDetalle ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
                }`}>
                {total_mes}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-1 font-inter">
                {total_mes === 1 ? 'Trabajo' : 'Trabajos'}
              </span>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                Este mes
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Leyenda Inferior (solo si mostrarDetalle === true y hay categorías con órdenes) */}
      {mostrarDetalle && legendItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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
                  className={`flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-xl border transition-all text-left cursor-pointer ${isHovered
                      ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800/70 shadow-2xs'
                      : 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                    }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CatIcon
                      className="w-3.5 h-3.5 shrink-0 transition-transform"
                      style={{
                        color: color,
                        transform: isHovered ? 'scale(1.15)' : 'scale(1)'
                      }}
                    />
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate" title={item.categoria}>
                      {item.categoria}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-xs">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-100 tabular-nums font-mono">
                      {item.total}
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-600 font-normal">·</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal tabular-nums">
                      {item.porcentaje}%
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

const KpiCard = ({ title, value, badge, icon: Icon }) => {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {title}
          </p>
          {Icon && (
            <Icon className="w-5 h-5 shrink-0 text-red-600 dark:text-red-500" />
          )}
        </div>

        <div className="mt-2">
          <p className="text-3xl sm:text-[2.25rem] font-bold font-outfit leading-none tracking-tight text-neutral-900 dark:text-neutral-50">
            {value}
          </p>
        </div>
      </div>

      {badge ? (
        <div className="mt-3 flex items-center gap-1.5 min-w-0">
          <Badge
            variant="minimal"
            color={badge.color || 'neutral'}
            icon={badge.type === 'up' ? ArrowUpRight : (badge.type === 'down' ? ArrowDownRight : null)}
            showDot={!badge.type}
            size="sm"
            className="text-[11px] font-medium"
          >
            {badge.text}
          </Badge>
          {badge.subtext ? (
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
              {badge.subtext}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isSuperAdmin = user?.rol_nombre === 'SuperAdmin';
  const roleName = String(user?.rol_nombre || '').toLowerCase();
  const isTecnico = roleName.includes('tecnic') || Boolean(data?.kpis?.es_tecnico);
  const canViewFinances = Boolean(data?.kpis?.can_view_finances ?? (!isTecnico && (isSuperAdmin || roleName.includes('admin'))));

  const [sucursales, setSucursales] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Cargar catálogo de sucursales para SuperAdmin
  useEffect(() => {
    if (isSuperAdmin) {
      getSucursales()
        .then((res) => {
          if (res?.ok && Array.isArray(res.data)) {
            setSucursales(res.data);
          } else if (Array.isArray(res)) {
            setSucursales(res);
          }
        })
        .catch((err) => console.error('Error al cargar catálogo de sucursales:', err));
    }
  }, [isSuperAdmin]);

  const loadDashboard = useCallback(async (silent = false, branchId = selectedBranch) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {};
      if (isSuperAdmin && branchId && branchId !== 'all') {
        params.sucursal_id = branchId;
      }

      const response = await getDashboardResumen(params);
      if (!response?.ok && !response?.success) {
        throw new Error(response?.message || 'No se pudo cargar el dashboard');
      }
      setData(response.data || null);
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error al cargar el resumen operativo');
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin, selectedBranch]);

  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefresh = async () => {
    const success = await loadDashboard(true, selectedBranch);
    if (success) {
      setRefreshSuccess(true);
    }
  };

  useEffect(() => {
    loadDashboard(false, selectedBranch);
  }, [selectedBranch]);

  const kpis = data?.kpis || {};
  const flujo = data?.flujo || [];
  const serie = data?.serie_30d || data?.serie_dias || data?.serie_7d || [];
  const carga = data?.carga_tecnicos || [];
  const actividad = data?.actividad_reciente || [];

  const totalEnFlujo = useMemo(
    () => flujo.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
    [flujo]
  );

  const totalCarga = useMemo(
    () => carga.reduce((sum, item) => sum + (Number(item.ordenes) || 0), 0),
    [carga]
  );

  const branchOptions = useMemo(() => [
    {
      id: 'all',
      label: 'Todas las sucursales',
      supportingText: 'Consolidado global',
      icon: Building2
    },
    ...sucursales.map((suc) => ({
      id: String(suc.id),
      label: suc.nombre_sucursal || suc.nombre,
      supportingText: suc.codigo_sucursal ? `Código: ${suc.codigo_sucursal}` : undefined,
      icon: Building2
    }))
  ], [sucursales]);

  const selectedBranchData = useMemo(() => {
    if (!isSuperAdmin || selectedBranch === 'all') return null;
    return sucursales.find((s) => String(s.id) === String(selectedBranch)) || null;
  }, [isSuperAdmin, selectedBranch, sucursales]);

  const branchLabel = useMemo(() => {
    if (isSuperAdmin) {
      if (selectedBranchData) {
        return `${selectedBranchData.nombre_sucursal}${selectedBranchData.codigo_sucursal ? ` · ${selectedBranchData.codigo_sucursal}` : ''}`;
      }
      return 'Todas las sucursales · Vista global';
    }
    return user?.sucursal_nombre
      ? `${user.sucursal_nombre}${user.sucursal_codigo ? ` · ${user.sucursal_codigo}` : ''}`
      : 'Franyer Mobile Center';
  }, [isSuperAdmin, selectedBranchData, user]);

  const trendDiff = useMemo(() => {
    if (kpis.ingresos_mes_anterior === null || kpis.ingresos_mes_anterior === undefined) return null;
    const actual = Number(kpis.ingresos_mes || 0);
    const anterior = Number(kpis.ingresos_mes_anterior || 0);
    if (anterior === 0) {
      if (actual > 0) {
        return {
          isUp: true,
          percentageText: '+100%',
          colorClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60'
        };
      }
      return null;
    }
    const diff = Math.round(((actual - anterior) / anterior) * 100);
    const isUp = diff >= 0;
    return {
      isUp,
      percentageText: `${isUp ? '+' : ''}${diff}%`,
      colorClass: isUp
        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60'
        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60'
    };
  }, [kpis.ingresos_mes, kpis.ingresos_mes_anterior]);

  const canCreateOrder = !roleName.includes('tecnic');

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px] mx-auto w-full">
        {loading ? (
          <DashboardSkeleton
            isSuperAdmin={isSuperAdmin}
            isTecnico={isTecnico}
            canViewFinances={canViewFinances}
            canCreateOrder={canCreateOrder}
          />
        ) : (
          <>
            {/* Cabecera Superior: Columna Principal + Acciones Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
              {/* Columna Principal */}
              <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between gap-4">
                {/* Banner / Encabezado Abierto (conserva dimensiones del bloque sin estilo de recuadro) */}
                <div className="rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        <Home className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        <span className="truncate">{branchLabel}</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 font-outfit">
                        ¡Bienvenido de nuevo, {user?.nombre || 'Usuario'}!
                      </h1>
                      <div className="flex flex-wrap items-center gap-3 pt-0.5">
                        <p className="text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 font-inter">
                          Resumen operativo del taller — {formatTodayLabel()}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Sistema online</span>
                        </div>
                      </div>
                    </div>

                    {isSuperAdmin ? (
                      <div className="w-[180px] sm:w-[220px] self-start sm:self-center shrink-0">
                        <Select
                          value={selectedBranch}
                          onChange={(val) => setSelectedBranch(String(val))}
                          items={branchOptions}
                          placeholder="Todas las sucursales"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => loadDashboard(false, selectedBranch)}
                  className="shrink-0 font-semibold underline underline-offset-2"
                >
                  Reintentar
                </button>
              </div>
            ) : null}

            {/* KPIs Operacionales */}
                {isTecnico ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <KpiCard
                      title="Mis órdenes asignadas"
                      value={kpis.mis_ordenes_activas ?? 0}
                      badge={{ text: 'En banco', type: 'up', color: 'blue', subtext: 'Activas' }}
                      icon={Wrench}
                      tone="blue"
                    />
                    <KpiCard
                      title="Diagnósticos pendientes"
                      value={kpis.mis_diagnosticos_pendientes ?? 0}
                      badge={kpis.mis_diagnosticos_pendientes > 0
                        ? { text: `${kpis.mis_diagnosticos_pendientes} pendientes`, type: 'down', color: 'amber', subtext: 'Por evaluar' }
                        : { text: 'Al día', type: 'neutral', color: 'emerald', subtext: 'Sin cola' }
                      }
                      icon={Clock}
                      tone="brand"
                    />
                    <KpiCard
                      title="Órdenes abiertas"
                      value={kpis.ordenes_abiertas ?? 0}
                      badge={kpis.abiertas_hoy > 0
                        ? { text: `+${kpis.abiertas_hoy} hoy`, type: 'up', color: 'emerald', subtext: 'Taller' }
                        : { text: 'En flujo', type: 'neutral', color: 'neutral', subtext: 'Total taller' }
                      }
                      icon={ClipboardList}
                      tone="blue"
                    />
                    <KpiCard
                      title="Urgentes"
                      value={kpis.urgentes ?? 0}
                      badge={kpis.urgentes > 0
                        ? { text: `${kpis.urgentes} urgentes`, type: 'down', color: 'rose', subtext: 'Prioritarias' }
                        : { text: 'Sin urgencias', type: 'neutral', color: 'emerald', subtext: 'Controladas' }
                      }
                      icon={AlertTriangle}
                      tone="red"
                    />
                    <KpiCard
                      title="Listas para entrega"
                      value={kpis.listas_entrega ?? 0}
                      badge={{ text: 'Listas', type: 'up', color: 'emerald', subtext: 'Para cliente' }}
                      icon={PackageCheck}
                      tone="green"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <KpiCard
                      title="Órdenes abiertas"
                      value={kpis.ordenes_abiertas ?? 0}
                      badge={kpis.abiertas_hoy > 0
                        ? { text: `+${kpis.abiertas_hoy} hoy`, type: 'up', color: 'emerald', subtext: 'Nuevas' }
                        : { text: 'Al día', type: 'neutral', color: 'neutral', subtext: 'En flujo' }
                      }
                      icon={ClipboardList}
                      tone="blue"
                    />
                    <KpiCard
                      title="Urgentes"
                      value={kpis.urgentes ?? 0}
                      badge={kpis.urgentes > 0
                        ? { text: `${kpis.urgentes} urgentes`, type: 'down', color: 'rose', subtext: 'Prioridad alta' }
                        : { text: 'Sin retrasos', type: 'neutral', color: 'emerald', subtext: 'Al día' }
                      }
                      icon={AlertTriangle}
                      tone="red"
                    />
                    <KpiCard
                      title="Sin técnico"
                      value={kpis.sin_tecnico ?? 0}
                      badge={kpis.sin_tecnico > 0
                        ? { text: `${kpis.sin_tecnico} en espera`, type: 'down', color: 'amber', subtext: 'Por asignar' }
                        : { text: '100% asignadas', type: 'neutral', color: 'emerald', subtext: 'Completas' }
                      }
                      icon={UserX}
                      tone="pink"
                    />
                    <KpiCard
                      title="Listas para entrega"
                      value={kpis.listas_entrega ?? 0}
                      badge={kpis.listas_entrega > 0
                        ? { text: `${kpis.listas_entrega} listas`, type: 'up', color: 'emerald', subtext: 'Para entrega' }
                        : { text: 'En flujo', type: 'neutral', color: 'neutral', subtext: 'En proceso' }
                      }
                      icon={PackageCheck}
                      tone="green"
                    />
                  </div>
                )}

                {/* Tarjeta de Ingresos del Mes */}
                {canViewFinances ? (
                  <div className="w-full rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 shrink-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                          Ingresos del mes
                        </p>
                        <DollarSign className="w-4 h-4 shrink-0 text-red-600 dark:text-red-500" />
                      </div>

                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-xs sm:text-sm font-bold text-neutral-400 dark:text-neutral-500 select-none font-mono">
                          RD$
                        </span>
                        <span className="text-2xl sm:text-3xl font-bold font-outfit leading-none tracking-tight text-neutral-900 dark:text-neutral-50 truncate">
                          {formatCurrency(kpis.ingresos_mes)}
                        </span>

                        {trendDiff ? (
                          <div className="inline-flex items-center gap-1.5 ml-1">
                            <Badge
                              variant="minimal"
                              color={trendDiff.isUp ? 'emerald' : 'danger'}
                              icon={trendDiff.isUp ? ArrowUpRight : ArrowDownRight}
                              size="sm"
                              className="text-[11px] font-medium"
                            >
                              {trendDiff.percentageText}
                            </Badge>
                            <span
                              className="text-[11px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap"
                              title={`Anterior: RD$ ${formatCurrency(kpis.ingresos_mes_anterior)}`}
                            >
                              vs mes ant.
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 ml-1">
                            Tendencia 14d
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 max-w-full md:max-w-[360px] lg:max-w-[420px] w-full min-w-0">
                      <IncomeAreaChart data={kpis.ingresos_sparkline || []} />
                    </div>
                  </div>
                ) : null}
          </div>

          {/* Columna Derecha: Acciones Rápidas */}
          <div className="lg:col-span-4 xl:col-span-3 h-full">
            <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 h-full flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3.5">
                    <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                      <Zap className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 font-outfit">
                        Acciones Rápidas
                      </h4>
                    </div>

                    <AnimatedIconButton
                      icon={RotateCw}
                      loading={refreshing}
                      success={refreshSuccess}
                      onSuccessEnd={() => setRefreshSuccess(false)}
                      onClick={handleRefresh}
                      title="Refrescar dashboard"
                      ariaLabel="Refrescar datos del dashboard"
                      className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors"
                      size={15}
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between gap-2.5">
                    {canCreateOrder ? (
                      <button
                        type="button"
                        onClick={() => navigate('/tickets/nueva')}
                        className="w-full flex-1 group text-left rounded-xl p-3 bg-neutral-50/80 dark:bg-neutral-900/60 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 transition-all flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Plus className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight truncate">Nueva Orden</p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">Recepción de equipo</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 group-hover:text-red-600 dark:group-hover:text-red-500 transition-all shrink-0" />
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => navigate('/taller')}
                      className="w-full flex-1 group text-left rounded-xl p-3 bg-neutral-50/80 dark:bg-neutral-900/60 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Wrench className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">Banco de Trabajo</p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">Mesa y taller kanban</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 group-hover:text-red-600 dark:group-hover:text-red-500 transition-all shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/clientes')}
                      className="w-full flex-1 group text-left rounded-xl p-3 bg-neutral-50/80 dark:bg-neutral-900/60 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Contact className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">Clientes</p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">Directorio y contactos</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 group-hover:text-red-600 dark:group-hover:text-red-500 transition-all shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/tickets')}
                      className="w-full flex-1 group text-left rounded-xl p-3 bg-neutral-50/80 dark:bg-neutral-900/60 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Ticket className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">Consultar Órdenes</p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">Búsqueda y filtros</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 group-hover:text-red-600 dark:group-hover:text-red-500 transition-all shrink-0" />
                    </button>
                  </div>
            </div>
          </div>
        </div>

        {/* Flujo + Carga (Disposición Original) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
              {/* Pipeline / Flujo del taller */}
              <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 font-outfit">
                      Flujo del taller
                    </h3>
                    <Badge variant="minimalist" color="neutral" size="sm" showDot={false}>
                      {totalEnFlujo} en taller
                    </Badge>
                  </div>

                  <SimpleButton
                    icon={ChevronRight}
                    iconPosition="right"
                    size="xs"
                    onClick={() => navigate('/taller')}
                    className="self-start sm:self-auto"
                    iconClassName="text-red-600 dark:text-red-500"
                  >
                    Ver tablero kanban
                  </SimpleButton>
                </div>

                {/* Barra de progreso segmentada continua */}
                <div className="mt-2 mb-3.5">
                  <div className="h-2 rounded-full overflow-hidden flex bg-neutral-100 dark:bg-neutral-800/80 p-0.5 gap-0.5 shadow-inner">
                    {totalEnFlujo > 0 ? (
                      flujo.map((estado) => {
                        const count = Number(estado.total) || 0;
                        if (count === 0) return null;
                        const pct = Math.max(3, (count / totalEnFlujo) * 100);
                        return (
                          <div
                            key={`segment-${estado.id || estado.codigo_estado}`}
                            className="h-full rounded-full transition-all duration-300 cursor-pointer hover:opacity-85"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: estado.color_badge || '#71717A'
                            }}
                            title={`${shortEstadoName(estado.nombre_estado)}: ${count} (${Math.round((count / totalEnFlujo) * 100)}%)`}
                            onClick={() => navigate('/taller')}
                          />
                        );
                      })
                    ) : (
                      <div className="w-full h-full rounded-full bg-neutral-200/60 dark:bg-neutral-800" />
                    )}
                  </div>
                </div>

                {/* Tarjetas de etapas interconectadas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {flujo.map((estado, idx) => {
                    const isLast = idx === flujo.length - 1;
                    const color = estado.color_badge || '#71717A';
                    return (
                      <button
                        key={estado.id || estado.codigo_estado}
                        type="button"
                        onClick={() => navigate('/taller')}
                        className="group relative rounded-xl border border-neutral-200/70 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 hover:bg-white dark:hover:bg-neutral-800/60 hover:shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 p-3 text-left transition-all duration-200 flex flex-col justify-between"
                      >
                        {/* Top row: Stage number & chevron connector indicator on desktop */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-mono">
                            0{idx + 1}
                          </span>
                          {!isLast ? (
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 hidden lg:block -mr-1" />
                          ) : null}
                        </div>

                        {/* Middle: Count & Name */}
                        <div>
                          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 font-outfit group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            {estado.total ?? 0}
                          </p>
                          <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 leading-tight mt-1 line-clamp-2 min-h-[1.75rem]">
                            {shortEstadoName(estado.nombre_estado)}
                          </p>
                        </div>

                        {/* Bottom: Subtle indicator bar */}
                        <div className="mt-2.5 w-full h-1 rounded-full bg-neutral-200/60 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300 group-hover:opacity-100 opacity-75"
                            style={{
                              backgroundColor: color,
                              width: totalEnFlujo > 0 && estado.total > 0 ? `${Math.max(15, (estado.total / totalEnFlujo) * 100)}%` : '0%'
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <TrendChart serie={serie} />
              </div>

              {/* Carga por técnico */}
              <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 font-outfit">
                        Carga por técnico
                      </h3>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        {totalCarga} {totalCarga === 1 ? 'orden asignada' : 'órdenes asignadas'}
                      </p>
                    </div>
                    <SimpleButton
                      icon={ChevronRight}
                      iconPosition="right"
                      size="xs"
                      onClick={() => navigate('/taller')}
                      iconClassName="text-red-600 dark:text-red-500"
                    >
                      Ver taller
                    </SimpleButton>
                  </div>

                  {carga.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-2">
                        <Users className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                        Sin técnicos con carga activa
                      </p>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                        No hay órdenes abiertas en proceso.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {carga.map((item) => {
                        const count = Number(item.ordenes) || 0;
                        const CAPACIDAD_REF_TECNICO = 6;
                        const rawPorcentaje = (count / CAPACIDAD_REF_TECNICO) * 100;
                        const porcentaje = Math.round(rawPorcentaje);
                        const barWidth = count > 0 ? Math.min(100, Math.max(4, porcentaje)) : 0;
                        const satConfig = getCargaSaturationConfig(porcentaje, item.es_sin_asignar);
                        const initials = getInitials(item.nombre);

                        return (
                          <li
                            key={`${item.id || 'na'}-${item.nombre}`}
                            className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {item.foto_perfil_url ? (
                                  <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-100 dark:bg-zinc-700 font-bold text-[11px] flex items-center justify-center border border-zinc-700 dark:border-zinc-600 shadow-xs overflow-hidden relative shrink-0">
                                    <img
                                      src={item.foto_perfil_url}
                                      alt={item.nombre}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                        if (fallback) fallback.classList.remove('hidden');
                                      }}
                                    />
                                    <span className="avatar-fallback hidden">
                                      {initials}
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 shadow-xs ${item.es_sin_asignar
                                      ? 'bg-red-500 text-white'
                                      : 'bg-zinc-800 text-zinc-100 dark:bg-zinc-700 border border-zinc-700 dark:border-zinc-600'
                                      }`}
                                  >
                                    {item.es_sin_asignar ? (
                                      <UserX className="w-4 h-4 text-white" />
                                    ) : (
                                      initials
                                    )}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                                    {item.nombre}
                                  </p>
                                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                    {item.es_sin_asignar ? 'Pendiente por asignar' : 'Taller técnico'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-50 tabular-nums">
                                  {count} {count === 1 ? 'orden' : 'órdenes'}
                                </span>
                                <span className={`block text-[10px] font-semibold tabular-nums ${satConfig.textColor}`}>
                                  {porcentaje}% carga
                                </span>
                              </div>
                            </div>

                            {/* Barra de progreso redondeada (rounded-full) con escala cromática unificada */}
                            <div className="h-2 rounded-full bg-neutral-200/70 dark:bg-neutral-800 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${barWidth}%`,
                                  backgroundColor: satConfig.color
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Fila: Categorías de Dispositivos (Izquierda) + Actividad Reciente (Derecha) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5 items-stretch">
              {/* Categorías de Dispositivos (Lado Izquierdo) */}
              <DeviceCategoryDonut data={data?.distribucion_categorias} className="h-full" mostrarDetalle={false} />

              {/* Actividad Reciente (Lado Derecho) */}
              <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="px-4 sm:px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 font-outfit">
                        Actividad reciente
                      </h3>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:inline">
                        — Últimas órdenes recibidas o en proceso
                      </span>
                    </div>
                    <SimpleButton
                      icon={ChevronRight}
                      iconPosition="right"
                      size="xs"
                      onClick={() => navigate('/tickets')}
                      iconClassName="text-red-600 dark:text-red-500"
                    >
                      Ver todas
                    </SimpleButton>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
                          <th className="px-4 sm:px-5 py-3 font-semibold">Código</th>
                          <th className="px-4 py-3 font-semibold">Cliente</th>
                          <th className="px-4 py-3 font-semibold">Equipo</th>
                          <th className="px-4 py-3 font-semibold">Estado</th>
                          <th className="px-4 py-3 font-semibold">Prioridad</th>
                          <th className="px-4 sm:px-5 py-3 font-semibold text-right">Técnico</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actividad.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                              No hay órdenes activas para mostrar.
                            </td>
                          </tr>
                        ) : (
                          actividad.map((orden) => {
                            const hasTecnico = orden.tecnico_nombre && orden.tecnico_nombre !== 'Sin asignar';

                            return (
                              <tr
                                key={orden.id}
                                onClick={() => navigate(`/taller?ordenId=${orden.id}`)}
                                className="border-b border-neutral-100/60 dark:border-neutral-800/60 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors group"
                              >
                                <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                                  <span className="font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                    {orden.codigo_ticket}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-sm text-neutral-800 dark:text-neutral-200 whitespace-normal break-words leading-snug max-w-[160px]">
                                  {orden.cliente_nombre}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-neutral-500 dark:text-neutral-400 whitespace-normal break-words leading-snug max-w-[150px]">
                                  {orden.equipo}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  {orden.nombre_estado || orden.codigo_estado ? (
                                    (() => {
                                      const EstadoIcon = getEstadoIcon(orden);
                                      const estadoColor = orden.color_badge || '#71717A';
                                      const estadoLabel = orden.nombre_estado || orden.codigo_estado;

                                      return (
                                        <Badge
                                          variant="minimal"
                                          size="sm"
                                          showDot={false}
                                          icon={<EstadoIcon size={12} className="shrink-0 stroke-[2.2]" style={{ color: estadoColor }} />}
                                          className="font-medium"
                                          style={{ color: estadoColor }}
                                        >
                                          {estadoLabel}
                                        </Badge>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-neutral-400 dark:text-neutral-500">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  {orden.prioridad ? (
                                    (() => {
                                      const config = getPrioridadConfig(orden.prioridad);
                                      const PriorityIcon = config.icon;
                                      return (
                                        <Badge
                                          variant="minimal"
                                          color={config.color}
                                          icon={PriorityIcon}
                                          size="sm"
                                          className="capitalize font-medium"
                                        >
                                          {config.label}
                                        </Badge>
                                      );
                                    })()
                                  ) : (
                                    <span className="text-neutral-400 dark:text-neutral-500">—</span>
                                  )}
                                </td>
                                <td className="px-4 sm:px-5 py-3.5 text-right whitespace-nowrap">
                                  {hasTecnico ? (
                                    <div className="inline-flex items-center justify-end gap-2 text-left">
                                      <div className="w-7 h-7 rounded-xl bg-zinc-800 text-zinc-100 dark:bg-zinc-700 border border-zinc-700 dark:border-zinc-600 font-bold text-[10px] flex items-center justify-center shrink-0 overflow-hidden relative">
                                        {orden.tecnico_foto_url ? (
                                          <img
                                            src={orden.tecnico_foto_url}
                                            alt={orden.tecnico_nombre}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                              if (fallback) fallback.classList.remove('hidden');
                                            }}
                                          />
                                        ) : null}
                                        <span className={`avatar-fallback ${orden.tecnico_foto_url ? 'hidden' : ''}`}>
                                          {getInitials(orden.tecnico_nombre)}
                                        </span>
                                      </div>
                                      <div className="flex flex-col items-start min-w-0">
                                        <span
                                          className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[120px] leading-tight"
                                          title={orden.tecnico_nombre}
                                        >
                                          {shortTechName(orden.tecnico_nombre)}
                                        </span>
                                        {orden.tecnicos_count > 1 ? (
                                          <span
                                            className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 mt-0.5 leading-tight"
                                            title={`${orden.tecnicos_count} técnicos asignados`}
                                          >
                                            +{orden.tecnicos_count - 1} más
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 border border-neutral-200/70 dark:border-neutral-700/60">
                                      <UserX className="w-3 h-3 text-neutral-400 shrink-0" />
                                      Sin asignar
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
