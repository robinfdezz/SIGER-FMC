import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Tag, X, CheckCircle2, Receipt } from 'lucide-react';
import Button from '../common/Button';
import TicketTermico, { normalizeTicketsConfig, DEFAULT_CONFIG_TICKETS } from './TicketTermico';
import StickerTermico, { DEFAULT_CONFIG_ETIQUETAS } from './StickerTermico';
import ReciboEntregaTermico from './ReciboEntregaTermico';
import { injectThermalPrintStyles } from '../../utils/printStyles';

/**
 * PostCreacionModal
 * Aparece tras la creación exitosa de una orden o al pulsar la impresora en /tickets.
 * Si la orden ya está ENTREGADA, permite reimprimir el Recibo de Liquidación o el Ticket Original.
 *
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {Object}   orden        - Datos de la orden { id, codigo_ticket, created_at, ... }
 * @param {Object}   companyData  - Datos de la empresa { nombre_empresa, rnc, logo_url }
 * @param {Object}   branchData   - Datos de la sucursal { nombre_sucursal, direccion, telefono, config_tickets, config_etiquetas }
 */
export const PostCreacionModal = ({ isOpen, onClose, orden, companyData, branchData }) => {
  const [documentoImprimir, setDocumentoImprimir] = useState(null); // null | 'ticket' | 'sticker' | 'recibo_entrega'

  const ticketsConfig = normalizeTicketsConfig(branchData?.config_tickets || DEFAULT_CONFIG_TICKETS);
  const etiquetasConfig = {
    ...DEFAULT_CONFIG_ETIQUETAS,
    ...(branchData?.config_etiquetas && typeof branchData.config_etiquetas === 'object' ? branchData.config_etiquetas : {})
  };

  const estadoNormalizado = String(
    orden?.codigo_estado ||
    orden?.estado ||
    orden?.estado_servicio ||
    orden?.nombre_estado ||
    ''
  ).toUpperCase();

  const isEntregado =
    estadoNormalizado.includes('ENTREG') ||
    Number(orden?.orden_flujo) === 7 ||
    Number(orden?.estado_id) === 7 ||
    Boolean(orden?.fecha_entrega_real);

  const handlePrint = (type) => {
    setDocumentoImprimir(type);

    if (type === 'sticker') {
      const isVertical = etiquetasConfig.orientacion === 'vertical';
      const anchoMm = Number(etiquetasConfig.ancho_mm) || 50;
      const altoMm = Number(etiquetasConfig.alto_mm) || 30;
      const effectiveWidthMm = isVertical ? Math.min(anchoMm, altoMm) : Math.max(anchoMm, altoMm);
      const effectiveHeightMm = isVertical ? Math.max(anchoMm, altoMm) : Math.min(anchoMm, altoMm);
      injectThermalPrintStyles('sticker', { ancho: effectiveWidthMm, alto: effectiveHeightMm });
    } else {
      // type === 'ticket' || type === 'recibo_entrega'
      const ancho = Number(ticketsConfig.ancho_papel_mm) === 58 ? 58 : 80;
      injectThermalPrintStyles('ticket', { ancho });
    }

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Limpiar montaje tras cerrar el diálogo de impresión
  useEffect(() => {
    const handleAfterPrint = () => {
      setDocumentoImprimir(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Bloquear scroll y escuchar tecla Escape mientras el modal está abierto
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

  if (!isOpen || !orden) return null;

  const modalDialog = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity no-print"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* Cabecera con Icono de Éxito */}
        <div className="p-6 sm:p-7 pb-4 text-center border-b border-neutral-100 dark:border-neutral-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
            {isEntregado ? 'Imprimir Comprobante de Servicio' : 'Imprimir Comprobante o Etiqueta'}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
            {isEntregado
              ? 'Esta orden fue entregada y liquidada. Selecciona el comprobante que deseas reimprimir:'
              : 'Selecciona el formato que deseas imprimir para esta orden de servicio.'}
          </p>

          {/* Código del ticket destacado */}
          <div className="mt-4 px-4 py-3 bg-neutral-50 dark:bg-neutral-800/70 rounded-2xl border border-neutral-200 dark:border-neutral-700 font-mono text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-[0.15em] flex items-center justify-center gap-2">
            <span className="text-red-600 dark:text-red-500">#</span>
            <span>{orden.codigo_ticket}</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1.5 font-inter">
            {isEntregado ? 'Orden Liquidada y Entregada' : 'Código único de seguimiento para el cliente'}
          </p>
        </div>

        {/* Acciones de Impresión */}
        <div className="p-5 sm:p-6 space-y-3">
          {isEntregado ? (
            <div className="space-y-2.5">
              {/* Opción Destacada: Recibo de Entrega y Liquidación */}
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={Receipt}
                onClick={() => handlePrint('recibo_entrega')}
                className="w-full justify-center"
              >
                Recibo de Entrega y Liquidación
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  icon={Printer}
                  onClick={() => handlePrint('ticket')}
                  className="w-full justify-center text-xs"
                >
                  Ticket de Entrada Original
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  icon={Tag}
                  onClick={() => handlePrint('sticker')}
                  className="w-full justify-center text-xs"
                >
                  Etiqueta / Sticker
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={Printer}
                onClick={() => handlePrint('ticket')}
                className="w-full justify-center"
              >
                Comprobante Térmico
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={Tag}
                onClick={() => handlePrint('sticker')}
                className="w-full justify-center"
              >
                Etiqueta / Sticker
              </Button>
            </div>
          )}
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
      {/* ── Modal de Confirmación en Pantalla vía Portal al document.body ── */}
      {typeof document !== 'undefined' && createPortal(modalDialog, document.body)}

      {/* ── Portal de Impresión Estrictamente Bajo Demanda en document.body (Hijo directo de <body>) ── */}
      {documentoImprimir !== null && typeof document !== 'undefined' && createPortal(
        <div id="print-mount-point" className="print-only">
          {documentoImprimir === 'recibo_entrega' ? (
            <>
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
            </>
          ) : documentoImprimir === 'sticker' ? (
            <StickerTermico
              servicio={orden}
              config={etiquetasConfig}
              branch={branchData}
              companyData={companyData}
              isPrintable={true}
            />
          ) : (
            <>
              {/* Copia 1: Original */}
              <TicketTermico
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
                  <TicketTermico
                    servicio={orden}
                    config={ticketsConfig}
                    branch={branchData}
                    companyData={companyData}
                    isPrintable={true}
                    copiaTipo="Copia (Taller)"
                  />
                </div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default PostCreacionModal;