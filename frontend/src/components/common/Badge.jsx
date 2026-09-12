import React from 'react';

/**
 * Componente de insignia / chip reutilizable con punto indicador semántico o icono.
 * Soporta variantes visuales: 'pill' (predeterminado) y 'minimal'.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Texto o contenido de la insignia
 * @param {'pill' | 'minimal' | string} [props.variant='pill'] - Estilo visual del badge ('pill' o 'minimal'). También acepta variantes semánticas por retrocompatibilidad.
 * @param {'success' | 'danger' | 'warning' | 'info' | 'purple' | 'neutral' | string} [props.color] - Color semántico o clase personalizada
 * @param {'sm' | 'md'} [props.size='md'] - Tamaño del badge
 * @param {boolean} [props.showDot=true] - Determina si se renderiza el punto indicador circular si no hay icono en 'pill'
 * @param {boolean} [props.dot] - Alias para forzar visibilidad del punto indicador
 * @param {React.ComponentType|React.ReactElement} [props.icon] - Componente o elemento de icono Lucide
 * @param {string} [props.className=''] - Clases adicionales de Tailwind CSS
 */
const Badge = ({
  children,
  variant = 'pill',
  color = null,
  size = 'md',
  showDot = true,
  dot = null,
  icon: Icon = null,
  className = '',
  ...props
}) => {
  // Retrocompatibilidad: Si variant contiene un nombre de color semántico, se usa como color y variant pasa a ser 'pill'
  const isExplicitStyleVariant = variant === 'pill' || variant === 'minimal';
  const effectiveVariant = isExplicitStyleVariant ? variant : 'pill';
  const effectiveColor = color || (!isExplicitStyleVariant ? variant : 'neutral');

  // Variantes de color y bordes para estilo 'pill' (cápsula con fondo y borde)
  const pillColorStyles = {
    success:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
    green:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
    danger:
      'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200/80 dark:border-red-800/60',
    red:
      'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200/80 dark:border-red-800/60',
    warning:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60',
    purple:
      'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/60',
    info:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60',
    blue:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60',
    neutral:
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700',
    gray:
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
  };

  // Variantes de color para estilo 'minimal' (sin fondo, sin borde, solo texto e icono limpio)
  const minimalColorStyles = {
    success: 'text-emerald-600 dark:text-emerald-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-red-600/80 dark:text-red-400/80',
    red: 'text-red-600/80 dark:text-red-400/80',
    warning: 'text-amber-600/85 dark:text-amber-400/80',
    amber: 'text-amber-600/85 dark:text-amber-400/80',
    purple: 'text-purple-600/80 dark:text-purple-400/80',
    info: 'text-blue-600/80 dark:text-blue-400/80',
    blue: 'text-blue-600/80 dark:text-blue-400/80',
    neutral: 'text-neutral-600/80 dark:text-neutral-400/80',
    gray: 'text-neutral-600/80 dark:text-neutral-400/80'
  };

  // Color del punto indicador semántico
  const dotStyles = {
    success: 'bg-emerald-500',
    green: 'bg-emerald-500',
    emerald: 'bg-emerald-500',
    danger: 'bg-red-500',
    red: 'bg-red-500',
    warning: 'bg-amber-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    info: 'bg-blue-500',
    blue: 'bg-blue-500',
    neutral: 'bg-neutral-400',
    gray: 'bg-neutral-400'
  };

  // Tamaños de contenedor para pill
  const pillSizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5'
  };

  // Tamaños de contenedor para minimal
  const minimalSizeStyles = {
    sm: 'text-[11px] gap-1',
    md: 'text-xs gap-1.5'
  };

  // Tamaños de icono
  const iconSizes = {
    sm: 12,
    md: 13.5
  };

  const currentIconSize = iconSizes[size] || 13.5;

  // Determinar si se muestra el punto indicador
  const hasDot = dot !== null ? Boolean(dot) : (effectiveVariant === 'pill' ? showDot : false);

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

    if (hasDot) {
      return (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            dotStyles[effectiveColor] || dotStyles.neutral
          }`}
        />
      );
    }

    return null;
  };

  // Resolver clases de color
  const colorClass =
    typeof effectiveColor === 'string' && effectiveColor.includes('text-')
      ? effectiveColor
      : effectiveVariant === 'minimal'
      ? minimalColorStyles[effectiveColor] || minimalColorStyles.neutral
      : pillColorStyles[effectiveColor] || pillColorStyles.neutral;

  // Clases base según variante
  const baseClasses =
    effectiveVariant === 'minimal'
      ? `bg-transparent border-0 p-0 rounded-none ${minimalSizeStyles[size] || minimalSizeStyles.md}`
      : `rounded-lg border ${pillSizeStyles[size] || pillSizeStyles.md}`;

  return (
    <span
      className={`inline-flex items-center font-medium select-none tracking-normal ${baseClasses} ${colorClass} ${className}`}
      {...props}
    >
      {renderIndicator()}
      {children && <span>{children}</span>}
    </span>
  );
};

export default Badge;
