import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, CheckCircle2, X } from 'lucide-react';
import ReciboEntregaTermico from './ReciboEntregaTermico';
import { normalizeTicketsConfig, DEFAULT_CONFIG_TICKETS } from './TicketTermico';
import { injectThermalPrintStyles } from '../../utils/printStyles';

/**
 * PostEntregaModal
 * Modal de confirmación tras la entrega y liquidación exitosa de un equipo.
 * Permite la impresión inmediata del Recibo Térmico de Entrega.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.orden        - Datos completos de la orden entregada
 * @param {Object} props.companyData  - Datos de la empresa
 * @param {Object} props.branchData   - Datos de la sucursal
 */
export const PostEntregaModal = ({
  isOpen,
  onClose,
  orden,
  companyData,
  branchData
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const ticketsConfig = normalizeTicketsConfig(branchData?.config_tickets || DEFAULT_CONFIG_TICKETS);

  // Escuchar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Manejador de impresión térmica
  const handlePrint = () => {
    setIsPrinting(true);
    const ancho = Number(ticketsConfig.ancho_papel_mm) === 58 ? 58 : 80;
    injectThermalPrintStyles('ticket', { ancho });

    setTimeout(() => {
      window.print();
    }, 150);
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  if (!isOpen || !orden) return null;

  const modalDialog = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity no-print"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* Cabecera */}
        <div className="p-6 pb-4 text-center border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto mb-4 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
            ¡Equipo Entregado y Liquidado!
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
            El servicio ha concluido exitosamente y el inventario fue actualizado.
          </p>

          {/* Tarjeta de Ticket y Balance */}
          <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block font-inter">
                Ticket Despachado
              </span>
              <span className="font-mono text-base font-bold text-neutral-900 dark:text-neutral-100">
                #{orden.codigo_ticket}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block font-inter">
                Monto Cobrado
              </span>
              <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                RD$ {parseFloat(orden.monto_liquidado ?? orden.costo_final_confirmado ?? 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones de Impresión */}
        <div className="p-6">
          <button
            type="button"
            onClick={handlePrint}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors w-full shadow-sm cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            <span>Imprimir Recibo de Entrega</span>
          </button>
        </div>

        {/* Botón Cerrar (X) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Modal de Diálogo vía Portal ── */}
      {typeof document !== 'undefined' && createPortal(modalDialog, document.body)}

      {/* ── Portal de Impresión Térmica Bajo Demanda ── */}
      {isPrinting && typeof document !== 'undefined' && createPortal(
        <div id="print-mount-point" className="print-only">
          {/* Copia 1: Original */}
          <ReciboEntregaTermico
            servicio={orden}
            config={ticketsConfig}
            branch={branchData}
            companyData={companyData}
            isPrintable={true}
            copiaTipo={Number(ticketsConfig.copias_impresion) === 2 ? 'Original (Cliente)' : null}
          />
          {/* Copia 2: Taller (si copias_impresion === 2) */}
          {Number(ticketsConfig.copias_impresion) === 2 && (
            <div style={{ pageBreakBefore: 'always', marginTop: '4mm' }}>
              <ReciboEntregaTermico
                servicio={orden}
                config={ticketsConfig}
                branch={branchData}
                companyData={companyData}
                isPrintable={true}
                copiaTipo="Copia (Taller)"
              />
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default PostEntregaModal;
