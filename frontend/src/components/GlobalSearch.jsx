import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  HardDrive,
  Loader2,
  Search,
  UserRound,
  X
} from 'lucide-react';
import { globalSearch } from '../services/search.service';

const RECENT_KEY = 'siger_search_recent';
const MAX_RECENT = 8;

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

const GlobalSearch = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ ordenes: [], clientes: [], equipos: [] });
  const [recent, setRecent] = useState(() => loadRecent());

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
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
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
        href: item.href
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
      href: `/taller?ordenId=${orden.id}`
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

  return (
    <div ref={containerRef} className="relative w-full max-w-md xl:max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar orden FMC..."
          className="w-full h-10 pl-9 pr-9 rounded-xl bg-zinc-100 dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-shadow"
          aria-label="Búsqueda global"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
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
                  {recent.map((item) => (
                    <li key={`${item.tipo}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => goToItem(item)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors"
                      >
                        <span className="mt-0.5 p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {item.tipo === 'cliente' ? (
                            <UserRound className="w-3.5 h-3.5" />
                          ) : item.tipo === 'equipo' ? (
                            <HardDrive className="w-3.5 h-3.5" />
                          ) : (
                            <ClipboardList className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                            {item.label}
                          </span>
                          {item.subtitle ? (
                            <span className="block text-xs text-zinc-500 truncate">{item.subtitle}</span>
                          ) : null}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mt-1">
                          {item.tipo}
                        </span>
                      </button>
                    </li>
                  ))}
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
                    {results.ordenes.map((orden) => (
                      <li key={`o-${orden.id}`}>
                        <button
                          type="button"
                          onClick={() => handleOrden(orden)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left"
                        >
                          <span className="mt-0.5 p-1.5 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                            <ClipboardList className="w-3.5 h-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                                {orden.codigo_ticket}
                              </span>
                              <span
                                className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                                style={{
                                  color: orden.color_badge || '#71717A',
                                  borderColor: `${orden.color_badge || '#71717A'}44`,
                                  backgroundColor: `${orden.color_badge || '#71717A'}14`
                                }}
                              >
                                {orden.nombre_estado}
                              </span>
                            </span>
                            <span className="block text-xs text-zinc-500 mt-0.5 truncate">
                              {orden.cliente_nombre} · {orden.equipo}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
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
                          className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left"
                        >
                          <span className="mt-0.5 p-1.5 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
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
                          <span className="text-[10px] font-semibold uppercase text-violet-500 mt-1">
                            Cliente
                          </span>
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
                    {results.equipos.map((equipo) => (
                      <li key={`e-${equipo.id}`}>
                        <button
                          type="button"
                          onClick={() => handleEquipo(equipo)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left"
                        >
                          <span className="mt-0.5 p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <HardDrive className="w-3.5 h-3.5" />
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
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5"
                            style={{
                              color: equipo.color_badge || '#71717A',
                              borderColor: `${equipo.color_badge || '#71717A'}44`
                            }}
                          >
                            Equipo
                          </span>
                        </button>
                      </li>
                    ))}
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
