import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  AlertTriangle,
  ClipboardList,
  Home,
  PackageCheck,
  PlusCircle,
  RefreshCw,
  UserX,
  Wrench
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import Badge from '../../components/common/Badge';
import { getDashboardResumen } from '../../services/servicios.service';

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return `RD$ ${amount.toLocaleString('es-DO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

const formatDayLabel = (fecha) => {
  if (!fecha) return '';
  const date = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric' })
    .replace('.', '')
    .replace(/^\w/, (c) => c.toUpperCase());
};

const formatTodayLabel = () => {
  const now = new Date();
  return now.toLocaleDateString('es-DO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getPrioridadConfig = (prioridad) => {
  switch (String(prioridad || '').toLowerCase()) {
    case 'urgente':
      return { label: 'Urgente', color: 'danger' };
    case 'alta':
      return { label: 'Alta', color: 'warning' };
    case 'media':
      return { label: 'Media', color: 'info' };
    case 'baja':
      return { label: 'Baja', color: 'neutral' };
    default:
      return { label: prioridad || '—', color: 'neutral' };
  }
};

const shortEstadoName = (nombre = '') => {
  return String(nombre)
    .replace(/^En\s+/i, '')
    .replace(/\s*\/\s*.*$/, '')
    .replace(/\s+de\s+/i, ' de ')
    .trim();
};

const buildAreaPath = (points, width, height, maxY) => {
  if (!points.length || maxY <= 0) {
    return { line: '', area: '' };
  }

  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((value, index) => {
    const x = index * stepX;
    const y = height - (value / maxY) * height;
    return { x, y };
  });

  const line = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const area = `${line} L ${width.toFixed(2)} ${height.toFixed(2)} L 0 ${height.toFixed(2)} Z`;
  return { line, area };
};

const Sparkline = ({ values = [], stroke = '#E11D48' }) => {
  const width = 120;
  const height = 36;
  const max = Math.max(...values.map(Number), 1);
  const { line, area } = buildAreaPath(values.map(Number), width, height, max);

  if (!values.length) {
    return <div className="h-9 w-[7.5rem]" />;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-[7.5rem]" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const TrendChart = ({ serie = [] }) => {
  const width = 560;
  const height = 180;
  const padding = { top: 12, right: 8, bottom: 28, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxY = Math.max(
    1,
    ...serie.map((item) => Math.max(Number(item.entradas) || 0, Number(item.entregas) || 0))
  );
  const niceMax = Math.max(2, Math.ceil(maxY * 1.15));

  const entradas = serie.map((item) => Number(item.entradas) || 0);
  const entregas = serie.map((item) => Number(item.entregas) || 0);
  const entradasPath = buildAreaPath(entradas, chartW, chartH, niceMax);
  const entregasPath = buildAreaPath(entregas, chartW, chartH, niceMax);

  const ticks = [0, 0.5, 1].map((ratio) => Math.round(niceMax * ratio));

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Entradas vs entregas (7 días)</p>
        <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Entradas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Entregas
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44" role="img" aria-label="Entradas vs entregas">
        <defs>
          <linearGradient id="entradasFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E11D48" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#E11D48" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="entregasFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

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
                className="text-zinc-200 dark:text-zinc-700"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-zinc-400 dark:fill-zinc-500"
                fontSize="10"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          <path d={entradasPath.area} fill="url(#entradasFill)" />
          <path d={entregasPath.area} fill="url(#entregasFill)" />
          <path d={entradasPath.line} fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={entregasPath.line} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {serie.map((item, index) => {
          const stepX = serie.length > 1 ? chartW / (serie.length - 1) : chartW;
          const x = padding.left + index * stepX;
          return (
            <text
              key={item.fecha || index}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500"
              fontSize="10"
            >
              {formatDayLabel(item.fecha)}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

const KpiCard = ({ title, value, hint, icon: Icon, tone }) => {
  const tones = {
    blue: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50',
    red: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50',
    pink: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
    brand: 'bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-950/30 dark:text-brand-400 dark:border-brand-900/40'
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="mt-2 text-2xl sm:text-[1.7rem] font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p> : null}
        </div>
        <div className={`shrink-0 p-2.5 rounded-xl border ${tones[tone] || tones.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
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

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await getDashboardResumen();
      if (!response?.ok && !response?.success) {
        throw new Error(response?.message || 'No se pudo cargar el dashboard');
      }
      setData(response.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error al cargar el resumen operativo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const kpis = data?.kpis || {};
  const flujo = data?.flujo || [];
  const serie = data?.serie_7d || [];
  const carga = data?.carga_tecnicos || [];
  const actividad = data?.actividad_reciente || [];

  const maxCarga = useMemo(
    () => Math.max(1, ...carga.map((item) => Number(item.ordenes) || 0)),
    [carga]
  );

  const barColors = ['#3F3F46', '#3B82F6', '#F59E0B', '#F97316', '#38BDF8', '#EAB308'];

  const branchLabel = user?.sucursal_nombre
    ? `${user.sucursal_nombre}${user.sucursal_codigo ? ` · ${user.sucursal_codigo}` : ''}`
    : 'Franyer Mobile Center';

  const canCreateOrder = !String(user?.rol_nombre || '').toLowerCase().includes('tecnic');

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px] mx-auto w-full">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-900 text-white p-5 sm:p-7 shadow-xl border border-zinc-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-8 w-72 h-72 bg-brand-600/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-24 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2.5 min-w-0">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300">
                <Home className="w-3.5 h-3.5 text-brand-400" />
                <span className="truncate">{branchLabel}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ¡Bienvenido de nuevo, {user?.nombre || 'Usuario'}!
              </h2>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-sm text-zinc-300">
                  Resumen operativo del taller — {formatTodayLabel()}
                </p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sistema online
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 self-start lg:self-auto px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="shrink-0 font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {loading ? (
          <SkeletonTheme baseColor="#E4E4E7" highlightColor="#F4F4F5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border p-5">
                  <Skeleton height={14} width="55%" />
                  <Skeleton height={28} width="40%" className="mt-3" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
              <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border p-5">
                <Skeleton height={18} width={160} />
                <Skeleton height={180} className="mt-4" />
              </div>
              <div className="rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border p-5">
                <Skeleton height={18} width={140} />
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height={36} />
                  ))}
                </div>
              </div>
            </div>
          </SkeletonTheme>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5">
              <KpiCard
                title="Órdenes abiertas"
                value={kpis.ordenes_abiertas ?? 0}
                hint={kpis.abiertas_hoy > 0 ? `+${kpis.abiertas_hoy} hoy` : 'Sin ingresos hoy'}
                icon={ClipboardList}
                tone="blue"
              />
              <KpiCard
                title="Urgentes"
                value={kpis.urgentes ?? 0}
                icon={AlertTriangle}
                tone="red"
              />
              <KpiCard
                title="Sin técnico"
                value={kpis.sin_tecnico ?? 0}
                icon={UserX}
                tone="pink"
              />
              <KpiCard
                title="Listas para entrega"
                value={kpis.listas_entrega ?? 0}
                icon={PackageCheck}
                tone="green"
              />
              <div className="rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-sm p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Ingresos del mes</p>
                    <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(kpis.ingresos_mes)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Sparkline values={(kpis.ingresos_sparkline || []).map((item) => item.monto)} />
                </div>
              </div>
            </div>

            {/* Flujo + Carga */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
              <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-sm p-4 sm:p-5">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Flujo del taller</h3>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {flujo.map((estado) => (
                    <button
                      key={estado.id || estado.codigo_estado}
                      type="button"
                      onClick={() => navigate('/taller')}
                      className="text-left group"
                    >
                      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 leading-snug min-h-[2rem]">
                        {shortEstadoName(estado.nombre_estado)}
                      </p>
                      <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-brand-600 transition-colors">
                        {estado.total ?? 0}
                      </p>
                      <div
                        className="mt-2 h-1 rounded-full"
                        style={{ backgroundColor: estado.color_badge || '#71717A' }}
                      />
                    </button>
                  ))}
                </div>

                <TrendChart serie={serie} />
              </div>

              <div className="rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Carga por técnico</h3>
                  <button
                    type="button"
                    onClick={() => navigate('/taller')}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Ver taller
                  </button>
                </div>

                {carga.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
                    No hay órdenes abiertas asignadas.
                  </p>
                ) : (
                  <ul className="space-y-3.5">
                    {carga.map((item, index) => {
                      const ratio = Math.max(8, ((Number(item.ordenes) || 0) / maxCarga) * 100);
                      const color = item.es_sin_asignar ? '#EF4444' : barColors[index % barColors.length];
                      const initials = String(item.nombre || '?')
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase();

                      return (
                        <li key={`${item.id || 'na'}-${item.nombre}`} className="flex items-center gap-3">
                          {item.foto_perfil_url ? (
                            <img
                              src={item.foto_perfil_url}
                              alt={item.nombre}
                              className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {item.es_sin_asignar ? item.ordenes : initials}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                                {item.nombre}
                              </p>
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 tabular-nums">
                                {item.ordenes}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${ratio}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Actividad + Acciones */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-3.5">
              <div className="xl:col-span-3 rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-sm overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-zinc-100 dark:border-dark-border flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Actividad reciente</h3>
                  <button
                    type="button"
                    onClick={() => navigate('/tickets')}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Ver todas
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-dark-border">
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
                          <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-500">
                            No hay órdenes activas para mostrar.
                          </td>
                        </tr>
                      ) : (
                        actividad.map((orden) => {
                          const prioridad = getPrioridadConfig(orden.prioridad);
                          return (
                            <tr
                              key={orden.id}
                              onClick={() => navigate(`/taller?ordenId=${orden.id}`)}
                              className="border-b border-zinc-50 dark:border-zinc-800/80 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                            >
                              <td className="px-4 sm:px-5 py-3.5 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-100 whitespace-nowrap">
                                {orden.codigo_ticket}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-zinc-700 dark:text-zinc-200 whitespace-normal break-words leading-snug max-w-[160px]">
                                {orden.cliente_nombre}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-zinc-600 dark:text-zinc-300 whitespace-normal break-words leading-snug max-w-[150px]">
                                {orden.equipo}
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                                  style={{
                                    backgroundColor: `${orden.color_badge || '#71717A'}18`,
                                    color: orden.color_badge || '#71717A',
                                    borderColor: `${orden.color_badge || '#71717A'}33`
                                  }}
                                >
                                  {shortEstadoName(orden.nombre_estado)}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <Badge color={prioridad.color} size="sm" showDot>
                                  {prioridad.label}
                                </Badge>
                              </td>
                              <td className="px-4 sm:px-5 py-3.5 text-right text-sm font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                                {orden.tecnicos_count > 0 ? orden.tecnicos_count : '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {canCreateOrder ? (
                  <button
                    type="button"
                    onClick={() => navigate('/tickets/nueva')}
                    className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-4 shadow-sm transition-colors"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Nueva Orden
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => navigate('/taller')}
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white dark:bg-dark-card border-2 border-red-500/80 text-red-600 dark:text-red-400 font-semibold text-sm px-4 py-4 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <Wrench className="w-5 h-5" />
                  Banco de Trabajo
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
