import React from 'react';
import { Unlock, Hash, KeyRound } from 'lucide-react';

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
 * Soporta dos variantes visuales:
 * - 'reception': Homologado al diseñador de recepción (DeviceSecurityPicker): cuadrícula 3x3 con nodos rojos (#ef4444),
 *   halo exterior (#ef444425), números de paso en blanco, líneas conectoras rojas y puntos neutros inactivos.
 * - 'printable': Miniatura monocromática de alto contraste (#111827) optimizada para etiquetas térmicas.
 *
 * @param {Object} props
 * @param {string|Array} [props.sequence='1-2-5-8-9'] - Secuencia numérica del patrón
 * @param {number} [props.size=144] - Tamaño en píxeles (ancho y alto del SVG)
 * @param {'reception'|'printable'} [props.variant='reception'] - Variante visual
 * @param {string} [props.className=''] - Clases CSS adicionales
 */
export const PatternLockSvg = ({
  sequence = '1-2-5-8-9',
  size = 144,
  variant = 'reception',
  isPrintable = false,
  className = ''
}) => {
  const { nodes: parsedNodes } = normalizePattern(sequence);

  // Modo Compacto / Impresión Térmica: Cuadrícula 3x3 homologada a escala compacta (viewBox 0 0 100 100)
  if (variant === 'compact' || variant === 'printable' || size <= 84) {
    const nodeMapCompact = {
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

    const polylinePoints = parsedNodes
      .map((n) => nodeMapCompact[n])
      .filter(Boolean)
      .map((pt) => `${pt.x},${pt.y}`)
      .join(' ');

    // Formato térmico (etiquetas y stickers adhesivos): Estrictamente monocromático de alto contraste
    // (negro/neutral #111827) para visualización e impresión térmica física sin rojo.
    const activeColor = '#111827';
    const haloColor = '#11182715';
    const lineColor = '#111827';

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={`aspect-square select-none pointer-events-none rounded-lg bg-white border border-neutral-200/80 p-0.5 shrink-0 ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Líneas conectoras siguiendo la trayectoria exacta */}
        {polylinePoints && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={lineColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Cuadrícula 3x3 de nodos: halo, nodo activo con número blanco y nodos inactivos */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => {
          const pt = nodeMapCompact[id];
          const isActive = parsedNodes.includes(id);
          const order = isActive ? parsedNodes.indexOf(id) + 1 : null;

          return (
            <g key={id}>
              {/* Halo suave exterior cuando está activo */}
              {isActive && (
                <circle cx={pt.x} cy={pt.y} r="14" fill={haloColor} />
              )}

              {/* Círculo del nodo */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? '9.5' : '6'}
                fill={isActive ? activeColor : '#ffffff'}
                stroke={isActive ? activeColor : '#9ca3af'}
                strokeWidth={isActive ? 0 : 1.5}
              />

              {/* Número del paso dentro del círculo activo en blanco */}
              {isActive && (
                <text
                  x={pt.x}
                  y={pt.y + 0.6}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#ffffff"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {order}
                </text>
              )}

              {/* Punto central gris para nodos no utilizados */}
              {!isActive && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="2.2"
                  fill="#6b7280"
                />
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  // Variante 'reception': Modo Ficha Técnica / Pantalla completa (viewBox 0 0 240 240)
  const GRID_SIZE = 240;
  const NODE_R = 21;
  const nodeCenter = (col, row) => {
    const step = GRID_SIZE / 3;
    const offset = step / 2;
    return { x: col * step + offset, y: row * step + offset };
  };

  const nodeMap = {
    1: nodeCenter(0, 0),
    2: nodeCenter(1, 0),
    3: nodeCenter(2, 0),
    4: nodeCenter(0, 1),
    5: nodeCenter(1, 1),
    6: nodeCenter(2, 1),
    7: nodeCenter(0, 2),
    8: nodeCenter(1, 2),
    9: nodeCenter(2, 2)
  };

  const polylinePoints = parsedNodes
    .map((n) => nodeMap[n])
    .filter(Boolean)
    .map((pt) => `${pt.x},${pt.y}`)
    .join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      className={`aspect-square select-none pointer-events-none rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 p-1 shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Líneas conectoras rojas siguiendo la trayectoria exacta */}
      {polylinePoints && (
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#ef4444"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
      )}

      {/* Cuadrícula 3x3 de nodos con halo suave, nodo rojo y número blanco */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => {
        const { x, y } = nodeMap[id];
        const isActive = parsedNodes.includes(id);
        const order = isActive ? parsedNodes.indexOf(id) + 1 : null;

        return (
          <g key={id}>
            {/* Halo suave exterior cuando está activo */}
            {isActive && (
              <circle cx={x} cy={y} r={NODE_R * 1.5} fill="#ef444425" />
            )}

            {/* Nodo principal (rojo si activo, blanco con borde tenue si inactivo) */}
            <circle
              cx={x}
              cy={y}
              r={NODE_R}
              fill={isActive ? '#ef4444' : '#ffffff'}
              stroke={isActive ? '#ef4444' : '#d4d4d4'}
              strokeWidth={isActive ? 0 : 2}
              className={isActive ? '' : 'dark:fill-neutral-900 dark:stroke-neutral-600'}
            />

            {/* Número del paso de la secuencia dentro de cada círculo en color blanco */}
            {isActive && (
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="14"
                fontWeight="700"
                fill="#ffffff"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {order}
              </text>
            )}

            {/* Punto central gris tenue neutral para nodos no utilizados */}
            {!isActive && (
              <circle cx={x} cy={y} r={4.5} fill="#a3a3a3" />
            )}
          </g>
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
 * @param {number} [props.size] - Tamaño visual base
 * @param {boolean} [props.isPrintable=false] - Si es para impresión de etiqueta térmica
 * @param {'auto'|'full'|'compact'} [props.variant='auto'] - Variante de presentación
 * @param {string} [props.className=''] - Clases adicionales
 */
export const UnlockMethodView = ({
  datosAcceso,
  size,
  isPrintable = false,
  variant = 'auto',
  className = ''
}) => {
  const datos = datosAcceso?.datos_acceso || datosAcceso?.datos_acceso_equipo || datosAcceso;
  const metodoAcceso = String(datos?.metodo || datos?.tipo || 'ninguno').toLowerCase();
  const isCompact = isPrintable || variant === 'compact';

  if (metodoAcceso === 'patron') {
    const rawPattern = datos?.patron ?? datos?.valor;
    const { nodes, text } = normalizePattern(rawPattern || [0, 1, 4, 7, 8]);
    const displayText = text || '1-2-5-8-9';

    if (isCompact) {
      const svgSize = Math.min(size || (isPrintable ? 38 : 48), 64);
      return (
        <div
          className={`shrink-0 w-full max-w-[84px] rounded-lg border border-neutral-200/80 bg-white p-1 flex flex-col items-center justify-center text-center shadow-2xs ${className}`}
        >
          <PatternLockSvg
            sequence={nodes}
            size={svgSize}
            variant="compact"
            isPrintable={isPrintable}
            className="max-h-[64px] max-w-[64px]"
          />
          <div
            className="w-full mt-1 px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/60 text-[8.5px] font-mono font-bold text-neutral-800 dark:text-neutral-200 tracking-tight text-center break-all whitespace-normal leading-tight select-all flex items-center justify-center flex-wrap"
            title={`Secuencia: ${displayText}`}
          >
            {displayText}
          </div>
        </div>
      );
    }

    // Modo Pantalla / Ficha Técnica (Homologado con diseñador de recepción)
    const svgSize = size || 144;

    return (
      <div className={`flex flex-col items-center justify-center text-center w-full py-1 ${className}`}>
        <PatternLockSvg
          sequence={nodes}
          size={svgSize}
          variant="reception"
          className="shadow-2xs"
        />

        <div className="mt-2 w-full max-w-[200px]">
          <div
            className="w-full px-2.5 py-1 rounded-lg bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700/60 text-[11px] font-mono font-bold text-neutral-800 dark:text-neutral-200 break-all whitespace-normal text-center leading-normal select-all tracking-wider shadow-2xs flex items-center justify-center flex-wrap"
            title={`Secuencia numérica: ${displayText}`}
          >
            {displayText}
          </div>
        </div>
      </div>
    );
  }

  if (metodoAcceso === 'pin' || metodoAcceso === 'password' || metodoAcceso === 'contrasena' || metodoAcceso === 'clave') {
    const isPin = metodoAcceso === 'pin';
    const rawClave = datos?.valor ?? datos?.pin ?? datos?.password ?? datos?.clave ?? '';
    let valorClave = '';
    if (typeof rawClave === 'string' || typeof rawClave === 'number') {
      valorClave = String(rawClave).trim();
    } else if (rawClave && typeof rawClave === 'object' && !Array.isArray(rawClave)) {
      valorClave = JSON.stringify(rawClave);
    }
    const displayVal = valorClave || '----';

    if (isCompact) {
      return (
        <div
          className={`shrink-0 w-full max-w-[84px] py-1.5 px-1 rounded-lg border border-neutral-200 bg-neutral-50/50 flex flex-col items-center justify-between text-center shadow-2xs ${className}`}
        >
          <span className="text-[7px] font-bold uppercase text-neutral-400 tracking-wider">
            {isPin ? 'PIN' : 'CLAVE'}
          </span>
          <span
            className="text-xs font-mono font-black tracking-wider text-neutral-900 my-0.5 break-all whitespace-normal px-0.5 max-w-full text-center leading-tight select-all"
            title={displayVal}
          >
            {displayVal}
          </span>
          <span className="text-[7px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
            ACCESO
          </span>
        </div>
      );
    }

    const IconComp = isPin ? Hash : KeyRound;
    return (
      <div className={`flex flex-col items-center justify-center py-2 gap-2 text-center w-full ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shadow-2xs">
          <IconComp size={22} className="stroke-[2]" />
        </div>
        <div className="space-y-1 w-full max-w-[190px] px-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 block">
            {isPin ? 'PIN Numérico' : 'Contraseña de Acceso'}
          </span>
          <div
            className="px-3 py-1.5 rounded-lg bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/70 dark:border-neutral-700/60 font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 break-all select-all tracking-wider shadow-2xs"
            title={displayVal}
          >
            {displayVal}
          </div>
        </div>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div
        className={`shrink-0 w-full max-w-[84px] py-1.5 px-1 rounded-lg border border-neutral-200 bg-neutral-50/50 flex flex-col items-center justify-between text-center shadow-2xs ${className}`}
      >
        <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-wider">
          DESBLOQUEO
        </span>
        <div className="flex flex-col items-center justify-center my-0.5 text-neutral-400">
          <Unlock size={isPrintable ? 16 : 18} className="stroke-[1.75]" />
          <span className="font-mono font-extrabold text-neutral-700 text-[8px] mt-0.5 uppercase leading-tight">
            SIN CLAVE
          </span>
        </div>
        <span className="text-[7px] font-mono text-neutral-400 uppercase">
          LIBRE
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-3 gap-2 text-center w-full ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
        <Unlock size={22} className="stroke-[2]" />
      </div>
      <div className="space-y-0.5">
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block font-inter">
          Sin Bloqueo
        </span>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 block">
          Acceso libre sin clave
        </span>
      </div>
    </div>
  );
};

export default PatternLockSvg;
