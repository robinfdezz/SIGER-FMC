import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  ClipboardPlus,
  Loader2,
  Package,
  Wrench
} from 'lucide-react';
import {
  getConteoNotificaciones,
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas
} from '../services/notifications.service';

const tipoIcon = (tipo) => {
  switch (String(tipo || '').toUpperCase()) {
    case 'PRIORIDAD_URGENTE':
      return { Icon: AlertTriangle, className: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' };
    case 'ASIGNACION':
      return { Icon: Wrench, className: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400' };
    case 'CAMBIO_ESTADO':
      return { Icon: Package, className: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' };
    case 'INCIDENCIA':
      return { Icon: AlertTriangle, className: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' };
    case 'ORDEN_FINALIZADA':
      return { Icon: CheckCheck, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' };
    case 'NUEVA_ORDEN':
    default:
      return { Icon: ClipboardPlus, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' };
  }
};

const formatRelative = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const res = await getConteoNotificaciones();
      setUnread(res?.no_leidas || 0);
    } catch {
      /* silencioso */
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotificaciones({ limit: 20 });
      setItems(res?.data || []);
      setUnread(res?.meta?.no_leidas || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 15000);
    const onFocus = () => refreshCount();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!panelRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleOpenItem = async (item) => {
    try {
      if (!item.leida) {
        await marcarNotificacionLeida(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, leida: true } : n))
        );
        setUnread((prev) => Math.max(0, prev - 1));
      }
    } catch {
      /* continuar navegación */
    }

    setOpen(false);
    if (item.enlace) {
      navigate(item.enlace);
    } else if (item.servicio_id) {
      navigate(`/taller?ordenId=${item.servicio_id}`);
    }
  };

  const handleMarkAll = async () => {
    try {
      await marcarTodasLeidas();
      setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  const badgeLabel = unread > 9 ? '9+' : String(unread);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-dark-surface">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[22rem] sm:w-[24rem] rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-dark-border flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Notificaciones</p>
              <p className="text-[11px] text-zinc-500">
                {unread > 0 ? `${unread} sin leer` : 'Todo al día'}
              </p>
            </div>
            {unread > 0 ? (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            ) : null}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando...
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-zinc-500">
                No hay alertas por ahora.
              </p>
            ) : (
              <ul>
                {items.map((item) => {
                  const { Icon, className } = tipoIcon(item.tipo);
                  return (
                    <li key={item.id} className="border-b border-zinc-50 dark:border-zinc-800/80 last:border-0">
                      <button
                        type="button"
                        onClick={() => handleOpenItem(item)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                          !item.leida ? 'bg-brand-50/40 dark:bg-brand-950/10' : ''
                        }`}
                      >
                        <span className={`mt-0.5 p-2 rounded-xl ${className}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
                              {item.titulo}
                            </span>
                            {!item.leida ? (
                              <span className="mt-1 w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                            ) : null}
                          </span>
                          {item.mensaje ? (
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                              {item.mensaje}
                            </span>
                          ) : null}
                          <span className="block text-[11px] text-zinc-400 mt-1.5">
                            {formatRelative(item.created_at)}
                            {item.codigo_ticket ? ` · ${item.codigo_ticket}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;
