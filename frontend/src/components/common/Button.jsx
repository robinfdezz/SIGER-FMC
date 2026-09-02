import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Componente de botón reutilizable con estética corporativa (rounded-xl),
 * soporte para variantes de estilo, estados de carga e iconos.
 *
 * @param {React.ReactNode} children - Contenido o texto del botón
 * @param {Function} onClick - Manejador de evento clic
 * @param {string} type - Tipo de botón ('button' | 'submit' | 'reset')
 * @param {'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'} variant - Variante visual
 * @param {'sm' | 'md' | 'lg'} size - Tamaño del botón
 * @param {boolean} disabled - Deshabilita la interacción
 * @param {boolean} isLoading - Muestra el estado de carga con spinner integrado
 * @param {React.ComponentType|React.ReactElement} icon - Icono Lucide o nodo React
 * @param {'left' | 'right'} iconPosition - Posición del icono ('left' | 'right')
 * @param {string} className - Clases adicionales de Tailwind CSS
 */
const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  icon: Icon = null,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  // Variantes de estilo con estética de la marca SIGER-FMC
  const variantStyles = {
    primary:
      'bg-red-600 hover:bg-red-700 text-white shadow-xs hover:shadow-md border border-transparent font-medium',
    secondary:
      'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 shadow-2xs font-medium',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-xs hover:shadow-md border border-transparent font-medium',
    outline:
      'bg-transparent border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium',
    ghost:
      'bg-transparent text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent font-medium'
  };

  // Tamaños proporcionales con altura equilibrada
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm font-medium gap-2',
    lg: 'px-6 py-3 text-base font-medium gap-2.5'
  };

  // Tamaño del icono según el tamaño del botón
  const iconSizes = {
    sm: 14,
    md: 17,
    lg: 19
  };

  const isButtonDisabled = disabled || isLoading;
  const currentIconSize = iconSizes[size] || 17;

  // Renderizador seguro para icon prop (Componente vs Elemento JSX)
  const renderIcon = () => {
    if (isLoading) {
      return <Loader2 size={currentIconSize} className="animate-spin shrink-0" />;
    }

    if (!Icon) return null;

    if (React.isValidElement(Icon)) {
      return React.cloneElement(Icon, {
        size: Icon.props.size || currentIconSize,
        className: `shrink-0 ${Icon.props.className || ''}`
      });
    }

    return <Icon size={currentIconSize} className="shrink-0" />;
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isButtonDisabled}
      className={`inline-flex items-center justify-center rounded-xl transition-all cursor-pointer select-none font-inter disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {/* Icono a la izquierda o spinner de carga */}
      {(isLoading || (Icon && iconPosition === 'left')) && renderIcon()}

      {/* Contenido del botón */}
      {children && <span>{children}</span>}

      {/* Icono a la derecha (solo si no está en loading) */}
      {!isLoading && Icon && iconPosition === 'right' && renderIcon()}
    </button>
  );
};

export default Button;
