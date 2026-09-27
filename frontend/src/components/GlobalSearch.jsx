import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Gamepad2,
  Laptop,
  Loader2,
  Package,
  PackageCheck,
  Search,
  Smartphone,
  Tablet,
  UserRound,
  Watch,
  Wrench,
  X,
  XCircle
} from 'lucide-react';
import { globalSearch } from '../services/search.service';
import Badge from './common/Badge';

const RECENT_KEY = 'siger_search_recent';
const MAX_RECENT = 8;
const CATEGORY_BADGE_COLOR = 'text-zinc-400 dark:text-zinc-400';
const CATEGORY_BADGE_CLASS = 'self-center shrink-0 font-medium text-xs text-zinc-400 dark:text-zinc-400';

const loadRecent = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveRecentItem = (item) => {
  const prev = loadRecent().filter(
    (entry) => !(entry.tipo === item.tipo && String(entry.id) === String(item.id))
  );
  const next = [item, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
};

const getDeviceIcon = (equipoName = '', marca = '', modelo = '') => {
  const norm = `${equipoName} ${marca} ${modelo}`.toLowerCase().trim();
  if (
    norm.includes('laptop') ||
    norm.includes('portatil') ||
    norm.includes('portátil') ||
    norm.includes('macbook') ||
    norm.includes('notebook') ||
    norm.includes('computadora')
  ) {
    return Laptop;
  }
  if (norm.includes('tablet') || norm.includes('ipad') || norm.includes('tableta')) {
    return Tablet;
  }
  if (
    norm.includes('consola') ||
    norm.includes('videojuego') ||
    norm.includes('game') ||
    norm.includes('play') ||
    norm.includes('xbox') ||
    norm.includes('nintendo') ||
    norm.includes('switch')
  ) {
    return Gamepad2;
  }
  if (norm.includes('watch') || norm.includes('reloj') || norm.includes('band')) {
    return Watch;
  }
  return Smartphone;
};

const getEstadoConfig = (orden) => {
  const flujo = Number(orden?.orden_flujo);
  const cod = String(orden?.codigo_estado || '').toUpperCase().trim();
  const nom = String(orden?.nombre_estado || '').toLowerCase().trim();

  // 1. Prioridad por orden de flujo estándar del sistema (1 al 8) según estados_servicio y ServiciosPage
  if (flujo === 1) return { key: 'RECIBIDO', label: 'Recibido', icon: Package, colorClass: 'text-neutral-500 dark:text-neutral-400' };
  if (flujo === 2) return { key: 'EN_DIAGNOSTICO', label: 'En Diagnóstico', icon: Search, colorClass: 'text-blue-600 dark:text-blue-400' };
  if (flujo === 3) return { key: 'ESPERA_REPUESTO', label: 'En Repuesto', icon: Clock, colorClass: 'text-amber-600 dark:text-amber-400' };
  if (flujo === 4) return { key: 'EN_REPARACION', label: 'En Reparación', icon: Wrench, colorClass: 'text-purple-600 dark:text-purple-400' };
  if (flujo === 5) return { key: 'CONTROL_CALIDAD', label: 'Control de Calidad', icon: ClipboardCheck, colorClass: 'text-pink-600 dark:text-pink-400' };
  if (flujo === 6) return { key: 'LISTO_ENTREGA', label: 'Listo para Entrega', icon: PackageCheck, colorClass: 'text-emerald-600 dark:text-emerald-400' };
  if (flujo === 7) return { key: 'ENTREGADO', label: 'Entregado', icon: CheckCircle2, colorClass: 'text-emerald-600 dark:text-emerald-400' };
  if (flujo === 8) return { key: 'CANCELADO', label: 'Cancelado', icon: XCircle, colorClass: 'text-red-600 dark:text-red-400' };

  // 2. Coincidencia exacta por código
  if (cod === 'RECIBIDO') return { key: 'RECIBIDO', label: 'Recibido', icon: Package, colorClass: 'text-neutral-500 dark:text-neutral-400' };
  if (cod === 'EN_DIAGNOSTICO') return { key: 'EN_DIAGNOSTICO', label: 'En Diagnóstico', icon: Search, colorClass: 'text-blue-600 dark:text-blue-400' };
  if (cod === 'ESPERA_REPUESTO' || cod === 'EN_ESPERA_REPUESTO') return { key: 'ESPERA_REPUESTO', label: 'En Repuesto', icon: Clock, colorClass: 'text-amber-600 dark:text-amber-400' };
  if (cod === 'EN_REPARACION') return { key: 'EN_REPARACION', label: 'En Reparación', icon: Wrench, colorClass: 'text-purple-600 dark:text-purple-400' };
  if (cod === 'CONTROL_CALIDAD') return { key: 'CONTROL_CALIDAD', label: 'Control de Calidad', icon: ClipboardCheck, colorClass: 'text-pink-600 dark:text-pink-400' };
  if (cod === 'LISTO_ENTREGA') return { key: 'LISTO_ENTREGA', label: 'Listo para Entrega', icon: PackageCheck, colorClass: 'text-emerald-600 dark:text-emerald-400' };
  if (cod === 'ENTREGADO' || cod === 'ENTREGADO_CLIENTE' || cod === 'ENTREGA_CONFORME') return { key: 'ENTREGADO', label: 'Entregado', icon: CheckCircle2, colorClass: 'text-emerald-600 dark:text-emerald-400' };
  if (cod === 'CANCELADO' || cod === 'CANCELADO_DEVUELTO') return { key: 'CANCELADO', label: 'Cancelado', icon: XCircle, colorClass: 'text-red-600 dark:text-red-400' };

  // 3. Heurística textual (evaluar LISTO antes de ENTREG para evitar colisiones)
  if (cod.includes('LISTO') || nom.includes('listo')) {
    return { key: 'LISTO_ENTREGA', label: 'Listo para Entrega', icon: PackageCheck, colorClass: 'text-emerald-600 dark:text-emerald-400' };
  }
  if ((cod.includes('ENTREG') || nom.includes('entreg')) && !cod.includes('LISTO') && !nom.includes('listo')) {
    return { key: 'ENTREGADO', label: 'Entregado', icon: CheckCircle2, colorClass: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (cod.includes('RECIB') || nom.includes('recib')) {
    return { key: 'RECIBIDO', label: 'Recibido', icon: Package, colorClass: 'text-neutral-500 dark:text-neutral-400' };
  }
  if (cod.includes('DIAGN') || nom.includes('diagn')) {
    return { key: 'EN_DIAGNOSTICO', label: 'En Diagnóstico', icon: Search, colorClass: 'text-blue-600 dark:text-blue-400' };
  }
  if (cod.includes('ESPERA') || nom.includes('espera') || cod.includes('REPUESTO') || nom.includes('repuesto')) {
    return { key: 'ESPERA_REPUESTO', label: 'En Repuesto', icon: Clock, colorClass: 'text-amber-600 dark:text-amber-400' };
  }
  if (cod.includes('REPARAC') || nom.includes('reparac') || cod.includes('PROCESO') || nom.includes('proceso')) {
    return { key: 'EN_REPARACION', label: 'En Reparación', icon: Wrench, colorClass: 'text-purple-600 dark:text-purple-400' };
  }
  if (cod.includes('CALIDAD') || nom.includes('calidad') || cod.includes('CONTROL') || nom.includes('control')) {
    return { key: 'CONTROL_CALIDAD', label: 'Control de Calidad', icon: ClipboardCheck, colorClass: 'text-pink-600 dark:text-pink-400' };
  }
  if (cod.includes('CANCEL') || nom.includes('cancel') || nom.includes('devuelt')) {
    return { key: 'CANCELADO', label: 'Cancelado', icon: XCircle, colorClass: 'text-red-600 dark:text-red-400' };
  }

  return {
    key: 'UNKNOWN',
    label: 'Orden',
    icon: ClipboardList,
    colorClass: 'text-zinc-400 dark:text-zinc-400'
  };
};

const GlobalSearch = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ ordenes: [], clientes: [], equipos: [] });
  const [recent, setRecent] = useState(() => loadRecent());
  const [isFocused, setIsFocused] = useState(false);

  const hasQuery = query.trim().length >= 2;
  const totalHits = useMemo(
    () =>
      (results.ordenes?.length || 0) +
      (results.clientes?.length || 0) +
      (results.equipos?.length || 0),
    [results]
  );

  useEffect(() => {
    const onDocClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onFocusSearch = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
      setOpen(true);
      setIsFocused(true);
    };

    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('siger:focus-global-search', onFocusSearch);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('siger:focus-global-search', onFocusSearch);
    };
  }, []);

  useEffect(() => {
    if (!hasQuery) {
      setResults({ ordenes: [], clientes: [], equipos: [] });
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await globalSearch(query.trim());
        if (!cancelled) {
          setResults(response?.data || { ordenes: [], clientes: [], equipos: [] });
        }
      } catch {
        if (!cancelled) {
          setResults({ ordenes: [], clientes: [], equipos: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, hasQuery]);

  const goToItem = useCallback(
    (item) => {
      const recentPayload = {
        id: item.id,
        tipo: item.tipo || item.tipo_resultado,
        label:
          item.label ||
          item.codigo_ticket ||
          item.nombre_completo ||
          item.equipo ||
          'Registro',
        subtitle: item.subtitle || item.cliente_nombre || item.telefono || item.equipo || '',
        href: item.href,
        codigo_estado: item.codigo_estado,
        nombre_estado: item.nombre_estado,
        orden_flujo: item.orden_flujo,
        color_badge: item.color_badge
      };
      setRecent(saveRecentItem(recentPayload));
      setOpen(false);
      setQuery('');
      if (item.href) navigate(item.href);
    },
    [navigate]
  );

  const handleOrden = (orden) => {
    goToItem({
      id: orden.id,
      tipo: 'orden',
      label: orden.codigo_ticket,
      subtitle: `${orden.cliente_nombre || ''} · ${orden.equipo || ''}`.trim(),
      href: `/taller?ordenId=${orden.id}`,
      codigo_estado: orden.codigo_estado,
      nombre_estado: orden.nombre_estado,
      orden_flujo: orden.orden_flujo,
      color_badge: orden.color_badge
    });
  };

  const handleCliente = (cliente) => {
    goToItem({
      id: cliente.id,
      tipo: 'cliente',
      label: cliente.nombre_completo,
      subtitle: cliente.telefono || cliente.cedula_rnc || '',
      href: `/clientes?clienteId=${cliente.id}`
    });
  };

  const handleEquipo = (equipo) => {
    goToItem({
      id: equipo.id,
      tipo: 'equipo',
      label: equipo.equipo || `${equipo.marca_equipo} ${equipo.modelo_equipo}`,
      subtitle: equipo.codigo_ticket || equipo.num_serie_imei || '',
      href: `/taller?ordenId=${equipo.id}`
    });
  };

  const isExpanded = open || isFocused;

  return (
    <div
      ref={containerRef}
      className={`relative transition-all duration-300 ease-in-out ${isExpanded ? 'w-full max-w-md xl:max-w-lg' : 'w-48 sm:w-56 md:w-64 max-w-xs'
        }`}
    >
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          id="global-search-input"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Buscar orden FMC..."
          className={`w-full h-10 pl-10 pr-9 bg-zinc-100 dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all duration-300 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden ${isExpanded ? 'rounded-xl' : 'rounded-full'
            }`}
          aria-label="Búsqueda global"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-x-4 top-16 mx-auto w-auto max-w-md md:absolute md:inset-x-auto md:top-auto md:left-0 md:right-0 md:mt-2 md:w-full md:max-w-none rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-xl overflow-hidden z-50 max-h-[70vh] sm:max-h-[75vh] overflow-y-auto">
          {!hasQuery ? (
            <div className="p-3">
              <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <Clock className="w-3.5 h-3.5" />
                Recientes
              </div>
              {recent.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-zinc-500">
                  Escribe al menos 2 caracteres para buscar órdenes, clientes o equipos.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {recent.map((item) => {
                    const isCliente = item.tipo === 'cliente';
                    const isEquipo = item.tipo === 'equipo';
                    const isOrden = item.tipo === 'orden';
                    const RecentIcon = isCliente
                      ? UserRound
                      : isEquipo
                        ? getDeviceIcon(item.label, item.subtitle)
                        : ClipboardList;

                    const typeLabel = isCliente
                      ? 'Cliente'
                      : isEquipo
                        ? 'Equipo'
                        : isOrden
                          ? 'Orden'
                          : item.tipo;

                    const iconStyle = isCliente
                      ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400'
                      : isEquipo
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400';

                    const estadoConfig = isOrden ? getEstadoConfig(item) : null;
                    const EstadoIcon = estadoConfig?.icon;

                    return (
                      <li key={`${item.tipo}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => goToItem(item)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors"
                        >
                          <span className={`p-1.5 rounded-lg shrink-0 ${iconStyle}`}>
                            <RecentIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                              {item.label}
                            </span>
                            {item.subtitle ? (
                              <span className="block text-xs text-zinc-500 truncate">{item.subtitle}</span>
                            ) : null}
                          </span>
                          {isCliente ? (
                            <Badge
                              variant="minimalist"
                              size="sm"
                              showDot={false}
                              icon={<UserRound size={12} className="shrink-0 stroke-[2.2] text-zinc-400 dark:text-zinc-400" />}
                              color={CATEGORY_BADGE_COLOR}
                              className={CATEGORY_BADGE_CLASS}
                            >
                              Cliente
                            </Badge>
                          ) : isEquipo ? (
                            <Badge
                              variant="minimalist"
                              size="sm"
                              showDot={false}
                              icon={<RecentIcon size={12} className="shrink-0 stroke-[2.2] text-zinc-400 dark:text-zinc-400" />}
                              color={CATEGORY_BADGE_COLOR}
                              className={CATEGORY_BADGE_CLASS}
                            >
                              Equipo
                            </Badge>
                          ) : (
                            <Badge
                              variant="minimalist"
                              size="sm"
                              showDot={false}
                              icon={<ClipboardList size={12} className="shrink-0 stroke-[2.2] text-zinc-400 dark:text-zinc-400" />}
                              color={CATEGORY_BADGE_COLOR}
                              className={CATEGORY_BADGE_CLASS}
                            >
                              Orden
                            </Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando...
            </div>
          ) : totalHits === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              Sin coincidencias para “{query.trim()}”.
            </p>
          ) : (
            <div className="py-2">
              {results.ordenes?.length > 0 ? (
                <section className="px-2 pb-2">
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Órdenes
                  </p>
                  <ul>
                    {results.ordenes.map((orden) => {
                      const estadoConfig = getEstadoConfig(orden);
                      const EstadoIcon = estadoConfig.icon;

                      return (
                        <li key={`o-${orden.id}`}>
                          <button
                            type="button"
                            onClick={() => handleOrden(orden)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors"
                          >
                            <span className="p-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 shrink-0">
                              <ClipboardList className="w-3.5 h-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                                  {orden.codigo_ticket}
                                </span>
                                <Badge
                                  variant="minimalist"
                                  size="sm"
                                  showDot={false}
                                  icon={<EstadoIcon size={12} className="shrink-0 stroke-[2.2]" />}
                                  color={estadoConfig.colorClass}
                                  className={`font-medium text-xs ${estadoConfig.colorClass}`}
                                >
                                  {estadoConfig.label}
                                </Badge>
                              </span>
                              <span className="block text-xs text-zinc-500 mt-0.5 truncate">
                                {orden.cliente_nombre} · {orden.equipo}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {results.clientes?.length > 0 ? (
                <section className="px-2 pb-2 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Clientes
                  </p>
                  <ul>
                    {results.clientes.map((cliente) => (
                      <li key={`c-${cliente.id}`}>
                        <button
                          type="button"
                          onClick={() => handleCliente(cliente)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors"
                        >
                          <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 shrink-0">
                            <UserRound className="w-3.5 h-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 block truncate">
                              {cliente.nombre_completo}
                            </span>
                            <span className="text-xs text-zinc-500 block truncate">
                              {cliente.cedula_rnc} · {cliente.telefono}
                            </span>
                          </span>
                          <Badge
                            variant="minimalist"
                            size="sm"
                            showDot={false}
                            icon={<UserRound size={12} className="shrink-0 stroke-[2.2] text-zinc-400 dark:text-zinc-400" />}
                            color={CATEGORY_BADGE_COLOR}
                            className={CATEGORY_BADGE_CLASS}
                          >
                            Cliente
                          </Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {results.equipos?.length > 0 ? (
                <section className="px-2 pb-2 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Equipos
                  </p>
                  <ul>
                    {results.equipos.map((equipo) => {
                      const DeviceIcon = getDeviceIcon(
                        equipo.equipo,
                        equipo.marca_equipo,
                        equipo.modelo_equipo
                      );
                      return (
                        <li key={`e-${equipo.id}`}>
                          <button
                            type="button"
                            onClick={() => handleEquipo(equipo)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors"
                          >
                            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 shrink-0">
                              <DeviceIcon className="w-3.5 h-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 block truncate">
                                {equipo.equipo}
                              </span>
                              <span className="text-xs text-zinc-500 block truncate">
                                {equipo.codigo_ticket}
                                {equipo.num_serie_imei ? ` · ${equipo.num_serie_imei}` : ''}
                              </span>
                            </span>
                            <Badge
                              variant="minimalist"
                              size="sm"
                              showDot={false}
                              icon={<DeviceIcon size={12} className="shrink-0 stroke-[2.2] text-zinc-400 dark:text-zinc-400" />}
                              color={CATEGORY_BADGE_COLOR}
                              className={CATEGORY_BADGE_CLASS}
                            >
                              Equipo
                            </Badge>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default GlobalSearch;
