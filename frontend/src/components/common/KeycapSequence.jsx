import React from 'react';

/**
 * KeycapSequence
 * Renderiza una combinación de teclas con estética de tecla física mecánica
 * y efecto táctil de pulsación secuencial en cascada cuando la fila activa `group-hover`.
 *
 * @param {string[]} keys - Lista de nombres de teclas (ej: ['Ctrl', 'K'])
 * @param {string} className - Clases opcionales para el contenedor
 */
export const KeycapSequence = ({ keys = [], className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 shrink-0 select-none pt-0.5 ${className}`}>
      {keys.map((key, idx) => {
        const isNotLast = idx < keys.length - 1;

        return (
          <React.Fragment key={idx}>
            <kbd
              style={{ animationDelay: `${idx * 160}ms` }}
              className="animate-keycap inline-flex items-center justify-center px-2 py-1 text-xs font-mono font-semibold rounded-md border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shadow-[0_2px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_2px_0_0_rgba(0,0,0,0.4)] min-w-[24px]"
            >
              {key}
            </kbd>
            {isNotLast && (
              <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 transition-colors group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
                +
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default KeycapSequence;
