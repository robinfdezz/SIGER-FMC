import React, { useRef, useState, useEffect } from 'react';

/**
 * AnimatedTabs
 * Componente reutilizable de pestañas/selectores con pastilla deslizante animada.
 *
 * @param {Array} items - Lista de pestañas [{ id, label, icon, count, iconClassName }]
 * @param {string} value - ID del elemento actualmente activo
 * @param {Function} onChange - Función llamada al seleccionar una pestaña
 * @param {string} className - Clases CSS adicionales para el contenedor
 * @param {string} size - Tamaño: 'sm' (ej. para filtros/herramientas) | 'md' (por defecto)
 */
export const AnimatedTabs = ({
  items = [],
  value,
  onChange,
  className = '',
  size = 'md'
}) => {
  const containerRef = useRef(null);
  const tabsRef = useRef([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = items.findIndex((t) => t.id === value);
      const currentTab = tabsRef.current[activeIndex];
      if (currentTab) {
        setIndicatorStyle({
          left: currentTab.offsetLeft,
          width: currentTab.offsetWidth,
          opacity: 1
        });
      }
    };

    // Actualización inmediata
    updateIndicator();

    // Actualización en el siguiente frame por si hay fuentes cargando o layout shifts
    const rafId = requestAnimationFrame(updateIndicator);

    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [value, items]);

  const paddingClasses = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700/60 overflow-x-auto select-none ${className}`}
    >
      {/* Pastilla deslizante (indicador activo absoluto) */}
      <span
        className="absolute top-1 bottom-1 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200/60 dark:border-neutral-700 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity
        }}
      />

      {items.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = value === tab.id;

        return (
          <button
            key={tab.id}
            ref={(el) => (tabsRef.current[idx] = el)}
            type="button"
            onClick={() => onChange && onChange(tab.id)}
            className={`relative z-10 flex items-center justify-center gap-1.5 ${paddingClasses} font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap flex-1 sm:flex-none ${
              isActive
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {Icon && (
              React.isValidElement(Icon) ? (
                Icon
              ) : (
                <Icon size={iconSize} className={`shrink-0 ${tab.iconClassName || ''}`} />
              )
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count !== null && (
              <span className="font-bold text-neutral-900 dark:text-white ml-1.5">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AnimatedTabs;
