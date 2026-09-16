import React from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle, Minus, RotateCcw, CheckCheck } from 'lucide-react';
import SimpleButton from '../common/SimpleButton';
import Badge from '../common/Badge';

export const CHECKLIST_ITEMS = [
  { key: 'enciende',       label: 'Enciende' },
  { key: 'pantalla',       label: 'Pantalla / Imagen' },
  { key: 'tactil',         label: 'Táctil' },
  { key: 'puerto_carga',   label: 'Puerto de Carga' },
  { key: 'camara_frontal', label: 'Cámara Frontal' },
  { key: 'camara_trasera', label: 'Cámara Trasera' },
  { key: 'auricular',      label: 'Auricular / Altavoz' },
  { key: 'microfono',      label: 'Micrófono' },
  { key: 'botones',        label: 'Botones Físicos' },
  { key: 'sim_senal',      label: 'Lector SIM / Señal' },
  { key: 'golpes_tapa',    label: 'Golpes / Tapa Trasera' },
];

export const normalizeChecklistState = (val) => {
  if (val === 'ok' || val === true || val === 'funciona' || val === 'bueno') return 'ok';
  if (val === 'falla' || val === false || val === 'con_falla' || val === 'danado' || val === 'dañado' || val === 'malo') return 'falla';
  return 'sin_revisar';
};

const STATES = ['sin_revisar', 'ok', 'falla'];
const nextState = (current) => STATES[(STATES.indexOf(current) + 1) % STATES.length];

export const CHECKLIST_BADGE_CONFIG = {
  sin_revisar: {
    color: 'neutral',
    Icon: Minus
  },
  ok: {
    color: 'success',
    Icon: CheckCircle2
  },
  falla: {
    color: 'danger',
    Icon: AlertTriangle
  }
};

/**
 * DeviceChecklistPicker
 * Componente principal y centralizado de checklist de hardware con insignias Badge.
 * Soporta modo interactivo (Nueva Orden) y modo solo lectura (Ficha Técnica y Consulta Pública).
 */
export const DeviceChecklistPicker = ({
  value = {},
  onChange,
  readOnly = false,
  centered = false,
  badgeVariant = 'pill',
  showCard = true,
  showHeader = true,
  showSummary = true,
  className = ''
}) => {
  const checklistData = (typeof value === 'object' && value !== null) ? value : {};
  const getState = (key) => normalizeChecklistState(checklistData[key]);

  const handleToggle = (key) => {
    if (readOnly || !onChange) return;
    const next = nextState(getState(key));
    onChange({ ...checklistData, [key]: next });
  };

  const handleMarkAll = () => {
    if (readOnly || !onChange) return;
    const allOk = {};
    CHECKLIST_ITEMS.forEach(({ key }) => { allOk[key] = 'ok'; });
    onChange(allOk);
  };

  const handleReset = () => {
    if (readOnly || !onChange) return;
    const reset = {};
    CHECKLIST_ITEMS.forEach(({ key }) => { reset[key] = 'sin_revisar'; });
    onChange(reset);
  };

  const countOk         = CHECKLIST_ITEMS.filter(({ key }) => getState(key) === 'ok').length;
  const countFalla      = CHECKLIST_ITEMS.filter(({ key }) => getState(key) === 'falla').length;
  const countPendientes = CHECKLIST_ITEMS.filter(({ key }) => getState(key) === 'sin_revisar').length;

  const content = (
    <div className={`space-y-4 ${className}`}>
      {/* Cabecera opcional */}
      {showHeader && (
        <div className="flex items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
          <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            <ClipboardList size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-outfit">
              Checklist de Recepción / Estado Inicial
            </h4>
            {!readOnly && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter mt-0.5">
                Toca cada componente para cambiar su estado
              </p>
            )}
          </div>
        </div>
      )}

      {/* Grid / Flex de chips con componente Badge */}
      <div className={`flex flex-wrap gap-2 ${centered ? 'justify-center' : 'justify-start'}`}>
        {CHECKLIST_ITEMS.map(({ key, label }) => {
          const estado = getState(key);
          const { color, Icon } = CHECKLIST_BADGE_CONFIG[estado] || CHECKLIST_BADGE_CONFIG.sin_revisar;

          if (readOnly) {
            return (
              <Badge
                key={key}
                variant={badgeVariant}
                color={color}
                icon={Icon}
                size="md"
                className={`font-semibold select-none transition-colors ${
                  badgeVariant === 'minimal'
                    ? 'px-2.5 py-1'
                    : 'py-1.5 px-3 rounded-xl border shadow-2xs'
                }`}
              >
                {label}
              </Badge>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleToggle(key)}
              className="cursor-pointer focus:outline-hidden"
            >
              <Badge
                variant="pill"
                color={color}
                icon={Icon}
                size="md"
                className="font-semibold select-none py-1.5 px-3 rounded-xl border transition-colors shadow-2xs"
              >
                {label}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Resumen de contadores */}
      {showSummary && (
        <div
          className={`flex flex-wrap items-center ${
            centered ? 'justify-center' : 'justify-between'
          } gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs font-inter text-neutral-500 dark:text-neutral-400`}
        >
          <div className={`flex flex-wrap items-center ${centered ? 'justify-center' : ''} gap-4`}>
            <span className="flex items-center gap-1.5">
              <Minus size={12} className="text-neutral-400 shrink-0" />
              <span>Sin revisar:</span> <b className="font-bold text-neutral-800 dark:text-neutral-200">{countPendientes}</b>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={12} className="shrink-0" />
              <span>OK:</span> <b className="font-bold">{countOk}</b>
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={12} className="shrink-0" />
              <span>Con Falla:</span> <b className="font-bold">{countFalla}</b>
            </span>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-3">
              <SimpleButton
                onClick={handleMarkAll}
                icon={CheckCheck}
                variant="success"
                title="Marcar todos los componentes como OK"
              >
                Marcar todos
              </SimpleButton>

              <span className="text-neutral-300 dark:text-neutral-700 select-none">|</span>

              <SimpleButton
                onClick={handleReset}
                icon={RotateCcw}
                title="Reiniciar todos los componentes a sin revisar"
              >
                Limpiar
              </SimpleButton>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
      {content}
    </div>
  );
};

export default DeviceChecklistPicker;