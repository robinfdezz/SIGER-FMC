import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck } from 'lucide-react';

/**
 * Componente Reutilizable para Cloudflare Turnstile (Anti-Bot)
 * 
 * Comportamiento:
 * - Tarjeta flotante emergente fija en la esquina inferior derecha del viewport
 *   (`fixed bottom-6 right-6 z-[9999]`), montada a través de React Portal en `document.body`
 *   para escapar de cualquier ancestro con backdrop-blur, transforms o filters.
 * - Ancho rígido anti-colapso: `w-[320px] max-w-[320px] min-w-[320px] box-border`.
 * - Estabilidad anti-bucle: Callbacks almacenados en refs para que re-renders del padre
 *   no provoquen la reinicialización destructiva del widget ni parpadeos.
 * - Animación elástica / spring al entrar (`x: 120%` -> `x: 0`).
 * - Temporizador inteligente de permanencia con control de hover:
 *   * Al verificarse con éxito (`onVerify`), permanece visible 4 segundos (4000ms).
 *   * Si el usuario pasa el cursor (`onMouseEnter`), el temporizador se cancela/pausa
 *     de inmediato para evitar que desaparezca mientras interactúa.
 *   * Al retirar el cursor (`onMouseLeave`), la cuenta regresiva de 4 segundos
 *     se reinicia desde cero (4000ms).
 *   * Tras los 4 segundos, se desliza hacia la derecha (`x: 120%`) y fija visibilidad en false.
 * - En caso de error (`onError`) o expiración (`onExpire`), permanece visible para reintentar.
 * - Gestionado mediante Feature Flag: Si `VITE_ENABLE_TURNSTILE !== 'true'` o no hay `siteKey`,
 *   retorna `null` sin renderizar absolutamente nada en el DOM.
 * 
 * @param {Object} props
 * @param {function} props.onVerify - Callback ejecutado al superar el reto con éxito (recibe token)
 * @param {function} [props.onError] - Callback en caso de error del widget
 * @param {function} [props.onExpire] - Callback cuando el token expira
 * @param {string} [props.theme] - Tema visual: 'auto' | 'light' | 'dark'
 * @param {string} [props.className] - Clases CSS adicionales para el contenedor flotante
 */
