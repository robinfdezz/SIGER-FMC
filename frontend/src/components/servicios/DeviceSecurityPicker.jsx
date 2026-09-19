import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, RotateCcw, Lock, Hash, Type, Unlock } from 'lucide-react';
import { Eye, EyeOff } from 'lucide';
import { MorphIcon } from 'morphicons/react';
import { normalizePattern } from '../common/PatternLock';
import Select from '../common/Select';

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
// SUB-COMPONENTE: Cuadrícula de Patrón Android 3x3 (Nodos 1 a 9 estándar)
//  1  2  3  (fila 0: col 0, 1, 2)
//  4  5  6  (fila 1: col 0, 1, 2)
//  7  8  9  (fila 2: col 0, 1, 2)
// ────────────────────────────────────────────────────────────────
const GRID_SIZE = 240;
const NODE_R    = 18;
const NODES_1_TO_9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const nodeCenter = (id) => {
  const step = GRID_SIZE / 3;
  const offset = step / 2;
  const col = (id - 1) % 3;
  const row = Math.floor((id - 1) / 3);
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
    for (const id of NODES_1_TO_9) {
      const c = nodeCenter(id);
      const dist = Math.hypot(x - c.x, y - c.y);
      if (dist <= NODE_R * 1.4) return id;
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
    const a = nodeCenter(pattern[i]);
    const b = nodeCenter(pattern[i + 1]);
    lines.push(<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />);
  }

  // Línea hacia la posición actual del puntero
  if (livePos && pattern.length > 0) {
    const last = pattern[pattern.length - 1];
    const lp = nodeCenter(last);
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
        {NODES_1_TO_9.map((id) => {
          const { x, y } = nodeCenter(id);
          const active   = isActive(id);
          const order    = active ? activeOrder(id) : null;
          return (
            <g key={id}>
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

const TIPOS_CUENTA = [
  { id: 'Cuenta Google', label: 'Cuenta Google', value: 'Cuenta Google' },
  { id: 'Apple ID / iCloud', label: 'Apple ID / iCloud', value: 'Apple ID / iCloud' },
  { id: 'Cuenta Samsung', label: 'Cuenta Samsung', value: 'Cuenta Samsung' },
  { id: 'Cuenta Xiaomi / Mi', label: 'Cuenta Xiaomi / Mi', value: 'Cuenta Xiaomi / Mi' },
  { id: 'Contraseña de Usuario / BIOS', label: 'Contraseña de Usuario / BIOS', value: 'Contraseña de Usuario / BIOS' },
  { id: 'Otro', label: 'Otro', value: 'Otro' },
];

// ────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: DeviceSecurityPicker
// ────────────────────────────────────────────────────────────────
/**
 * DeviceSecurityPicker
 * Selector de método de desbloqueo del dispositivo y credenciales vinculadas opcionales.
 * Emite siempre: { metodo, tipo, valor, patron, requiere_cuenta, cuenta_adicional, ... }
 *
 * @param {Object}   value    Estado actual
 * @param {Function} onChange Callback con el nuevo objeto de seguridad
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

  // Estado para Cuentas y Credenciales Adicionales
  const [requiereCuenta, setRequiereCuenta] = useState(
    Boolean(value?.requiere_cuenta || value?.cuenta_adicional)
  );
  const [tipoCuenta, setTipoCuenta] = useState(
    value?.cuenta_adicional?.tipo_cuenta || value?.tipo_cuenta || 'Cuenta Google'
  );
  const [usuarioCuenta, setUsuarioCuenta] = useState(
    value?.cuenta_adicional?.usuario || value?.usuario_cuenta || ''
  );
  const [passwordCuenta, setPasswordCuenta] = useState(
    value?.cuenta_adicional?.password || value?.cuenta_adicional?.clave || value?.clave_cuenta || ''
  );
  const [notasCuenta, setNotasCuenta] = useState(
    value?.cuenta_adicional?.observaciones || value?.cuenta_adicional?.notas || value?.observaciones_cuenta || ''
  );
  const [showAccountSecret, setShowAccountSecret] = useState(false);

  // Sincronizar estado interno ante reseteos o cambios externos del prop value
  useEffect(() => {
    const rawVal = value?.valor ?? value?.patron;
    const currentMetodo = value?.metodo || value?.tipo || 'ninguno';

    if (currentMetodo === 'patron') {
      const normalized = normalizePattern(value);
      setPattern(normalized.nodes);
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

    const hasCuenta = Boolean(value?.requiere_cuenta || value?.cuenta_adicional);
    setRequiereCuenta(hasCuenta);
    if (hasCuenta && value?.cuenta_adicional) {
      setTipoCuenta(value.cuenta_adicional.tipo_cuenta || value.tipo_cuenta || 'Cuenta Google');
      setUsuarioCuenta(value.cuenta_adicional.usuario || value.usuario_cuenta || '');
      setPasswordCuenta(value.cuenta_adicional.password || value.cuenta_adicional.clave || value.clave_cuenta || '');
      setNotasCuenta(value.cuenta_adicional.observaciones || value.cuenta_adicional.notas || value.observaciones_cuenta || '');
    } else if (!hasCuenta) {
      setUsuarioCuenta('');
      setPasswordCuenta('');
      setNotasCuenta('');
      setShowAccountSecret(false);
    }
  }, [
    value?.metodo,
    value?.tipo,
    value?.valor,
    value?.patron,
    value?.base,
    value?.requiere_cuenta,
    value?.cuenta_adicional?.tipo_cuenta,
    value?.cuenta_adicional?.usuario,
    value?.cuenta_adicional?.password,
    value?.cuenta_adicional?.observaciones
  ]);

  const buildResult = (updatedMetodoProps = {}, updatedCuentaProps = {}) => {
    const isCuentaActive = updatedCuentaProps.requiereCuenta !== undefined
      ? updatedCuentaProps.requiereCuenta
      : requiereCuenta;

    const currentTipo = updatedCuentaProps.tipoCuenta !== undefined
      ? updatedCuentaProps.tipoCuenta
      : tipoCuenta;

    const currentUsuario = updatedCuentaProps.usuarioCuenta !== undefined
      ? updatedCuentaProps.usuarioCuenta
      : usuarioCuenta;

    const currentPassword = updatedCuentaProps.passwordCuenta !== undefined
      ? updatedCuentaProps.passwordCuenta
      : passwordCuenta;

    const currentNotas = updatedCuentaProps.notasCuenta !== undefined
      ? updatedCuentaProps.notasCuenta
      : notasCuenta;

    const cuentaData = isCuentaActive ? {
      tipo_cuenta: currentTipo || 'Cuenta Google',
      usuario: currentUsuario ? currentUsuario.trim() : null,
      password: currentPassword || null,
      observaciones: currentNotas ? currentNotas.trim() : null,
    } : null;

    return {
      ...value,
      ...updatedMetodoProps,
      requiere_cuenta: isCuentaActive,
      cuenta_adicional: cuentaData,
      tipo_cuenta: isCuentaActive ? (currentTipo || 'Cuenta Google') : null,
      usuario_cuenta: isCuentaActive ? (currentUsuario ? currentUsuario.trim() : null) : null,
      clave_cuenta: isCuentaActive ? (currentPassword || null) : null,
      observaciones_cuenta: isCuentaActive ? (currentNotas ? currentNotas.trim() : null) : null
    };
  };

  const handleMetodoChange = (id) => {
    setPattern([]);
    setInputVal('');
    setShowSecret(false);
    let updated;
    if (id === 'ninguno') {
      updated = { metodo: 'ninguno', tipo: 'ninguno', valor: null, patron: [] };
    } else {
      updated = { metodo: id, tipo: id, valor: id === 'patron' ? [] : '', patron: [], base: id === 'patron' ? 1 : undefined };
    }
    onChange?.(buildResult(updated));
  };

  const handlePatternChange = (newPattern) => {
    setPattern(newPattern);
    const textSequence = newPattern.join('-');
    const updated = {
      metodo: 'patron',
      tipo: 'patron',
      valor: textSequence,
      patron: newPattern,
      base: 1
    };
    onChange?.(buildResult(updated));
  };

  const handlePinChange = (e) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    if (v.length <= 12) {
      setInputVal(v);
      onChange?.(buildResult({ metodo: 'pin', tipo: 'pin', valor: v, patron: [] }));
    }
  };

  const handlePasswordChange = (e) => {
    const v = e.target.value;
    if (v.length <= 64) {
      setInputVal(v);
      onChange?.(buildResult({ metodo: 'contrasena', tipo: 'contrasena', valor: v, patron: [] }));
    }
  };

  const handleToggleRequiereCuenta = (newChecked) => {
    setRequiereCuenta(newChecked);
    if (!newChecked) {
      setShowAccountSecret(false);
    }
    onChange?.(buildResult({}, { requiereCuenta: newChecked }));
  };

  const handleTipoCuentaChange = (newTipo) => {
    setTipoCuenta(newTipo);
    onChange?.(buildResult({}, { tipoCuenta: newTipo }));
  };

  const handleUsuarioChange = (e) => {
    const val = e.target.value;
    setUsuarioCuenta(val);
    onChange?.(buildResult({}, { usuarioCuenta: val }));
  };

  const handlePasswordCuentaChange = (e) => {
    const val = e.target.value;
    setPasswordCuenta(val);
    onChange?.(buildResult({}, { passwordCuenta: val }));
  };

  const handleNotasChange = (e) => {
    const val = e.target.value;
    setNotasCuenta(val);
    onChange?.(buildResult({}, { notasCuenta: val }));
  };

  // Estilos visuales de chips alineados a la línea roja institucional
  const chipActive   = 'bg-red-50 dark:bg-red-950/30 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 shadow-2xs';
  const chipInactive = 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/40';

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5 w-full">

      {/* Cabecera Principal */}
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
        <div className="space-y-2 pt-1 animate-in fade-in duration-150">
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
              title={showSecret ? 'Ocultar PIN' : 'Mostrar PIN'}
            >
              <MorphIcon icon={showSecret ? EyeOff : Eye} size={18} spring="snappy" />
            </button>
          </div>
        </div>
      )}

      {metodo === 'contrasena' && (
        <div className="space-y-2 pt-1 animate-in fade-in duration-150">
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
              title={showSecret ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <MorphIcon icon={showSecret ? EyeOff : Eye} size={18} spring="snappy" />
            </button>
          </div>
        </div>
      )}

      {metodo === 'patron' && (
        <div className="space-y-2 pt-1 animate-in fade-in duration-150">
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

      {/* ────────────────────────────────────────────────────────── */}
      {/* SECCIÓN SECUNDARIA: Cuentas y Credenciales Adicionales    */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleToggleRequiereCuenta(!requiereCuenta)}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              handleToggleRequiereCuenta(!requiereCuenta);
            }
          }}
          className="flex items-center gap-3.5 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 transition-colors cursor-pointer select-none group hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60"
        >
          {/* Switch interactivo a la izquierda */}
          <div className="relative inline-flex items-center shrink-0">
            <input
              type="checkbox"
              checked={requiereCuenta}
              onChange={(e) => handleToggleRequiereCuenta(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-red-600"></div>
          </div>

          {/* Título y Subtítulo */}
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-outfit">
              Cuentas y Credenciales Adicionales
            </h5>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter mt-0.5 leading-snug">
              ¿El servicio requiere acceso a cuentas vinculadas (Google, Apple ID, etc.)?
            </p>
          </div>
        </div>

        {/* Formulario al activarse el switch */}
        {requiereCuenta && (
          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selector de Tipo de Cuenta */}
              <div>
                <Select
                  label="Tipo de Cuenta"
                  placeholder="Seleccionar tipo de cuenta..."
                  items={TIPOS_CUENTA}
                  value={tipoCuenta}
                  onChange={handleTipoCuentaChange}
                />
              </div>

              {/* Correo / Usuario */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Correo / Usuario
                </label>
                <input
                  type="text"
                  value={usuarioCuenta}
                  onChange={handleUsuarioChange}
                  placeholder="ejemplo@correo.com o nombre de usuario"
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-inter transition-colors"
                />
              </div>

              {/* Contraseña / Clave con alternancia de visibilidad */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Contraseña / Clave
                </label>
                <div className="relative">
                  <input
                    type={showAccountSecret ? 'text' : 'password'}
                    value={passwordCuenta}
                    onChange={handlePasswordCuentaChange}
                    placeholder="Contraseña o clave de la cuenta..."
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 pr-11 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccountSecret(!showAccountSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer flex items-center justify-center rounded-lg"
                    title={showAccountSecret ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    <MorphIcon icon={showAccountSecret ? EyeOff : Eye} size={18} spring="snappy" />
                  </button>
                </div>
              </div>

              {/* Notas de acceso / Observaciones de seguridad (ancho completo) */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Notas de Acceso / Observaciones de Seguridad
                </label>
                <textarea
                  rows={2}
                  value={notasCuenta}
                  onChange={handleNotasChange}
                  placeholder="Ej. Requiere código 2FA enviado por SMS, patrón en arranque BIOS, etc."
                  maxLength={250}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-inter transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceSecurityPicker;