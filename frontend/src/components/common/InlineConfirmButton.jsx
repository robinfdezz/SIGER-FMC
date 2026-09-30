import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Loader2, UserPlus } from 'lucide-react';

/**
 * Microcomponente interactivo de confirmación inline en dos pasos.
 * Mantiene la identidad visual (colores e icono original del botón).
 * Al pulsar, transiciona sutilmente mostrando el icono original, "¿Unirte?"
 * y dos micro-acciones más sutiles y proporcionadas ([✓] [✕]) con animación de entrada y salida.
 */
export const InlineConfirmButton = ({
  onConfirm,
  text = 'Unirme',
  icon: Icon = UserPlus,
  iconClassName = '',
  confirmText = '¿Unirte?',
  variant = 'card', // 'card' | 'primary' | 'secondary' | 'outline' | 'custom'
  size = 'sm', // 'sm' | 'md'
  className = '',
  confirmClassName = '',
  isLoading = false,
  disabled = false,
  stopPropagation = true,
  autoCancelTimeout = 5000,
  onBeforeConfirm = null,
  title = '',
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const hasInteractedRef = useRef(false);

  const loading = isLoading || internalLoading;

  const triggerClose = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setIsConfirming(false);
      setIsExiting(false);
      exitTimerRef.current = null;
    }, 180);
  }, []);

  const handleStartConfirm = (e) => {
    if (stopPropagation) e.stopPropagation();
    if (disabled || loading) return;
    if (onBeforeConfirm && onBeforeConfirm(e) === false) return;
    hasInteractedRef.current = true;
    setIsExiting(false);
    setIsConfirming(true);
  };

  const handleCancel = (e) => {
    if (stopPropagation) e.stopPropagation();
    triggerClose();
  };

  const handleConfirm = async (e) => {
    if (stopPropagation) e.stopPropagation();
    if (disabled || loading) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (onConfirm) {
      try {
        setInternalLoading(true);
        await onConfirm(e);
      } catch (err) {
        console.error('InlineConfirmButton onConfirm error:', err);
      } finally {
        setInternalLoading(false);
        triggerClose();
      }
    } else {
      triggerClose();
    }
  };

  // Auto-cierre por inactividad (5s) y click-outside
  useEffect(() => {
    if (!isConfirming) return;

    timerRef.current = setTimeout(() => {
      triggerClose();
    }, autoCancelTimeout);

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        triggerClose();
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isConfirming, autoCancelTimeout, triggerClose]);

  const isCard = variant === 'card';
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary' || variant === 'outline';
  const isSizeMd = size === 'md';

  // Los colores del contenedor se preservan exactamente iguales antes y durante la confirmación
  const baseClasses = isCard
    ? 'w-full py-1 px-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 transition-all duration-200 select-none'
    : isPrimary
    ? `${isSizeMd ? 'h-10 px-4 text-sm font-medium' : 'h-[38px] px-3.5 text-xs font-semibold'} rounded-xl bg-red-600 active:bg-red-800 text-white shadow-xs shrink-0 transition-all duration-200 select-none`
    : isSecondary
    ? `${isSizeMd ? 'h-10 px-4 text-sm font-medium' : 'h-[38px] px-3.5 text-xs font-semibold'} rounded-xl bg-white dark:bg-[#18181B] border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100 shadow-2xs shrink-0 transition-all duration-200 select-none`
    : `${isSizeMd ? 'h-10 px-4 text-sm font-medium' : 'h-[38px] px-3.5 text-xs font-semibold'} rounded-xl font-medium border border-neutral-200 dark:border-neutral-800 transition-all duration-200 select-none`;

  const hoverClasses = isCard
    ? 'hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
    : isPrimary
    ? 'hover:bg-red-700'
    : isSecondary
    ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/80'
    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/80';

  const defaultIconColor = isCard
    ? 'text-red-500'
    : isPrimary
    ? 'text-white'
    : 'text-neutral-700 dark:text-neutral-300';

  const resolvedIconClass = iconClassName || defaultIconColor;

  const renderIcon = (iconSize, extraClass = '') => {
    if (loading) {
      return <Loader2 size={iconSize} className="animate-spin shrink-0 text-current" />;
    }

    if (!Icon) return null;

    if (React.isValidElement(Icon)) {
      return React.cloneElement(Icon, {
        size: Icon.props.size || iconSize,
        className: `shrink-0 ${Icon.props.className || resolvedIconClass} ${extraClass}`.trim()
      });
    }

    return <Icon size={iconSize} className={`shrink-0 ${resolvedIconClass} ${extraClass}`.trim()} />;
  };

  const iconSize = isCard ? 11 : isSizeMd ? 16 : 14;

  if (!isConfirming) {
    return (
      <button
        ref={containerRef}
        type="button"
        title={title || undefined}
        disabled={disabled || loading}
        onClick={handleStartConfirm}
        className={`${baseClasses} ${hoverClasses} flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <div
          className={`flex items-center justify-center gap-1.5 ${
            hasInteractedRef.current ? 'animate-confirm-in-center' : ''
          }`}
        >
          {renderIcon(iconSize)}
          <span>{text}</span>
        </div>
      </button>
    );
  }

  // Estado de Confirmación: Conserva fondo, bordes e icono, con Check y X sutiles y animados
  return (
    <div
      ref={containerRef}
      title={title || undefined}
      onClick={(e) => stopPropagation && e.stopPropagation()}
      className={`${baseClasses} flex items-center justify-between gap-2.5 ${confirmClassName || className}`}
    >
      {/* Icono original y Texto con animación sutil homologada de entrada y salida */}
      <div
        className={`flex items-center gap-1.5 min-w-0 ${
          isExiting ? 'animate-confirm-out-left' : 'animate-confirm-in-left'
        }`}
      >
        {renderIcon(iconSize)}
        <span
          className={`truncate font-inter ${
            isCard
              ? 'text-[11px] font-semibold text-neutral-800 dark:text-neutral-200'
              : isSecondary
              ? isSizeMd
                ? 'text-sm font-semibold text-neutral-900 dark:text-neutral-100'
                : 'text-xs font-semibold text-neutral-900 dark:text-neutral-100'
              : isSizeMd
              ? 'text-sm font-semibold text-white'
              : 'text-xs font-semibold text-white'
          }`}
        >
          {confirmText}
        </span>
      </div>

      {/* Micro-acciones: Check (✓) y Cancelar (✕) con animación sutil homologada de entrada y salida */}
      <div
        className={`flex items-center gap-1 shrink-0 ${
          isExiting ? 'animate-confirm-out-right' : 'animate-confirm-in-right'
        }`}
      >
        {/* Botón Check (Confirmar) */}
        <button
          type="button"
          disabled={disabled || loading}
          onClick={handleConfirm}
          title="Confirmar"
          className={`rounded-lg p-1.5 flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isCard || isSecondary
              ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/10'
              : 'text-white/95 hover:text-white hover:bg-white/20 active:bg-white/30'
          }`}
        >
          {loading ? (
            <Loader2 size={isCard ? 13 : 16} className="animate-spin text-current" />
          ) : (
            <Check size={isCard ? 14 : isSizeMd ? 16 : 15} strokeWidth={2.4} className="shrink-0" />
          )}
        </button>

        {/* Botón Cancelar (X) */}
        <button
          type="button"
          disabled={disabled || loading}
          onClick={handleCancel}
          title="Cancelar"
          className={`rounded-lg p-1.5 flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer ${
            isCard || isSecondary
              ? 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              : 'text-white/75 hover:text-white hover:bg-white/20 active:bg-white/30'
          }`}
        >
          <X size={isCard ? 14 : isSizeMd ? 16 : 15} strokeWidth={2.4} className="shrink-0" />
        </button>
      </div>
    </div>
  );
};

export default InlineConfirmButton;
