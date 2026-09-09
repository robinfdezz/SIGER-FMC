import React from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle, Minus, RotateCcw } from 'lucide-react';

const CHECKLIST_ITEMS = [
  { key: 'enciende',       label: 'Enciende' },
  { key: 'pantalla',       label: 'Pantalla / Imagen' },
  { key: 'tactil',         label: 'Tactil' },
  { key: 'puerto_carga',   label: 'Puerto de Carga' },
  { key: 'camara_frontal', label: 'Camara Frontal' },
  { key: 'camara_trasera', label: 'Camara Trasera' },
  { key: 'auricular',      label: 'Auricular / Altavoz' },
  { key: 'microfono',      label: 'Microfono' },
  { key: 'botones',        label: 'Botones Fisicos' },
  { key: 'sim_senal',      label: 'Lector SIM / Senal' },
  { key: 'golpes_tapa',    label: 'Golpes / Tapa Trasera' },
];

const STATES = ['sin_revisar', 'ok', 'falla'];
const nextState = (current) => STATES[(STATES.indexOf(current) + 1) % STATES.length];

const stateStyles = {
  sin_revisar: {
    chip: 'bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/40',
    Icon: Minus,
  },
  ok: {
    chip: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 shadow-2xs',
    Icon: CheckCircle2,
  },
  falla: {
    chip: 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-600 text-rose-700 dark:text-rose-300 shadow-2xs',
    Icon: AlertTriangle,
  },
};

/**
 * DeviceChecklistPicker
 * Selector visual de estado del hardware del dispositivo al momento de la recepcion.
 * Cada chip alterna entre: "Sin revisar" -> "OK" -> "Con Falla" -> ...
 * @param {Object}   value    Estado actual: { enciende: 'ok', pantalla: 'falla', ... }
 * @param {Function} onChange Callback con el nuevo objeto completo de checklist
 */
const DeviceChecklistPicker = ({ value = {}, onChange }) => {
  const getState = (key) => value[key] || 'sin_revisar';

  const handleToggle = (key) => {
    const next = nextState(getState(key));
    onChange({ ...value, [key]: next });
  };

  const handleReset = () => {
    const reset = {};
    CHECKLIST_ITEMS.forEach(({ key }) => { reset[key] = 'sin_revisar'; });
    onChange(reset);
  };

  const countOk         = CHECKLIST_ITEMS.filter(({ key }) => getState(key) === 'ok').length;
  const countFalla      = CHECKLIST_ITEMS.filter(({ key }) => getState(key) === 'falla').length;
  const countPendientes = CHECKLIST_ITEMS.filter(({ key }) => getState(key) === 'sin_revisar').length;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">

      {/* Cabecera limpia */}
      <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
        <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          <ClipboardList size={16} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-outfit">
            Checklist de Recepción / Estado Inicial
          </h4>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter mt-0.5">
            Toca cada componente para cambiar su estado
          </p>
        </div>
      </div>

      {/* Grid de chips */}
      <div className="flex flex-wrap gap-2">
        {CHECKLIST_ITEMS.map(({ key, label }) => {
          const estado  = getState(key);
          const { chip, Icon } = stateStyles[estado];
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleToggle(key)}
              className={`flex items-center gap-1.5 rounded-xl py-2 px-3.5 text-xs font-semibold transition-all duration-150 cursor-pointer select-none border ${chip}`}
            >
              <Icon size={11} className="shrink-0" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Pie del Checklist: Leyenda con contadores a la izquierda y Limpiar a la derecha */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs font-inter">
        <div className="flex flex-wrap items-center gap-4 text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Minus size={12} className="text-neutral-400" />
            Sin revisar: <b className="font-bold text-neutral-800 dark:text-neutral-200">{countPendientes}</b>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={12} />
            OK: <b className="font-bold">{countOk}</b>
          </span>
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={12} />
            Con Falla: <b className="font-bold">{countFalla}</b>
          </span>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:underline transition-colors cursor-pointer"
          title="Reiniciar todos los componentes a sin revisar"
        >
          <RotateCcw size={12} />
          <span>Limpiar</span>
        </button>
      </div>
    </div>
  );
};

export default DeviceChecklistPicker;