import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Tag, X } from 'lucide-react';
import Button from '../common/Button';

// ─────────────────────────────────────────────────────────
// Estilos de impresion termica inyectados en <head>
// Se calibran segun ancho_papel_mm de la sucursal (58 u 80)
// ─────────────────────────────────────────────────────────
const buildPrintStyles = (anchoPapel = 80) => `
  @media print {
    @page {
      size: ${anchoPapel}mm auto;
      margin: 0;
    }
    body * { visibility: hidden !important; }
    #print-zone, #print-zone * { visibility: visible !important; }
    #print-zone {
      position: fixed !important;
      inset: 0 !important;
      width: ${anchoPapel}mm !important;
      font-size: ${anchoPapel === 58 ? '11px' : '12px'} !important;
      font-family: 'Courier New', monospace !important;
      color: #000 !important;
      background: #fff !important;
    }
    .no-print { display: none !important; }
  }
`;

// ─────────────────────────────────────────────────────────
// Zona de contenido imprimible del comprobante
// ─────────────────────────────────────────────────────────
const TicketPrintContent = ({ orden, companyName, branchName, anchoPapel }) => {
  const separador = '-'.repeat(anchoPapel === 58 ? 28 : 36);
  const hoy = new Date(orden.created_at || Date.now()).toLocaleString('es-DO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div id="print-zone" style={{ fontFamily: "'Courier New', monospace", fontSize: anchoPapel === 58 ? 11 : 12, width: anchoPapel + 'mm', padding: '4px 6px', background: '#fff', color: '#000' }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>
        {companyName || 'TALLER TECNICO'}
      </div>
      {branchName && <div style={{ textAlign: 'center', marginBottom: 2 }}>{branchName}</div>}
      <div style={{ textAlign: 'center', marginBottom: 6 }}>{hoy}</div>

      <div style={{ textAlign: 'center' }}>{separador}</div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: anchoPapel === 58 ? 13 : 16, margin: '6px 0', letterSpacing: 2 }}>
        {orden.codigo_ticket}
      </div>
      <div style={{ textAlign: 'center', fontSize: 10, marginBottom: 6 }}>CODIGO DE SEGUIMIENTO</div>
      <div style={{ textAlign: 'center' }}>{separador}</div>

      {(orden.cliente_nombre || orden.nombre_cliente) && (
        <div style={{ marginTop: 4 }}><strong>CLIENTE:</strong> {orden.cliente_nombre || orden.nombre_cliente}</div>
      )}
      {orden.marca_equipo && (
        <div><strong>EQUIPO:</strong> {orden.marca_equipo} {orden.modelo_equipo}</div>
      )}
      {orden.falla_reportada && (
        <div style={{ marginTop: 4 }}><strong>FALLA:</strong> {orden.falla_reportada}</div>
      )}
      {orden.fecha_entrega_estimada && (
        <div style={{ marginTop: 4 }}><strong>ENTREGA EST.:</strong> {orden.fecha_entrega_estimada}</div>
      )}

      <div style={{ textAlign: 'center', marginTop: 8 }}>{separador}</div>
      <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>
        Garantia valida unicamente con este comprobante.
      </div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 6 }}>
        Gracias por su preferencia
      </div>
    </div>
  );
};

const StickerPrintContent = ({ orden, anchoPapel }) => (
  <div id="print-zone" style={{ fontFamily: "'Courier New', monospace", fontSize: 10, width: '50mm', padding: '2px 4px', background: '#fff', color: '#000', border: '1px solid #000' }}>
    <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: 12, letterSpacing: 1, marginBottom: 2 }}>
      {orden.codigo_ticket}
    </div>
    {orden.marca_equipo && <div style={{ fontSize: 9 }}>{orden.marca_equipo} {orden.modelo_equipo}</div>}
    {(orden.cliente_nombre || orden.nombre_cliente) && <div style={{ fontSize: 9 }}>Cl: {orden.cliente_nombre || orden.nombre_cliente}</div>}
    <div style={{ fontSize: 8, marginTop: 2 }}>{new Date(orden.created_at || Date.now()).toLocaleDateString('es-DO')}</div>
  </div>
);

// ─────────────────────────────────────────────────────────
// Componente principal PostCreacionModal
// ─────────────────────────────────────────────────────────
/**
 * PostCreacionModal
 * Aparece tras la creacion exitosa de una orden de servicio.
 * Permite imprimir el comprobante termico o la etiqueta sticker, o cerrar.
 *
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {Object}   orden        - Datos de la orden creada { id, codigo_ticket, created_at, ... }
 * @param {Object}   companyData  - { nombre_empresa }
 * @param {Object}   branchData   - { nombre_sucursal, config_tickets }
 */
const PostCreacionModal = ({ isOpen, onClose, orden, companyData, branchData }) => {
  const anchoPapel = branchData?.config_tickets?.ancho_papel_mm === 58 ? 58 : 80;
  const printTypeRef = useRef(null);

  if (!isOpen || !orden) return null;

  const handlePrint = (type) => {
    printTypeRef.current = type;
    // Inyectar estilos de impresion dinamicamente
    const styleId = 'thermal-print-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildPrintStyles(type === 'ticket' ? anchoPapel : 50);
    setTimeout(() => window.print(), 100);
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* Cabecera */}
        <div className="p-6 sm:p-7 pb-4 text-center border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
            Orden Creada Exitosamente
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
            La orden fue registrada en el sistema
          </p>

          {/* Codigo del ticket destacado */}
          <div className="mt-4 px-4 py-3 bg-neutral-50 dark:bg-neutral-800/70 rounded-xl border border-neutral-200 dark:border-neutral-700 font-mono text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-[0.15em]">
            {orden.codigo_ticket}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1.5 font-inter">Código de seguimiento del cliente</p>
        </div>

        {/* Zona de impresion oculta en pantalla, visible al imprimir */}
        <div className="hidden">
          {printTypeRef.current === 'sticker' ? (
            <StickerPrintContent orden={orden} anchoPapel={anchoPapel} />
          ) : (
            <TicketPrintContent
              orden={orden}
              companyName={companyData?.nombre_empresa}
              branchName={branchData?.nombre_sucursal}
              anchoPapel={anchoPapel}
            />
          )}
        </div>

        {/* Acciones en una sola fila */}
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Printer}
              onClick={() => handlePrint('ticket')}
              className="w-full"
            >
              Comprobante Térmico
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={Tag}
              onClick={() => handlePrint('sticker')}
              className="w-full"
            >
              Etiqueta / Sticker
            </Button>
          </div>
        </div>

        {/* Boton X superior derecho */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Cerrar modal"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PostCreacionModal;