import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Select from './Select';

/**
 * Componente modular y reutilizable de paginación para tablas del sistema.
 *
 * @param {Object} props
 * @param {number} props.currentPage - Página actual activa (1-based)
 * @param {number} props.totalPages - Total de páginas disponibles
 * @param {number} props.totalItems - Cantidad total de registros filtrados
 * @param {number} props.itemsPerPage - Cantidad de registros por página
 * @param {Function} props.onPageChange - Callback al cambiar de página: (page: number) => void
 * @param {Function} props.onItemsPerPageChange - Callback al cambiar límite por página: (limit: number) => void
 * @param {number[]} [props.pageSizeOptions=[10, 20, 50, 100]] - Opciones disponibles en el selector
 * @param {boolean} [props.isLoading=false] - Indica si la tabla está cargando datos
 * @param {string} [props.className=''] - Clases CSS adicionales para el contenedor
 */
export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 20,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 20, 50, 100],
  isLoading = false,
  className = ''
}) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage || 1), safeTotalPages);

  // Cálculo de rango de registros visualizados
  const start = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const end = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  // Generador inteligente de números de página con elipsis
  const getPageNumbers = () => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', safeTotalPages];
    }
    if (safeCurrentPage >= safeTotalPages - 3) {
      return [
        1,
        '...',
        safeTotalPages - 4,
        safeTotalPages - 3,
        safeTotalPages - 2,
        safeTotalPages - 1,
        safeTotalPages
      ];
    }
    return [
      1,
      '...',
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      '...',
      safeTotalPages
    ];
  };

  const pageNumbers = getPageNumbers();

  const handlePrev = () => {
    if (safeCurrentPage > 1 && !isLoading && onPageChange) {
      onPageChange(safeCurrentPage - 1);
    }
  };

  const handleNext = () => {
    if (safeCurrentPage < safeTotalPages && !isLoading && onPageChange) {
      onPageChange(safeCurrentPage + 1);
    }
  };

  return (
    <div
      className={`px-4 sm:px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-inter bg-neutral-50/50 dark:bg-neutral-900/20 ${className}`}
    >
      {/* Sección Izquierda: Selector por página y leyenda informativa */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal">Mostrar</span>
            <div className="w-[72px]">
              <Select
                size="sm"
                placement="top"
                value={String(itemsPerPage)}
                onChange={(val) => onItemsPerPageChange(Number(val))}
                items={pageSizeOptions.map((size) => ({
                  id: String(size),
                  value: String(size),
                  label: String(size)
                }))}
                disabled={isLoading}
              />
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-normal hidden sm:inline">
              por pág.
            </span>
          </div>
        )}

        <span className="text-neutral-200 dark:text-neutral-800 hidden sm:inline">|</span>

        {/* Leyenda informativa de registros */}
        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-normal">
          Mostrando {start} a {end} de {totalItems} registros
        </span>
      </div>

      {/* Sección Derecha: Navegación de páginas */}
      <div className="flex items-center justify-center sm:justify-end gap-1 w-full sm:w-auto">
        {/* Botón Anterior (<) */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={safeCurrentPage <= 1 || isLoading}
          title="Página anterior"
          aria-label="Página anterior"
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18181B] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Vista Móvil (< sm): "Página X de Y" */}
        <span className="sm:hidden text-xs font-normal text-neutral-400 dark:text-neutral-500 px-3 select-none">
          Página {safeCurrentPage} de {safeTotalPages}
        </span>

        {/* Vista Escritorio (sm:): Números de página */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((item, idx) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-xs text-neutral-400 dark:text-neutral-500 select-none font-medium"
                >
                  …
                </span>
              );
            }

            const pageNum = Number(item);
            const isActive = pageNum === safeCurrentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => !isLoading && onPageChange && onPageChange(pageNum)}
                disabled={isLoading}
                aria-current={isActive ? 'page' : undefined}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 font-semibold shadow-xs'
                    : 'border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:text-neutral-800 dark:hover:text-neutral-200 font-normal'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Botón Siguiente (>) */}
        <button
          type="button"
          onClick={handleNext}
          disabled={safeCurrentPage >= safeTotalPages || isLoading}
          title="Página siguiente"
          aria-label="Página siguiente"
          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18181B] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
