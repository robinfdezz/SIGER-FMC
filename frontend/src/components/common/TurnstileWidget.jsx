import React, { useEffect, useRef, useState } from 'react';

/**
 * Componente Reutilizable para Cloudflare Turnstile (Anti-Bot)
 * 
 * Gestionado mediante Feature Flag:
 * Si VITE_ENABLE_TURNSTILE !== 'true' o no hay siteKey, retorna `null`
 * sin renderizar nada en el DOM ni cargar scripts de terceros.
 * 
 * @param {Object} props
 * @param {function} props.onVerify - Callback ejecutado al superar el reto con éxito (recibe token)
 * @param {function} [props.onError] - Callback en caso de error del widget
 * @param {function} [props.onExpire] - Callback cuando el token expira
 * @param {string} [props.theme] - Tema visual: 'auto' | 'light' | 'dark'
 * @param {string} [props.className] - Clases CSS adicionales para el contenedor
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
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Si la protección está dormida/desactivada, no inyecta nada
  if (!isEnabled || !siteKey) {
    return null;
  }

  useEffect(() => {
    // 1. Cargar dinámicamente el script de Cloudflare Turnstile si no existe
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
        if (onError) onError();
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      setScriptLoaded(true);
    } else {
      script.addEventListener('load', onScriptReady);
      return () => {
        script.removeEventListener('load', onScriptReady);
      };
    }
  }, [onError]);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) {
      return;
    }

    // Si ya existe un widget montado, lo limpiamos antes de re-renderizar
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Ignorar si ya fue removido
      }
      widgetIdRef.current = null;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme,
        callback: (token) => {
          if (onVerify) onVerify(token);
        },
        'error-callback': () => {
          if (onError) onError();
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
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
  }, [scriptLoaded, siteKey, theme, onVerify, onError, onExpire]);

  return (
    <div className={`flex justify-center my-3 ${className}`}>
      <div ref={containerRef} />
    </div>
  );
};

export default TurnstileWidget;
