import React from 'react';

/**
 * SimpleButton - Botón interactivo ligero para acciones en línea o secundarias.
 * Mantiene el texto con color normal neutral y aplica los acentos de color exclusivamente al icono.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.children] - Contenido o texto del botón
 * @param {React.ElementType} [props.icon] - Componente de icono (Lucide o similar)
 * @param {string} [props.iconClassName=''] - Clases opcionales para personalizar el icono
 * @param {Function} [props.onClick] - Manejador de evento click
 * @param {boolean} [props.disabled=false] - Si está deshabilitado
 * @param {'default' | 'ghost' | 'success' | 'danger'} [props.variant='default'] - Variante visual (colorea el icono)
 * @param {'sm' | 'xs'} [props.size='sm'] - Tamaño del botón
 * @param {string} [props.type='button'] - Tipo de botón HTML
 * @param {string} [props.className=''] - Clases adicionales de Tailwind
 * @param {string} [props.title] - Descripción accesible (usada en aria-label)
 * @param {boolean} [props.showNativeTitle=false] - Si es true, activa el tooltip flotante nativo del navegador
 */
export const SimpleButton = ({
  children,
  icon: Icon,
  iconClassName = '',
  onClick,
  disabled = false,
  variant = 'default',
  size = 'sm',
  type = 'button',
  className = '',
  title,
  showNativeTitle = false,
  ...rest
}) => {
  // El texto siempre maneja el color neutral estándar de las acciones en línea
  const baseStyles =
    'inline-flex items-center font-medium font-inter text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer select-none hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline';

  const sizeStyles = {
    xs: 'text-[11px] gap-1',
    sm: 'text-xs gap-1.5'
  };

  // La variante define el color del icono, manteniendo el texto normal
  const iconVariantStyles = {
    default: '',
    ghost: '',
    success: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-rose-600 dark:text-rose-400'
  };

  const appliedSize = sizeStyles[size] || sizeStyles.sm;
  const appliedIconColor = iconClassName || iconVariantStyles[variant] || '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={showNativeTitle ? title : undefined}
      aria-label={title || (typeof children === 'string' ? children : undefined)}
      className={`${baseStyles} ${appliedSize} ${className}`}
      {...rest}
    >
      {Icon && (
        <Icon
          size={size === 'xs' ? 12 : 13}
          className={`shrink-0 ${appliedIconColor}`}
          aria-hidden="true"
        />
      )}
      {children && <span>{children}</span>}
    </button>
  );
};

export default SimpleButton;