const TurnstileWidget = ({
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  className = ''
}) => {
  const isEnabled = import.meta.env.VITE_ENABLE_TURNSTILE === 'true';
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const isHoveredRef = useRef(false);
  const isVerifiedRef = useRef(false);

  // Sincronización de callbacks en refs para evitar bucles de renderizado (Anti-Render Loop)
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  });

  const [mounted, setMounted] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Limpieza de temporizadores de animación
  const clearDismissTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Iniciar o reiniciar cuenta regresiva de salida (4000ms)
  const startDismissTimer = useCallback((delay = 4000) => {
    clearDismissTimers();
    if (isHoveredRef.current) return;

    dismissTimerRef.current = setTimeout(() => {
      setIsExiting(true);
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 500); // Duración de la animación de salida
    }, delay);
  }, [clearDismissTimers]);

  const startDismissTimerRef = useRef(startDismissTimer);
  const clearDismissTimersRef = useRef(clearDismissTimers);

  useEffect(() => {
    startDismissTimerRef.current = startDismissTimer;
    clearDismissTimersRef.current = clearDismissTimers;
  });

  // Manejo de eventos Hover
  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    clearDismissTimers();
    // Si estaba saliendo, restaurar inmediatamente estado visible
    setIsExiting(false);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    // Si la verificación ya culminó con éxito y sigue visible, reiniciar los 4s desde cero
    if (isVerifiedRef.current && isVisible) {
      startDismissTimer(4000);
    }
  };

  // Asegurar hidratación en cliente para renderizar el portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Animación física de entrada (deslizarse con efecto elástico / spring)
  useEffect(() => {
    if (!mounted || !isEnabled || !siteKey) return;
    const timer = setTimeout(() => {
      setIsEntered(true);
    }, 60);
    return () => clearTimeout(timer);
  }, [mounted, isEnabled, siteKey]);

  // Carga asíncrona del script oficial de Cloudflare Turnstile con limpieza de handlers
  useEffect(() => {
    if (!mounted || !isEnabled || !siteKey) return;

    const SCRIPT_ID = 'cf-turnstile-script';
    let script = document.getElementById(SCRIPT_ID);

    const onScriptReady = () => {
      setScriptLoaded(true);
    };

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = onScriptReady;
      script.onerror = () => {
        console.error('[Turnstile] Error al cargar el script oficial de Cloudflare Turnstile.');
        if (onErrorRef.current) onErrorRef.current();
      };
      document.head.appendChild(script);

      return () => {
        script.onload = null;
        script.onerror = null;
      };
    } else if (window.turnstile) {
      setScriptLoaded(true);
    } else {
      script.addEventListener('load', onScriptReady);
      return () => {
        script.removeEventListener('load', onScriptReady);
      };
    }
  }, [mounted, isEnabled, siteKey]);

  // Limpieza de temporizadores de animación al desmontar
  useEffect(() => {
    return () => {
      clearDismissTimers();
    };
  }, [clearDismissTimers]);

  // Renderizado único y controlado del widget de Cloudflare Turnstile
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) {
      return;
    }

    // Anti-Render Loop: si ya está montado, NO volver a inicializar en el mismo nodo
    if (widgetIdRef.current) {
      return;
    }

    const resolvedTheme = theme !== 'auto'
      ? theme
      : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: resolvedTheme,
        callback: (token) => {
          isVerifiedRef.current = true;

          // 1. Notificar inmediatamente la resolución exitosa vía ref
          if (onVerifyRef.current) onVerifyRef.current(token);

          // 2. Si el usuario no tiene el cursor encima, iniciar cuenta regresiva de 4s
          if (!isHoveredRef.current) {
            startDismissTimerRef.current?.(4000);
          }
        },
        'error-callback': () => {
          isVerifiedRef.current = false;
          // Si ocurre un error, cancelar salida y mantener visible para reintento
          clearDismissTimersRef.current?.();
          setIsExiting(false);
          setIsVisible(true);
          if (onErrorRef.current) onErrorRef.current();
        },
        'expired-callback': () => {
          isVerifiedRef.current = false;
          // Si expira, cancelar salida y mantener visible para reintento
          clearDismissTimersRef.current?.();
          setIsExiting(false);
          setIsVisible(true);
          if (onExpireRef.current) onExpireRef.current();
        }
      });
    } catch (err) {
      console.error('[Turnstile] Error renderizando widget:', err);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignorar al desmontar
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey, theme]);

  // Si la protección está inactiva, no hay clave, o aún no monta el cliente: null absoluto
  if (!isEnabled || !siteKey || !mounted || typeof document === 'undefined') {
    return null;
  }

  // Transición física: Curva elástica / spring en entrada, ease-in en salida
  const springTransition = isExiting
    ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms ease'
    : 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 450ms ease';

  const transformValue = (!isEntered || isExiting) ? 'translateX(120%)' : 'translateX(0)';
  const opacityValue = (!isEntered || isExiting) ? 0 : 1;

  const widgetMarkup = (
    <aside
      role="region"
      aria-label="Verificación de seguridad anti-bot"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed bottom-6 right-6 z-[9999] select-none w-[320px] max-w-[320px] min-w-[320px] box-border ${className}`}
      style={{
        transform: transformValue,
        opacity: opacityValue,
        transition: springTransition,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: (!isEntered || isExiting || !isVisible) ? 'none' : 'auto'
      }}
    >
      <div className="w-[320px] max-w-[320px] min-w-[320px] box-border rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800 p-2.5">
        <div className="flex items-center gap-1.5 mb-2 px-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 select-none">
          <ShieldCheck size={14} className="text-red-600 dark:text-red-500 shrink-0" />
          <span>Verificación de seguridad</span>
        </div>

        <div
          ref={containerRef}
          className="w-[300px] min-h-[65px] mx-auto flex items-center justify-center overflow-hidden"
        />
      </div>
    </aside>
  );

  return createPortal(widgetMarkup, document.body);
};

export default TurnstileWidget;
