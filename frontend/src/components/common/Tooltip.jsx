import React from 'react';

// ============================================================================
// CONFIGURACIÓN DE RETARDOS DEL TOOLTIP (Modificar en milisegundos)
// ============================================================================
export const TOOLTIP_ENTER_DELAY_MS = 500; // Tiempo de espera antes de mostrarse (hover)
export const TOOLTIP_LEAVE_DELAY_MS = 200;   // Tiempo de espera antes de ocultarse (salida)

/**
 * Componente modular de Tooltip flotante con forma geométrica continua en chevrón (clip-path).
 *
 * @param {React.ReactNode} children - Elemento trigger interactivo sobre el que se hace hover.
 * @param {React.ReactNode} content - Texto o contenido de la tarjeta flotante.
 * @param {'right' | 'left' | 'top' | 'bottom'} position - Posición relativa (por defecto: 'right').
 * @param {boolean} enabled - Activa o desactiva la renderización del tooltip (por defecto: true).
 * @param {number} enterDelay - Retardo de entrada en ms (por defecto: TOOLTIP_ENTER_DELAY_MS).
 * @param {number} leaveDelay - Retardo de salida en ms (por defecto: TOOLTIP_LEAVE_DELAY_MS).
 * @param {string} className - Clases adicionales de Tailwind para la tarjeta flotante.
 */
const Tooltip = ({
  children,
  content,
  position = 'right',
  enabled = true,
  enterDelay = TOOLTIP_ENTER_DELAY_MS,
  leaveDelay = TOOLTIP_LEAVE_DELAY_MS,
  className = ''
}) => {
  if (!enabled || !content) {
    return <>{children}</>;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'right-full mr-2 top-1/2 -translate-y-1/2 translate-x-1 group-hover/tooltip:translate-x-0 pl-2.5 pr-3.5 py-1 rounded-l-md';
      case 'top':
        return 'bottom-full mb-2 left-1/2 -translate-x-1/2 translate-y-1 group-hover/tooltip:translate-y-0 px-2.5 pt-1 pb-3 rounded-t-md';
      case 'bottom':
        return 'top-full mt-2 left-1/2 -translate-x-1/2 -translate-y-1 group-hover/tooltip:translate-y-0 px-2.5 pt-3 pb-1 rounded-b-md';
      case 'right':
      default:
        return 'left-full ml-2 top-1/2 -translate-y-1/2 -translate-x-1 group-hover/tooltip:translate-x-0 pl-3.5 pr-2.5 py-1 rounded-r-md';
    }
  };

  const getClipPathStyle = () => {
    switch (position) {
      case 'left':
        return { clipPath: 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 0% 100%)' };
      case 'top':
        return { clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(100% - 8px), 50% 100%, 0% calc(100% - 8px))' };
      case 'bottom':
        return { clipPath: 'polygon(50% 0%, 0% 8px, 0% 100%, 100% 100%, 100% 8px)' };
      case 'right':
      default:
        return { clipPath: 'polygon(8px 0%, 100% 0%, 100% 100%, 8px 100%, 0% 50%)' };
    }
  };

  return (
    <div
      className="relative group/tooltip inline-flex items-center"
      style={{
        '--tooltip-enter-delay': `${enterDelay}ms`,
        '--tooltip-leave-delay': `${leaveDelay}ms`,
      }}
    >
      {children}
      <div
        role="tooltip"
        style={getClipPathStyle()}
        className={`absolute z-50 pointer-events-none opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible [transition-delay:var(--tooltip-leave-delay)] group-hover/tooltip:[transition-delay:var(--tooltip-enter-delay)] transition-all duration-150 ease-out whitespace-nowrap text-xs font-medium tracking-normal text-white bg-neutral-900 dark:bg-zinc-800 shadow-md select-none ${getPositionClasses()} ${className}`}
      >
        {content}
      </div>
    </div>
  );
};

export default Tooltip;
