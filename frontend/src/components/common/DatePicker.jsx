import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MESES_ABR = [
  'ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.',
  'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'
];

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

/**
 * Obtiene la fecha actual en formato local YYYY-MM-DD sin desfase UTC
 */
const getTodayString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Formatea una fecha YYYY-MM-DD a formato legible en español
 * Ejemplo: "2026-09-24" -> "24 sep. 2026"
 */
const formatDisplayDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  return `${d} ${MESES_ABR[m - 1] || ''} ${y}`;
};

/**
 * DatePicker
 * Selector de fecha moderno y accesible estilo shadcn/ui (Popover flotante + Calendario).
 * Maneja fechas estrictamente como cadenas civiles "YYYY-MM-DD" para evitar el bug off-by-one UTC.
 *
 * @param {Object} props
 * @param {string} [props.value] - Fecha en formato "YYYY-MM-DD"
 * @param {Function} props.onChange - Callback `(dateStr: string) => void`
 * @param {string} [props.placeholder="Seleccionar fecha..."]
 * @param {string} [props.label]
 * @param {boolean} [props.isRequired=false]
 * @param {string} [props.error]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className=""]
 * @param {string} [props.buttonClassName=""]
 * @param {string} [props.minDate] - Fecha mínima seleccionable "YYYY-MM-DD"
 * @param {'left'|'right'} [props.align="left"] - Alineación del popover
 */
export const DatePicker = ({
  value = '',
  onChange,
  placeholder = 'Seleccionar fecha...',
  label,
  isRequired = false,
  error,
  disabled = false,
  className = '',
  buttonClassName = '',
  minDate,
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Determinar mes y año a visualizar
  const initialDate = value ? value.split('-').map(Number) : null;
  const now = new Date();
  const [viewYear, setViewYear] = useState(initialDate ? initialDate[0] : now.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate ? initialDate[1] - 1 : now.getMonth());

  const todayStr = getTodayString();

  // Si cambia el valor exteriormente, sincronizar la vista del calendario
  useEffect(() => {
    if (value && typeof value === 'string') {
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  // Manejo de cierre por clic exterior o tecla Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const selectedDateStr = `${viewYear}-${monthStr}-${dayStr}`;

    if (minDate && selectedDateStr < minDate) return;

    if (onChange) {
      onChange(selectedDateStr);
    }
    setIsOpen(false);
  };

  const handleSelectToday = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange(todayStr);
    }
    const [y, m] = todayStr.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange('');
    }
  };

  // Cálculos para la cuadrícula del mes
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Domingo, 1 = Lunes...
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Días previos para rellenar la primera semana
  const prevDays = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevDays.push(daysInPrevMonth - i);
  }

  // Días del mes actual
  const currentDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    currentDays.push(d);
  }

  // Días siguientes para completar la última semana
  const totalSlots = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const nextDaysCount = totalSlots - (prevDays.length + currentDays.length);
  const nextDays = [];
  for (let d = 1; d <= nextDaysCount; d++) {
    nextDays.push(d);
  }

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Label opcional */}
      {label && (
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5 font-outfit">
          {label} {isRequired && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      {/* Botón Disparador (Trigger tipo input) */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl border transition-colors cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none ${
          disabled
            ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 opacity-60 cursor-not-allowed'
            : isOpen
            ? 'border-red-500 dark:border-red-500 bg-white dark:bg-neutral-900 ring-2 ring-red-500/20'
            : error
            ? 'border-red-500 bg-neutral-50 dark:bg-neutral-800/60'
            : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar
            size={16}
            className={`shrink-0 transition-colors ${
              value
                ? 'text-red-600 dark:text-red-400'
                : 'text-neutral-400 dark:text-neutral-500'
            }`}
          />
          <span
            className={`truncate font-inter ${
              value
                ? 'text-neutral-900 dark:text-neutral-100 font-medium'
                : 'text-neutral-400 dark:text-neutral-500'
            }`}
          >
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        {/* Acciones del trigger */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer"
              title="Borrar fecha"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="text-[11px] text-red-500 mt-1 font-inter">{error}</p>
      )}

      {/* Popover Flotante de Calendario */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xl w-[280px] sm:w-[304px] select-none animate-fade-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Cabecera del Calendario */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800/80">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 font-outfit uppercase tracking-wider">
              {MESES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 text-center mb-1">
            {DIAS_SEMANA.map((d, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider py-1 font-inter"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Cuadrícula de días */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Días del mes anterior (apagados) */}
            {prevDays.map((day, idx) => (
              <div
                key={`prev-${idx}`}
                className="h-8 flex items-center justify-center text-xs text-neutral-300 dark:text-neutral-600 font-inter pointer-events-none select-none"
              >
                {day}
              </div>
            ))}

            {/* Días del mes actual */}
            {currentDays.map((day) => {
              const monthStr = String(viewMonth + 1).padStart(2, '0');
              const dayStr = String(day).padStart(2, '0');
              const cellDateStr = `${viewYear}-${monthStr}-${dayStr}`;

              const isSelected = value === cellDateStr;
              const isToday = todayStr === cellDateStr;
              const isDisabled = minDate && cellDateStr < minDate;

              return (
                <button
                  key={`curr-${day}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-xl transition-all cursor-pointer select-none font-inter ${
                    isSelected
                      ? 'bg-red-600 text-white font-semibold shadow-xs'
                      : isToday
                      ? 'border border-red-500/60 dark:border-red-500 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30'
                      : isDisabled
                      ? 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {day}
                </button>
              );
            })}

            {/* Días del mes siguiente (apagados) */}
            {nextDays.map((day, idx) => (
              <div
                key={`next-${idx}`}
                className="h-8 flex items-center justify-center text-xs text-neutral-300 dark:text-neutral-600 font-inter pointer-events-none select-none"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Pie del Popover */}
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs font-inter">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-red-600 dark:text-red-400 font-medium hover:underline transition-colors cursor-pointer"
            >
              Hoy
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
