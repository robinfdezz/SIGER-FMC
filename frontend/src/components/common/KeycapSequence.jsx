import React, { useState } from 'react';

/**
 * KeycapSequence
 * Renderiza una combinación de teclas con estética de tecla física mecánica
 * y efecto táctil de pulsación secuencial en cascada cuando la fila activa `group-hover`.
 *
 * Permite hacer clic y mantener presionada cualquier tecla (hundida 2px y sin sombra),
 * y al soltar el clic, reinicia inmediatamente la animación en cascada desde cero.
 *
 * @param {string[]} keys - Lista de nombres de teclas (ej: ['Ctrl', 'K'])
 * @param {string} className - Clases opcionales para el contenedor
 */
export const KeycapSequence = ({ keys = [], className = '' }) => {
  const [pressedIdx, setPressedIdx] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  const handleMouseDown = (idx) => {
    setPressedIdx(idx);
  };

  const handleMouseUp = () => {
    if (pressedIdx !== null) {
      setPressedIdx(null);
      setAnimKey((prev) => prev + 1);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 shrink-0 select-none pt-0.5 ${className}`}
      onMouseLeave={handleMouseUp}
    >
      {keys.map((key, idx) => {
        const isNotLast = idx < keys.length - 1;
        const isPressed = pressedIdx === idx;

        return (
          <React.Fragment key={idx}>
            <kbd
              key={`${idx}-${animKey}`}
              style={{ animationDelay: `${idx * 160}ms` }}
              onMouseDown={() => handleMouseDown(idx)}
              onMouseUp={handleMouseUp}
              onTouchStart={() => handleMouseDown(idx)}
              onTouchEnd={handleMouseUp}
              className={`animate-keycap cursor-pointer inline-flex items-center justify-center px-2 py-1 text-xs font-mono font-semibold rounded-md border text-neutral-700 dark:text-neutral-300 min-w-[24px] transition-[transform,box-shadow,border-color] duration-75 ${
                isPressed
                  ? '!translate-y-[2px] !shadow-none !border-neutral-400 dark:!border-neutral-500 !bg-neutral-100 dark:!bg-neutral-700/80 [animation:none!important]'
                  : 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 shadow-[0_2px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_2px_0_0_rgba(0,0,0,0.4)]'
              }`}
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
