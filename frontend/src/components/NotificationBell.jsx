import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  ClipboardPlus,
  Loader2,
  Package,
  Wrench,
  XCircle
} from 'lucide-react';
import { sileo } from 'sileo';
import {
  getConteoNotificaciones,
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas
} from '../services/notifications.service';
import SimpleButton from './common/SimpleButton';

const NOTIF_STORAGE_KEY = 'siger_notif_last_unread';

const getStoredUnread = () => {
  try {
    const val = sessionStorage.getItem(NOTIF_STORAGE_KEY);
    return val !== null ? Number(val) : null;
  } catch {
    return null;
  }
};

const setStoredUnread = (count) => {
  try {
    sessionStorage.setItem(NOTIF_STORAGE_KEY, String(count));
  } catch {
    // ignore
  }
};

let lastSoundTimestamp = 0;

/**
 * Sintetizador Web Audio API: reproduce un sonido suave y limpio de campana
 * sin dependencias de archivos de audio externos.
 */
const playNotificationSound = () => {
  const nowMs = Date.now();
  if (nowMs - lastSoundTimestamp < 1000) return;
  lastSoundTimestamp = nowMs;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Tono principal suave (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Tono armónico superior (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.07);
    gain2.gain.setValueAtTime(0, now + 0.07);
    gain2.gain.linearRampToValueAtTime(0.14, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.6);
  } catch {
    /* Silencioso ante restricciones de reproducción del navegador */
  }
};

let lastToastTimestamp = 0;
const showNotificationToast = () => {
  const nowMs = Date.now();
  if (nowMs - lastToastTimestamp < 1000) return;
  lastToastTimestamp = nowMs;
  sileo.info({
    title: 'Nuevas notificaciones',
    description: 'Tienes nuevas notificaciones en el taller'
  });
};

const tipoIcon = (tipo, item = {}) => {
  const normTipo = String(tipo || '').toUpperCase();
  const textContext = `${item.titulo || ''} ${item.mensaje || ''}`.toLowerCase();
  const isLeida = Boolean(item.leida);

  let Icon = ClipboardPlus;
  let colorClass = 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400';

  switch (normTipo) {
    case 'PRIORIDAD_URGENTE':
      Icon = AlertTriangle;
      colorClass = 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400';
      break;

    case 'ORDEN_CANCELADA':
      Icon = XCircle;
      colorClass = 'bg-rose-100/70 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
      break;

    case 'ASIGNACION':
      Icon = Wrench;
      colorClass = 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400';
      break;

    case 'CAMBIO_ESTADO':
      Icon = Package;
      colorClass = 'bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400';
      break;

    case 'INCIDENCIA':
      if (textContext.includes('aprobad')) {
        Icon = CheckCircle2;
        colorClass = 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400';
      } else if (textContext.includes('rechazad')) {
        Icon = XCircle;
        colorClass = 'bg-red-100/80 text-red-700 dark:bg-red-950/60 dark:text-red-300';
      } else {
        Icon = AlertTriangle;
        colorClass = 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400';
      }
      break;

    case 'ORDEN_FINALIZADA':
      Icon = CheckCheck;
      colorClass = 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400';
      break;

    case 'NUEVA_ORDEN':
    default:
      Icon = ClipboardPlus;
      colorClass = 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400';
      break;
  }

  // Si la notificación ya fue leída, su icono se muestra atenuado en gris
  const finalClass = isLeida
    ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
    : colorClass;

  return { Icon, className: finalClass };
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

  // Inicializar unread con el valor persistido para evitar parpadeos visuales al navegar
  const [unread, setUnread] = useState(() => {
    const stored = getStoredUnread();
    return stored !== null ? stored : 0;
  });
  const [isRinging, setIsRinging] = useState(false);
  const ringTimerRef = useRef(null);

  const triggerRing = useCallback(() => {
    setIsRinging(true);
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = setTimeout(() => {
      setIsRinging(false);
    }, 1250);
  }, []);

  useEffect(() => {
    return () => {
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    };
  }, []);

  const handleUnreadEvaluation = useCallback((currentUnread) => {
    const prevCount = getStoredUnread();

    if (prevCount === null) {
      // ── Escenario 1: Carga inicial / Primer render con pendientes ──
      // Al iniciar sesión o entrar a la app por primera vez
      setStoredUnread(currentUnread);
      setUnread(currentUnread);

      if (currentUnread > 0) {
        triggerRing();
        playNotificationSound();
      }
      return;
    }

    // ── Escenario 2: Navegación y Detección de Nuevas Notificaciones ──
    if (currentUnread > prevCount) {
      // Hubo un incremento real respecto a la última comprobación
      setStoredUnread(currentUnread);
      setUnread(currentUnread);
      triggerRing();
      playNotificationSound();
      showNotificationToast();
    } else {
      // El conteo se mantuvo igual o disminuyó (ej. usuario leyó alguna)
      setStoredUnread(currentUnread);
      setUnread(currentUnread);
      // NO se dispara ni sonido ni animación
    }
  }, [triggerRing]);

  const refreshCount = useCallback(async () => {
    try {
      const res = await getConteoNotificaciones();
      const currentUnread = Number(res?.no_leidas || 0);
      handleUnreadEvaluation(currentUnread);
    } catch {
      /* silencioso */
    }
  }, [handleUnreadEvaluation]);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotificaciones({ limit: 20 });
      setItems(res?.data || []);
      const count = Number(res?.meta?.no_leidas || 0);
      handleUnreadEvaluation(count);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [handleUnreadEvaluation]);

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
        const next = Math.max(0, unread - 1);
        setStoredUnread(next);
        setUnread(next);
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
      setStoredUnread(0);
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  const badgeLabel = unread > 9 ? '9+' : String(unread);
  const BellIcon = unread > 0 ? BellRing : Bell;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <BellIcon
          className={`w-5 h-5 transition-transform origin-top ${
            isRinging ? 'animate-bell-ring' : ''
          }`}
          onAnimationEnd={() => setIsRinging(false)}
        />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-dark-surface">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2.5 w-[26rem] sm:w-[28rem] md:w-[30rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-dark-border flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Notificaciones</p>
              <p className="text-[11px] text-zinc-500">
                {unread > 0 ? `${unread} sin leer` : 'Todo al día'}
              </p>
            </div>
            {unread > 0 ? (
              <SimpleButton
                size="xs"
                variant="ghost"
                icon={CheckCheck}
                onClick={handleMarkAll}
                className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 no-underline hover:no-underline"
              >
                Marcar todas
              </SimpleButton>
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
                  const { Icon, className } = tipoIcon(item.tipo, item);
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
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                            ) : null}
                          </span>
                          {item.mensaje ? (
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                              {item.mensaje}
                            </span>
                          ) : null}
                          <span className="block text-[11px] text-zinc-400 mt-1.5">
                            {formatRelative(item.created_at)}
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
