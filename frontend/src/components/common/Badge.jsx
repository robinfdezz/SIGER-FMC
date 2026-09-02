import React from 'react';

/**
 * Componente de insignia / chip reutilizable con punto indicador semántico o icono.
 * Replicado del estándar visual de estados y categorías de SIGER-FMC.
 *
 * @param {React.ReactNode} children - Texto o contenido de la insignia
 * @param {'success' | 'danger' | 'warning' | 'info' | 'neutral'} variant - Variante semántica
 * @param {'sm' | 'md'} size - Tamaño del badge
 * @param {boolean} showDot - Determina si se renderiza el punto indicador circular si no hay icono
 * @param {React.ComponentType|React.ReactElement} icon - Componente o elemento de icono Lucide
 * @param {string} className - Clases adicionales de Tailwind CSS
 */
const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  showDot = true,
  icon: Icon = null,
  className = '',
  ...props
}) => {
  // Variantes de color y bordes
  const variantStyles = {
    success:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
    danger:
      'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200/80 dark:border-red-800/60',
    warning:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
    info:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60',
    neutral:
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
  };

  // Color del punto indicador semántico
  const dotStyles = {
    success: 'bg-emerald-500',
    danger: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    neutral: 'bg-neutral-400'
  };

  // Tamaños de contenedor
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5'
  };

  // Tamaños de icono según tamaño de badge
  const iconSizes = {
    sm: 12,
    md: 13.5
  };

  const currentIconSize = iconSizes[size] || 13.5;

  // Renderizado del elemento gráfico inicial (icono o punto circular)
  const renderIndicator = () => {
    if (Icon) {
      if (React.isValidElement(Icon)) {
        return React.cloneElement(Icon, {
          size: Icon.props.size || currentIconSize,
          className: `shrink-0 ${Icon.props.className || ''}`
        });
      }
      return <Icon size={currentIconSize} className="shrink-0" />;
    }

    if (showDot) {
      return (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            dotStyles[variant] || dotStyles.neutral
          }`}
        />
      );
    }

    return null;
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg font-medium border select-none tracking-normal ${
        variantStyles[variant] || variantStyles.neutral
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {renderIndicator()}
      {children && <span>{children}</span>}
    </span>
  );
};

export default Badge;
