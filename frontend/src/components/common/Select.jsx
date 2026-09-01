import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, HelpCircle } from 'lucide-react';

/**
 * Componente Select modular y accesible inspirado en el sistema de diseño Untitled UI.
 * Soporta etiquetas, hint, tooltips, avatars, iconos, supporting text y modo claro/oscuro.
 *
 * @param {Object} props
 * @param {string|React.ReactNode} [props.label] - Etiqueta superior del campo
 * @param {string|React.ReactNode} [props.hint] - Texto de ayuda o soporte inferior
 * @param {string|React.ReactNode} [props.tooltip] - Texto informativo para tooltip
 * @param {boolean} [props.isRequired] - Indica si el campo es obligatorio (muestra asterisco rojo)
 * @param {string} [props.placeholder] - Texto por defecto cuando no hay selección
 * @param {Array<{id: string|number, label: string, supportingText?: string, avatarUrl?: string, icon?: React.ComponentType|React.ReactNode, disabled?: boolean}>} [props.items] - Lista de opciones
 * @param {string|number} [props.value] - ID/valor de la opción seleccionada
 * @param {Function} props.onChange - Callback al seleccionar una opción: (value, event) => void
 * @param {boolean} [props.disabled] - Deshabilita el selector
 * @param {string} [props.name] - Nombre del campo para formularios
 * @param {string} [props.error] - Mensaje de error para validación visual
 * @param {string} [props.className] - Clases CSS adicionales para el contenedor principal
 * @param {string} [props.buttonClassName] - Clases CSS adicionales para el botón disparador
 * @param {string} [props.menuClassName] - Clases CSS adicionales para el dropdown menú
 */
export const Select = ({
  label,
  hint,
  tooltip,
  isRequired = false,
  placeholder = 'Seleccionar opción...',
  items = [],
  value,
  onChange,
  disabled = false,
  name,
  error,
  className = '',
  buttonClassName = '',
  menuClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef(null);
  const selectId = useId();

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
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

  // Encontrar el elemento actualmente seleccionado
  const selectedItem = items.find(
    (item) => String(item.id ?? item.value) === String(value)
  );

  const handleSelect = (item) => {
    if (item.disabled || disabled) return;
    const itemId = item.id ?? item.value;
    setIsOpen(false);
    if (onChange) {
      const syntheticEvent = { target: { name: name || '', value: itemId } };
      onChange(itemId, syntheticEvent);
    }
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className={`relative w-full text-left font-sans ${className}`} ref={containerRef}>
      {/* Label superior con tooltip y requisito */}
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={selectId}
              onClick={toggleDropdown}
              className={`block text-xs font-medium font-inter cursor-pointer transition-colors ${
                disabled
                  ? 'text-neutral-400 dark:text-neutral-500'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>

            {tooltip && (
              <div
                className="relative inline-flex items-center"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <HelpCircle
                  size={14}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-help transition-colors"
                />
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-neutral-900 dark:bg-neutral-800 text-white text-[11px] rounded-lg shadow-lg whitespace-nowrap z-50 animate-in fade-in duration-150">
                    {tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-800" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botón Disparador del Select */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm transition-all duration-150 text-left outline-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500'
            : error
            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 ring-1 ring-red-500/20'
            : isOpen
            ? 'border-red-500 ring-2 ring-red-500/20 dark:border-red-500 bg-white dark:bg-neutral-900'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-900 dark:text-neutral-100'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedItem ? (
            <>
              {/* Avatar si existe */}
              {selectedItem.avatarUrl && (
                <img
                  src={selectedItem.avatarUrl}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              )}

              {/* Icono si existe */}
              {selectedItem.icon && (
                <span className="shrink-0 text-neutral-500 dark:text-neutral-400">
                  {typeof selectedItem.icon === 'function' ? (
                    <selectedItem.icon size={16} />
                  ) : (
                    selectedItem.icon
                  )}
                </span>
              )}

              {/* Texto Principal */}
              <span className="truncate font-normal text-neutral-900 dark:text-neutral-100">
                {selectedItem.label || selectedItem.name || selectedItem.text}
              </span>
            </>
          ) : (
            <span className="truncate text-neutral-400 dark:text-neutral-500">
              {placeholder}
            </span>
          )}
        </div>

        {/* Flecha Chevron rotativa */}
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 text-neutral-400 dark:text-neutral-500 ${
            isOpen ? 'rotate-180 text-red-500 dark:text-red-400' : ''
          }`}
        />
      </button>

      {/* Menú Dropdown Flotante */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#18181B] border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto py-1.5 animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
        >
          {items.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-neutral-400 dark:text-neutral-500 text-center font-inter">
              No hay opciones disponibles
            </div>
          ) : (
            items.map((item) => {
              const itemId = item.id ?? item.value;
              const isSelected = String(itemId) === String(value);
              const isItemDisabled = item.disabled;

              return (
                <div
                  key={String(itemId)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isItemDisabled}
                  onClick={() => handleSelect(item)}
                  className={`flex items-center justify-between gap-2.5 px-3.5 py-2 text-sm cursor-pointer transition-colors ${
                    isItemDisabled
                      ? 'opacity-40 cursor-not-allowed bg-transparent text-neutral-400'
                      : isSelected
                      ? 'bg-red-50/70 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-medium'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Avatar de la opción */}
                    {item.avatarUrl && (
                      <img
                        src={item.avatarUrl}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                    )}

                    {/* Icono de la opción */}
                    {item.icon && (
                      <span
                        className={`shrink-0 ${
                          isSelected
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-neutral-400 dark:text-neutral-500'
                        }`}
                      >
                        {typeof item.icon === 'function' ? (
                          <item.icon size={16} />
                        ) : (
                          item.icon
                        )}
                      </span>
                    )}

                    {/* Contenido textual: Label + Supporting Text */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate">
                        {item.label || item.name || item.text}
                      </span>
                      {(item.supportingText || item.description) && (
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate font-normal">
                          {item.supportingText || item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Checkmark de Selección Activa */}
                  {isSelected && (
                    <Check size={16} className="text-red-600 dark:text-red-400 shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Mensaje de Error */}
      {error && (
        <p className="text-[11px] text-red-500 mt-1 font-inter">{error}</p>
      )}

      {/* Hint o texto de ayuda inferior si no hay error */}
      {!error && hint && (
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 font-inter">
          {hint}
        </p>
      )}
    </div>
  );
};

export default Select;
