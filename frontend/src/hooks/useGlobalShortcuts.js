import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Helper para verificar si un elemento activo es un campo editable.
 * Evita disparar atajos no deseados mientras el usuario escribe datos.
 */
export const isEditableElement = (el) => {
  if (!el) return false;
  return (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
    el.isContentEditable ||
    el.getAttribute?.('contenteditable') === 'true'
  );
};

/**
 * Hook Central de Atajos Globales de Teclado para SIGER-FMC.
 * Principio: Calidad y ergonomía operativa antes que saturación.
 *
 * Atajos manejados:
 * 1. Ctrl+K / Cmd+K: Foco y apertura de Búsqueda Global instantánea.
 * 2. Alt+N: Navegación rápida al wizard de Recepción / Nueva Orden.
 * 3. Ctrl+Enter / Cmd+Enter: Guardado / Envío rápido del formulario activo.
 */
export const useGlobalShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput = isEditableElement(activeEl);

      // 1. CTRL + K / CMD + K: Búsqueda Global
      if ((e.ctrlKey || e.metaKey) && (e.key?.toLowerCase() === 'k' || e.code === 'KeyK')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('siger:focus-global-search'));
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 2. ALT + N: Nueva Orden de Servicio (solo si no está digitando en un input)
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key?.toLowerCase() === 'n' || e.code === 'KeyN')) {
        if (isInput) return; // Regla de guardia estricta
        e.preventDefault();
        navigate('/servicios/nueva');
        return;
      }

      // 3. CTRL + ENTER / CMD + ENTER: Enviar formulario modal / vista activa
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const form = activeEl?.closest('form');
        if (form) {
          e.preventDefault();
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
};

export default useGlobalShortcuts;
