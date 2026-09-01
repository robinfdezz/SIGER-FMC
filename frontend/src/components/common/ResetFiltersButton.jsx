import React, { useState, useRef, useEffect } from 'react';
import { MorphIcon } from 'morphicons/react';
import { Check, X } from 'lucide';

/**
 * Componente modular de botón de reset / limpieza de filtros con MorphIcon interactivo.
 *
 * @param {Function} onClick / onReset - Función que ejecuta el reseteo de filtros.
 * @param {boolean} hasActiveFilters - Indica si hay filtros activos para habilitar el botón.
 * @param {boolean} disabled - Deshabilita el botón manualmente.
 * @param {string} title - Texto de tooltip / accesibilidad (por defecto: 'Limpiar filtros').
 * @param {string} ariaLabel - Etiqueta aria (por defecto: 'Limpiar filtros').
 * @param {number} durationMs - Duración del estado de éxito/check animado (por defecto: 1200ms).
 * @param {string} className - Clases adicionales de Tailwind.
 * @param {number} size - Tamaño del ícono (por defecto: 16).
 */
const ResetFiltersButton = ({
  onClick,
  onReset,
  hasActiveFilters = false,
  disabled = false,
  title = 'Limpiar filtros',
  ariaLabel = 'Limpiar filtros',
  durationMs = 1200,
  className = '',
  size = 16
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = (e) => {
    if ((!hasActiveFilters && !isResetting) || disabled || isResetting) return;

    setIsResetting(true);

    const callback = onReset || onClick;
    if (callback) {
      callback(e);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsResetting(false);
    }, durationMs);
  };

  const isButtonDisabled = disabled || (!hasActiveFilters && !isResetting);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isButtonDisabled}
      aria-label={ariaLabel}
      title={title}
      className={`p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 transition-all flex items-center justify-center shrink-0 active:scale-95 ${
        isResetting
          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
          : hasActiveFilters
          ? 'bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-red-500 dark:hover:text-red-400 cursor-pointer shadow-xs'
          : 'bg-neutral-50/50 dark:bg-neutral-900/30 text-neutral-300 dark:text-neutral-600 opacity-40 cursor-not-allowed pointer-events-none'
      } ${className}`}
    >
      <MorphIcon
        icon={isResetting ? Check : X}
        size={size}
        spring="smooth"
      />
    </button>
  );
};

export default ResetFiltersButton;
