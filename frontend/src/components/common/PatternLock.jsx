import React from 'react';
import { Unlock } from 'lucide-react';

/**
 * Normaliza cualquier formato de patrón (array 0-8 de DeviceSecurityPicker, array 1-9, string JSON o texto con guiones)
 * a una convención unificada de nodos 1..9 en matriz 3x3 estándar de Android:
 *  1  2  3  (fila 0: col 0, 1, 2)
 *  4  5  6  (fila 1: col 0, 1, 2)
 *  7  8  9  (fila 2: col 0, 1, 2)
 *
 * @param {Array|string|Object} raw
 * @returns {{ nodes: number[], text: string }}
 */
export const normalizePattern = (raw) => {
  if (!raw) return { nodes: [], text: '' };

  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'object' && raw !== null) {
    arr = raw.patron || raw.valor || [];
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          arr = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          arr = parsed.patron || parsed.valor || [];
        }
      } catch {
        arr = trimmed.split(/[-,\s]+/);
      }
    } else if (trimmed.includes('-') || trimmed.includes(',') || trimmed.includes(' ')) {
      arr = trimmed.split(/[-,\s]+/);
    } else {
      arr = trimmed.split('');
    }
  }

  const numArr = (Array.isArray(arr) ? arr : [])
    .map((n) => Number(n))
    .filter((n) => !isNaN(n));

  if (numArr.length === 0) return { nodes: [], text: '' };

  // Detectar base 0 (0..8). Si contiene 0 o algún valor <= 8 con presencia de 0
  const hasZero = numArr.includes(0);
  const maxVal = Math.max(...numArr);
  const isZeroBased = hasZero || (maxVal <= 8 && numArr.some((n) => n === 0));

  // Convertir a base 1 (1..9)
  const nodes1to9 = numArr
    .map((n) => (isZeroBased ? n + 1 : n))
    .filter((n) => n >= 1 && n <= 9);

  return {
    nodes: nodes1to9,
    text: nodes1to9.join('-')
  };
};

/**
 * Componente vector SVG reutilizable para renderizar el patrón de desbloqueo Android (3x3 grid)
 *
 * @param {Object} props
 * @param {string|Array} [props.sequence='1-2-5-8-9'] - Secuencia numérica del patrón
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

  const { nodes: parsedNodes } = normalizePattern(sequence);

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
        const numId = Number(id);
        const isActive = parsedNodes.includes(numId);
        const isStart = parsedNodes[0] === numId;
        return (
          <circle
            key={id}
            cx={pt.x}
            cy={pt.y}
            r={isStart ? '7.5' : isActive ? '6' : '3.5'}
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
 * @param {Object} props.datosAcceso - { tipo: 'patron'|'pin'|'contrasena'|'password'|'ninguno', valor: string|Array, patron: Array }
 * @param {number} [props.size=52] - Tamaño visual base
 * @param {boolean} [props.isPrintable=false] - Si es para impresión
 * @param {string} [props.className=''] - Clases adicionales
 */
export const UnlockMethodView = ({ datosAcceso, size = 52, isPrintable = false, className = '' }) => {
  const datos = datosAcceso?.datos_acceso || datosAcceso?.datos_acceso_equipo || datosAcceso;
  const metodoAcceso = String(datos?.metodo || datos?.tipo || 'ninguno').toLowerCase();

  // Proporción de tarjeta cuidada: 72x82px en pantalla (62x72px en impresión física compacta)
  const cardDimensions = isPrintable ? 'w-[62px] h-[72px]' : 'w-[72px] h-[82px]';

  if (metodoAcceso === 'patron') {
    const rawPattern = datos?.patron ?? datos?.valor;
    const { nodes, text } = normalizePattern(rawPattern || [0, 1, 4, 7, 8]);
    const displayText = text || '1-2-5-8-9';
    const svgSize = isPrintable ? 42 : 48;

    return (
      <div
        className={`shrink-0 ${cardDimensions} rounded-lg border border-neutral-200 bg-neutral-50/50 p-1 flex flex-col items-center justify-between text-center shadow-2xs ${className}`}
      >
        <PatternLockSvg sequence={nodes} size={svgSize} />
        <div className="flex flex-col items-center leading-none mt-0.5">
          <span className="text-[7.5px] font-bold text-neutral-400 uppercase tracking-wider">
            PATRÓN
          </span>
          <span
            className="text-[9px] font-mono font-black text-neutral-800 tracking-tight mt-0.5 max-w-[66px] truncate"
            title={displayText}
          >
            {displayText}
          </span>
        </div>
      </div>
    );
  }

  if (metodoAcceso === 'pin' || metodoAcceso === 'password' || metodoAcceso === 'contrasena' || metodoAcceso === 'clave') {
    const isPin = metodoAcceso === 'pin';
    // Asegurar que NO lea datos.patron (que suele ser [] en métodos PIN/clave)
    const rawClave = datos?.valor ?? datos?.pin ?? datos?.password ?? datos?.clave ?? '';
    let valorClave = '';
    if (typeof rawClave === 'string' || typeof rawClave === 'number') {
      valorClave = String(rawClave).trim();
    } else if (rawClave && typeof rawClave === 'object' && !Array.isArray(rawClave)) {
      valorClave = JSON.stringify(rawClave);
    }
    const displayVal = valorClave || '----';

    return (
      <div
        className={`shrink-0 ${cardDimensions} rounded-lg border border-neutral-200 bg-neutral-50/50 p-1 flex flex-col items-center justify-between text-center shadow-2xs ${className}`}
      >
        <span className="text-[7.5px] font-bold uppercase text-neutral-400 tracking-wider">
          {isPin ? 'PIN' : 'CLAVE'}
        </span>
        <span
          className="text-sm font-mono font-black tracking-widest text-neutral-900 my-auto break-all px-0.5 max-w-[66px] truncate"
          title={displayVal}
        >
          {displayVal}
        </span>
        <span className="text-[7.5px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
          ACCESO
        </span>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 ${cardDimensions} rounded-lg border border-neutral-200 bg-neutral-50/50 p-1 flex flex-col items-center justify-between text-center shadow-2xs ${className}`}
    >
      <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-wider">
        DESBLOQUEO
      </span>
      <div className="flex flex-col items-center justify-center my-auto text-neutral-400">
        <Unlock size={isPrintable ? 16 : 20} className="stroke-[1.75]" />
        <span className="font-mono font-extrabold text-neutral-700 text-[8.5px] mt-1 uppercase leading-tight">
          SIN CLAVE
        </span>
      </div>
      <span className="text-[7px] font-mono text-neutral-400 uppercase">
        LIBRE
      </span>
    </div>
  );
};

export default PatternLockSvg;

