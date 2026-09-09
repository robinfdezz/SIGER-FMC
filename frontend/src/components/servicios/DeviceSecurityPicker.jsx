import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, RotateCcw, Lock, Hash, Type, Unlock } from 'lucide-react';
import { Eye, EyeOff } from 'lucide';
import { MorphIcon } from 'morphicons/react';

// ────────────────────────────────────────────────────────────────
// MÉTODOS DE DESBLOQUEO
// ────────────────────────────────────────────────────────────────
const METODOS = [
  { id: 'ninguno',    label: 'Sin Bloqueo',             Icon: Unlock },
  { id: 'patron',     label: 'Patrón Android',          Icon: Lock   },
  { id: 'pin',        label: 'PIN Numérico',            Icon: Hash   },
  { id: 'contrasena', label: 'Contraseña',              Icon: Type   },
];

// ────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: Cuadrícula de Patrón Android 3x3
// ────────────────────────────────────────────────────────────────
const GRID_SIZE = 240;
const NODE_R    = 18;
const POSITIONS = [
  [0, 0], [1, 0], [2, 0],
  [0, 1], [1, 1], [2, 1],
  [0, 2], [1, 2], [2, 2],
];

const nodeCenter = (col, row) => {
  const step = GRID_SIZE / 3;
  const offset = step / 2;
  return { x: col * step + offset, y: row * step + offset };
};

