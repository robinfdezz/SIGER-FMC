import React, { forwardRef } from 'react';
import { stripEmojis } from '../../utils/stripEmojis';

/**
 * Componente de Input centralizado con sanitización automática de emojis en tiempo real y pegado.
 */
const Input = forwardRef(({
  label,
  error,
  supportingText,
  isRequired = false,
  allowEmojis = false,
  onChange,
  onPaste,
  className = '',
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const handleChange = (e) => {
    if (!allowEmojis && type !== 'password' && typeof e.target.value === 'string') {
      // Durante escritura activa removemos emojis sin truncar espacios normales para permitir teclear varias palabras
      const cleanValue = stripEmojis(e.target.value, false);
      if (cleanValue !== e.target.value) {
        e.target.value = cleanValue;
      }
    }
    onChange?.(e);
  };

  const handlePaste = (e) => {
    if (!allowEmojis && type !== 'password') {
      const pasteText = e.clipboardData?.getData('text') || '';
      const cleanText = stripEmojis(pasteText, false);
      if (cleanText !== pasteText) {
        e.preventDefault();
        // Insertar texto limpio en el cursor
        const input = e.target;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const currentVal = input.value || '';
        const nextVal = currentVal.substring(0, start) + cleanText + currentVal.substring(end);
        input.value = nextVal;
        input.setSelectionRange(start + cleanText.length, start + cleanText.length);

        // Disparar evento change sintético
        const changeEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(changeEvent);
        return;
      }
    }
    onPaste?.(e);
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5 font-inter"
        >
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        type={type}
        onChange={handleChange}
        onPaste={handlePaste}
        className={`w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-[#1C1C1F] border rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm font-inter transition-all duration-200 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 dark:focus:border-red-500 ${
          error
            ? 'border-red-500 dark:border-red-500 focus:border-red-500'
            : 'border-neutral-200/90 dark:border-neutral-800'
        } ${className}`}
        {...props}
      />

      {error && (
        <p className="text-[11px] text-red-500 mt-1 font-inter">{error}</p>
      )}
      {supportingText && !error && (
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 font-inter">{supportingText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
