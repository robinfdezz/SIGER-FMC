import React, { useState, useEffect, useRef } from 'react';
import { MorphIcon } from 'morphicons/react';
import { Check, RotateCcw } from 'lucide';

/**
 * Componente genérico de botón con icono animado vectorial interactivo.
 * Utiliza MorphIcon para morphing vectorial REAL entre el icono base y Check.
 * Soporta estados de carga/rotación fluida (loading / isAnimating) y éxito temporal.
 * Mantiene la persistencia del borde e integridad visual en todos los estados.
 *
 * @param {Array|null} icon - Nodo de icono de 'lucide' (por defecto: RotateCcw de 'lucide')
 * @param {boolean} loading - Activa la animación de giro/spin continuo de 360°
 * @param {boolean} isAnimating - Disparador alternativo de animación de rotación
 * @param {boolean} success - Activa el morphing vectorial hacia Check verde esmeralda
 * @param {boolean} showSuccess - Alias de success
 * @param {number} durationMs - Duración del estado de éxito en ms (por defecto: 1200ms)
 * @param {Function} onSuccessEnd - Callback opcional al finalizar el estado de éxito
 * @param {Function} onClick - Manejador de evento click
 * @param {boolean} disabled - Estado deshabilitado manual
 * @param {string} title - Texto de tooltip en hover
 * @param {string} tooltip - Alias para title
 * @param {string} ariaLabel - Etiqueta accesible aria-label
 * @param {'default'|'subtle'|'ghost'|'emerald'|'danger'|'custom'} variant - Variante visual institucional
 * @param {number} size - Tamaño del icono en píxeles (por defecto: 17)
 * @param {string} className - Clases adicionales de Tailwind
 * @param {React.ReactNode} children - Contenido personalizado opcional (ej. MorphIcon en ResetFiltersButton)
 */
const AnimatedIconButton = ({
  icon = RotateCcw,
  loading = false,
  isAnimating = false,
  success = false,
  showSuccess = false,
  durationMs = 1200,
  onSuccessEnd = null,
  onClick,
  disabled = false,
  title = '',
  tooltip = '',
  ariaLabel = '',
  variant = 'default',
  size = 17,
  className = '',
  children,
  ...props
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const timeoutRef = useRef(null);

  const activeSuccessProp = success || showSuccess;

  // Manejo del ciclo de vida del estado de éxito temporal
  useEffect(() => {
    if (activeSuccessProp) {
      setIsSuccess(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsSuccess(false);
        if (onSuccessEnd) {
          onSuccessEnd();
        }
      }, durationMs);
    }
  }, [activeSuccessProp, durationMs, onSuccessEnd]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const activeAnimation = (loading || isAnimating) && !isSuccess;
  const computedTitle = isSuccess ? 'Actualizado correctamente' : (title || tooltip);
  const computedAriaLabel = ariaLabel || computedTitle || 'Acción';

  // Si icon es un array de nodos de 'lucide' lo usamos, si no usamos RotateCcw por defecto
  const baseIconNode = Array.isArray(icon) && icon.length > 0 ? icon : RotateCcw;
  const currentIcon = isSuccess ? Check : baseIconNode;

  const variantStyles = {
    default:
      'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-100 bg-white dark:bg-[#141416]',
    subtle:
      'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 bg-neutral-50 dark:bg-neutral-900',
    ghost:
      'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800',
    emerald:
      'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    danger:
      'border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
    custom: ''
  };

  const successStyles =
    'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shadow-xs';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || (loading && !isSuccess)}
      title={computedTitle}
      aria-label={computedAriaLabel}
      className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 focus:outline-none ${
        isSuccess && variant !== 'custom'
          ? successStyles
          : (variantStyles[variant] || variantStyles.default)
      } ${
        disabled
          ? 'opacity-50 cursor-not-allowed pointer-events-none'
          : loading
          ? 'cursor-wait'
          : 'cursor-pointer'
      } ${className}`}
      {...props}
    >
      {children ? (
        children
      ) : (
        <span
          className={`inline-flex items-center justify-center shrink-0 transition-transform duration-300 ${
            activeAnimation ? 'animate-spin' : ''
          }`}
        >
          <MorphIcon
            icon={currentIcon}
            size={size}
            spring="smooth"
            className="shrink-0"
          />
        </span>
      )}
    </button>
  );
};

export default AnimatedIconButton;