const PatternGrid = ({ pattern, onChange }) => {
  const svgRef  = useRef(null);
  const drawing = useRef(false);
  const mouse   = useRef({ x: 0, y: 0 });

  const getSvgPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX  = GRID_SIZE / rect.width;
    const scaleY  = GRID_SIZE / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  };

  const getNodeAt = ({ x, y }) => {
    for (let idx = 0; idx < 9; idx++) {
      const [col, row] = POSITIONS[idx];
      const c = nodeCenter(col, row);
      const dist = Math.hypot(x - c.x, y - c.y);
      if (dist <= NODE_R * 1.4) return idx;
    }
    return null;
  };

  const [livePos, setLivePos] = useState(null);
  const patternRef = useRef(pattern);
  useEffect(() => { patternRef.current = pattern; }, [pattern]);

  const onStart = (e) => {
    e.preventDefault();
    drawing.current = true;
    const pt = getSvgPoint(e);
    mouse.current = pt;
    const node = getNodeAt(pt);
    if (node !== null && !patternRef.current.includes(node)) {
      onChange([node]);
    } else {
      onChange([]);
    }
    setLivePos(pt);
  };

  const onMove = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pt = getSvgPoint(e);
    mouse.current = pt;
    setLivePos({ ...pt });
    const node = getNodeAt(pt);
    if (node !== null && !patternRef.current.includes(node)) {
      const next = [...patternRef.current, node];
      onChange(next);
      patternRef.current = next;
    }
  }, [onChange]);

  const onEnd = () => {
    drawing.current = false;
    setLivePos(null);
  };

  useEffect(() => {
    window.addEventListener('mouseup',  onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mouseup',  onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  const isActive = (idx) => pattern.includes(idx);
  const activeOrder = (idx) => pattern.indexOf(idx) + 1;

  // Dibuja las líneas del patrón
  const lines = [];
  for (let i = 0; i < pattern.length - 1; i++) {
    const [c1, r1] = POSITIONS[pattern[i]];
    const [c2, r2] = POSITIONS[pattern[i + 1]];
    const a = nodeCenter(c1, r1);
    const b = nodeCenter(c2, r2);
    lines.push(<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />);
  }

  // Línea hacia la posición actual del puntero
  if (livePos && pattern.length > 0) {
    const last = pattern[pattern.length - 1];
    const [lc, lr] = POSITIONS[last];
    const lp = nodeCenter(lc, lr);
    lines.push(<line key="live" x1={lp.x} y1={lp.y} x2={livePos.x} y2={livePos.y} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" opacity="0.5" />);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
        className="w-full max-w-[220px] aspect-square touch-none select-none cursor-crosshair rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700"
        onMouseDown={onStart}
        onMouseMove={onMove}
        onTouchStart={onStart}
        onTouchMove={onMove}
      >
        {lines}
        {POSITIONS.map(([col, row], idx) => {
          const { x, y } = nodeCenter(col, row);
          const active   = isActive(idx);
          const order    = active ? activeOrder(idx) : null;
          return (
            <g key={idx}>
              {/* Círculo exterior (halo) cuando está activo */}
              {active && (
                <circle cx={x} cy={y} r={NODE_R * 1.5} fill="#ef444420" />
              )}
              {/* Nodo principal */}
              <circle
                cx={x} cy={y} r={NODE_R}
                fill={active ? '#ef4444' : 'white'}
                stroke={active ? '#ef4444' : '#d4d4d4'}
                strokeWidth={active ? 0 : 2}
                className="dark:stroke-neutral-600"
              />
              {/* Número de orden */}
              {active && (
                <text
                  x={x} y={y + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="11" fontWeight="700" fill="white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {order}
                </text>
              )}
              {/* Punto central si no está activo */}
              {!active && (
                <circle cx={x} cy={y} r={4} fill="#a3a3a3" />
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-2">
        {pattern.length > 0 && (
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter">
            Patrón: <strong className="text-neutral-700 dark:text-neutral-300">{pattern.length} puntos</strong>
          </p>
        )}
        {pattern.length === 0 && (
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-inter">Dibuja el patrón sobre la cuadrícula</p>
        )}
        {pattern.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <RotateCcw size={10} /> Limpiar
          </button>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: DeviceSecurityPicker
// ────────────────────────────────────────────────────────────────
/**
 * DeviceSecurityPicker
 * Selector de método de desbloqueo del dispositivo.
 * Emite siempre: { metodo: string, valor: string|Array|null }
 *
 * @param {Object}   value    Estado actual: { metodo: 'pin', valor: '1234' }
 * @param {Function} onChange Callback con el nuevo objeto { metodo, valor }
 */
const DeviceSecurityPicker = ({ value = {}, onChange }) => {
  const metodo = value?.metodo || value?.tipo || 'ninguno';
  const [showSecret, setShowSecret] = useState(false);
  const [pattern, setPattern] = useState(
    Array.isArray(value?.valor) ? value.valor : Array.isArray(value?.patron) ? value.patron : []
  );

  // Mantiene el estado del PIN o Contraseña para el input
  const [inputVal, setInputVal] = useState(
    typeof value?.valor === 'string' ? value.valor : (typeof value?.valor === 'number' ? String(value.valor) : '')
  );

  // Sincronizar estado interno ante reseteos o cambios externos del prop value
  useEffect(() => {
    const rawVal = value?.valor ?? value?.patron;
    const currentMetodo = value?.metodo || value?.tipo || 'ninguno';

    if (currentMetodo === 'patron' && Array.isArray(rawVal)) {
      setPattern(rawVal);
      setInputVal('');
    } else if (currentMetodo === 'pin' || currentMetodo === 'contrasena') {
      setInputVal(typeof rawVal === 'string' ? rawVal : (typeof rawVal === 'number' ? String(rawVal) : ''));
      setPattern([]);
    } else {
      // ninguno
      setPattern([]);
      setInputVal('');
      setShowSecret(false);
    }
  }, [value?.metodo, value?.tipo, value?.valor, value?.patron]);

  const handleMetodoChange = (id) => {
    setPattern([]);
    setInputVal('');
    setShowSecret(false);
    if (id === 'ninguno') {
      onChange({ metodo: 'ninguno', tipo: 'ninguno', valor: null, patron: [] });
    } else {
      onChange({ metodo: id, tipo: id, valor: id === 'patron' ? [] : '', patron: [] });
    }
  };

  const handlePatternChange = (newPattern) => {
    setPattern(newPattern);
    onChange({ metodo: 'patron', tipo: 'patron', valor: newPattern, patron: newPattern });
  };

  const handlePinChange = (e) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    if (v.length <= 12) {
      setInputVal(v);
      onChange({ metodo: 'pin', tipo: 'pin', valor: v, patron: [] });
    }
  };

  const handlePasswordChange = (e) => {
    const v = e.target.value;
    if (v.length <= 64) {
      setInputVal(v);
      onChange({ metodo: 'contrasena', tipo: 'contrasena', valor: v, patron: [] });
    }
  };

  // Estilos visuales de chips alineados a la línea roja institucional
  const chipActive   = 'bg-red-50 dark:bg-red-950/30 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 shadow-2xs';
  const chipInactive = 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/40';

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5 w-full">

      {/* Cabecera */}
      <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
        <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          <ShieldCheck size={16} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-outfit">
            Método de Desbloqueo del Dispositivo
          </h4>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter mt-0.5">
            Registra el acceso para diagnóstico — se almacena de forma cifrada
          </p>
        </div>
      </div>

      {/* Selector de método — cuadrícula responsiva limpia en una sola fila */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2.5">
          Tipo de Bloqueo
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          {METODOS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleMetodoChange(id)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold
                          transition-all duration-150 cursor-pointer select-none border text-center
                          ${metodo === id ? chipActive : chipInactive}`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input condicional según el método seleccionado */}
      {metodo === 'pin' && (
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
            PIN Numérico
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputVal}
              onChange={handlePinChange}
              placeholder="Ingresa el PIN numérico..."
              maxLength={12}
              className="w-full px-3.5 py-2.5 pr-11 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:outline-none focus-visible:outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-500/20 font-mono tracking-widest transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer flex items-center justify-center rounded-lg"
              title={showSecret ? 'Ocultar' : 'Mostrar'}
            >
              <MorphIcon icon={showSecret ? EyeOff : Eye} size={18} spring="snappy" />
            </button>
          </div>
        </div>
      )}

      {metodo === 'contrasena' && (
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={inputVal}
              onChange={handlePasswordChange}
              placeholder="Ingresa la contraseña..."
              maxLength={64}
              className="w-full px-3.5 py-2.5 pr-11 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:outline-none focus-visible:outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-500/20 font-mono tracking-widest transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer flex items-center justify-center rounded-lg"
              title={showSecret ? 'Ocultar' : 'Mostrar'}
            >
              <MorphIcon icon={showSecret ? EyeOff : Eye} size={18} spring="snappy" />
            </button>
          </div>
        </div>
      )}

      {metodo === 'patron' && (
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
            Patrón Android
          </label>
          <PatternGrid pattern={pattern} onChange={handlePatternChange} />
        </div>
      )}

      {metodo === 'ninguno' && (
        <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 text-[12px] text-neutral-500 dark:text-neutral-400 font-inter">
          <Unlock size={14} className="shrink-0 text-neutral-400" />
          El dispositivo no tiene bloqueo de pantalla activo.
        </div>
      )}
    </div>
  );
};

export default DeviceSecurityPicker;