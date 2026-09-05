import React from 'react';

/**
 * Componente vector SVG reutilizable para renderizar el patrón de desbloqueo Android (3x3 grid)
 *
 * @param {Object} props
 * @param {string} [props.sequence='1-2-5-8-9'] - Secuencia numérica del patrón (ej: '1-2-5-8-9')
 * @param {number} [props.size=64] - Tamaño en píxeles (ancho y alto del SVG)
 * @param {string} [props.className=''] - Clases CSS adicionales
 */
export const PatternLockSvg = ({ sequence = '1-2-5-8-9', size = 64, className = '' }) => {
  const nodeMap = {
    1: { x: 20, y: 20 },
    2: { x: 50, y: 20 },
    3: { x: 80, y: 20 },
    4: { x: 20, y: 50 },
    5: { x: 50, y: 50 },
    6: { x: 80, y: 50 },
    7: { x: 20, y: 80 },
    8: { x: 50, y: 80 },
    9: { x: 80, y: 80 }
  };

  const parsedNodes = String(sequence || '')
    .replace(/[^1-9]/g, '')
    .split('')
    .map(Number)
    .filter((n) => n >= 1 && n <= 9);

  const polylinePoints = parsedNodes
    .map((n) => nodeMap[n])
    .filter(Boolean)
    .map((pt) => `${pt.x},${pt.y}`)
    .join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width="100" height="100" rx="10" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
      {polylinePoints && (
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#111827"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {Object.entries(nodeMap).map(([id, pt]) => {
        const isActive = parsedNodes.includes(Number(id));
        const isStart = parsedNodes[0] === Number(id);
        return (
          <circle
            key={id}
            cx={pt.x}
            cy={pt.y}
            r={isStart ? '7.5' : isActive ? '6' : '4'}
            fill={isActive ? '#111827' : '#9CA3AF'}
          />
        );
      })}
    </svg>
  );
};

/**
 * Componente modular para mostrar métodos de desbloqueo (Patrón, PIN, Clave o Sin Bloqueo)
 *
 * @param {Object} props
 * @param {Object} props.datosAcceso - { tipo: 'patron'|'pin'|'password'|'sin_bloqueo', valor: string }
 * @param {number} [props.size=64] - Tamaño visual base
 * @param {string} [props.className=''] - Clases adicionales
 */
export const UnlockMethodView = ({ datosAcceso, size = 64, className = '' }) => {
  const { tipo = 'patron', valor = '1-2-5-8-9' } = datosAcceso || {};

  if (tipo === 'patron') {
    return (
      <div className={`shrink-0 flex flex-col items-center justify-center bg-white p-1 rounded-md border border-neutral-200 text-center shadow-2xs ${className}`}>
        <PatternLockSvg sequence={valor} size={size} />
        <span className="text-[7.5px] font-mono font-bold text-neutral-600 mt-0.5 uppercase tracking-wider">
          PATRÓN
        </span>
        <span className="text-[8.5px] font-mono font-black text-neutral-900 tracking-tight leading-none mt-0.5">
          {valor || '1-2-5-8-9'}
        </span>
      </div>
    );
  }

  if (tipo === 'pin' || tipo === 'password') {
    return (
      <div
        className={`shrink-0 flex flex-col items-center justify-center bg-white p-1.5 rounded-md border border-neutral-200 text-center shadow-2xs ${className}`}
        style={{ width: `${size}px`, height: `${size + 12}px` }}
      >
        <span className="text-[7px] font-bold uppercase text-neutral-500 tracking-wider">
          {tipo === 'pin' ? 'PIN' : 'CLAVE'}
        </span>
        <span className="font-mono font-black text-neutral-900 text-xs sm:text-sm tracking-wider my-0.5 break-all px-0.5">
          {valor || '1234'}
        </span>
        <span className="text-[7px] font-mono font-bold text-neutral-600 uppercase">
          ACCESO
        </span>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 flex flex-col items-center justify-center bg-white p-1 rounded-md border border-neutral-200 text-center shadow-2xs ${className}`}
      style={{ width: `${size}px`, height: `${size + 12}px` }}
    >
      <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-wider">
        DESBLOQUEO
      </span>
      <span className="font-mono font-extrabold text-neutral-800 text-[9px] my-0.5 uppercase leading-tight">
        SIN CLAVE
      </span>
      <span className="text-[7px] font-mono text-neutral-400 uppercase">
        LIBRE
      </span>
    </div>
  );
};

export default PatternLockSvg;
