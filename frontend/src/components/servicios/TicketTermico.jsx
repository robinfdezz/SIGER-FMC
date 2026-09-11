import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const DEFAULT_CONFIG_TICKETS = {
  ancho_papel_mm: 80, // 80 | 58
  copias_impresion: 1, // 1 | 2
  imprimir_logo: true,
  mostrar_rnc: true,
  mostrar_contacto_sucursal: true,
  mostrar_cliente: true,
  mostrar_equipo: true,
  mostrar_falla: true,
  mostrar_observaciones: true,
  mostrar_costo_y_anticipo: true,
  mostrar_checklist_recepcion: true,
  incluir_qr_tracking: true,
  imprimir_garantia: true,
  clausula_garantia_defecto: 'Garantía válida únicamente presentando este comprobante. No cubre caídas, humedad, sellos rotos ni manipulación por terceros.',
  mostrar_mensaje_cortesia: true,
  mensaje_cortesia: '¡Gracias por su preferencia! Su equipo está en manos de profesionales certificados.'
};

/**
 * Normaliza y sanea el objeto config_tickets eliminando claves redundantes o heredadas
 */
export const normalizeTicketsConfig = (raw = {}) => {
  return {
    ancho_papel_mm: Number(raw.ancho_papel_mm) === 58 ? 58 : 80,
    copias_impresion: Number(raw.copias_impresion) === 2 ? 2 : 1,
    imprimir_logo: raw.imprimir_logo !== undefined ? Boolean(raw.imprimir_logo) : (raw.mostrar_logo !== undefined ? Boolean(raw.mostrar_logo) : DEFAULT_CONFIG_TICKETS.imprimir_logo),
    mostrar_rnc: raw.mostrar_rnc !== undefined ? Boolean(raw.mostrar_rnc) : (raw.mostrar_datos_empresa !== undefined ? Boolean(raw.mostrar_datos_empresa) : DEFAULT_CONFIG_TICKETS.mostrar_rnc),
    mostrar_contacto_sucursal: raw.mostrar_contacto_sucursal !== undefined ? Boolean(raw.mostrar_contacto_sucursal) : (raw.mostrar_datos_sucursal !== undefined ? Boolean(raw.mostrar_datos_sucursal) : DEFAULT_CONFIG_TICKETS.mostrar_contacto_sucursal),
    mostrar_cliente: raw.mostrar_cliente !== undefined ? Boolean(raw.mostrar_cliente) : DEFAULT_CONFIG_TICKETS.mostrar_cliente,
    mostrar_equipo: raw.mostrar_equipo !== undefined ? Boolean(raw.mostrar_equipo) : DEFAULT_CONFIG_TICKETS.mostrar_equipo,
    mostrar_falla: raw.mostrar_falla !== undefined ? Boolean(raw.mostrar_falla) : DEFAULT_CONFIG_TICKETS.mostrar_falla,
    mostrar_observaciones: raw.mostrar_observaciones !== undefined ? Boolean(raw.mostrar_observaciones) : DEFAULT_CONFIG_TICKETS.mostrar_observaciones,
    mostrar_costo_y_anticipo: raw.mostrar_costo_y_anticipo !== undefined ? Boolean(raw.mostrar_costo_y_anticipo) : (raw.mostrar_desglose_costos !== undefined ? Boolean(raw.mostrar_desglose_costos) : DEFAULT_CONFIG_TICKETS.mostrar_costo_y_anticipo),
    mostrar_checklist_recepcion: raw.mostrar_checklist_recepcion !== undefined ? Boolean(raw.mostrar_checklist_recepcion) : DEFAULT_CONFIG_TICKETS.mostrar_checklist_recepcion,
    incluir_qr_tracking: raw.incluir_qr_tracking !== undefined ? Boolean(raw.incluir_qr_tracking) : (raw.mostrar_qr_consulta !== undefined ? Boolean(raw.mostrar_qr_consulta) : DEFAULT_CONFIG_TICKETS.incluir_qr_tracking),
    imprimir_garantia: raw.imprimir_garantia !== undefined ? Boolean(raw.imprimir_garantia) : (raw.mostrar_garantia !== undefined ? Boolean(raw.mostrar_garantia) : DEFAULT_CONFIG_TICKETS.imprimir_garantia),
    clausula_garantia_defecto: raw.clausula_garantia_defecto || raw.terminos_garantia || DEFAULT_CONFIG_TICKETS.clausula_garantia_defecto,
    mostrar_mensaje_cortesia: raw.mostrar_mensaje_cortesia !== undefined ? Boolean(raw.mostrar_mensaje_cortesia) : DEFAULT_CONFIG_TICKETS.mostrar_mensaje_cortesia,
    mensaje_cortesia: raw.mensaje_cortesia || raw.mensaje_despedida || DEFAULT_CONFIG_TICKETS.mensaje_cortesia
  };
};

const DEFAULT_MOCK_SERVICIO = {
  codigo_ticket: 'FMC-2026-0089',
  created_at: new Date().toISOString(),
  estado: 'Recibido en Taller',
  cliente_nombre: 'Carlos Manuel Mendoza',
  telefono_cliente: '829-555-0149',
  cedula_cliente: '056-0012345-6',
  marca_equipo: 'Samsung',
  modelo_equipo: 'Galaxy S23 Ultra',
  num_serie_imei: '354892019482019',
  falla_reportada: 'Pantalla rota sin imagen tras fuerte impacto.',
  observaciones_recepcion: 'Rayones menores en bisel, protector de cámara puesto.',
  checklist_entrada: { enciende: true, tactil: true, carga: true, camara: false },
  costo_previsto: 4500,
  monto_anticipo: 1500,
  fecha_entrega_estimada: null,
};

/**
 * Componente Fuente Única de Verdad para Tickets Térmicos POS (80mm / 58mm)
 * Compatible con vista previa en pantalla e impresión física directa.
 *
 * @param {Object} props
 * @param {Object} [props.servicio]   - Datos de la orden creada o servicio a imprimir
 * @param {Object} [props.config]     - Configuración de tickets (ancho_papel_mm, opciones booleanas, etc.)
 * @param {Object} [props.branch]     - Datos de la sucursal activa
 * @param {Object} [props.companyData]- Datos de la empresa (logo, nombre, RNC)
 * @param {boolean} [props.isPrintable]- True cuando se monta para el diálogo de impresión real
 * @param {string} [props.copiaTipo]  - 'Original (Cliente)' | 'Copia (Taller)' | null
 */
export const TicketTermico = ({
  servicio = null,
  config = {},
  branch = null,
  companyData = null,
  isPrintable = false,
  copiaTipo = null
}) => {
  const normConfig = normalizeTicketsConfig(config);
  const data = servicio || DEFAULT_MOCK_SERVICIO;

  const is58mm = Number(normConfig.ancho_papel_mm) === 58;
  const widthMm = is58mm ? 58 : 80;

  // Formato de fecha
  const fechaStr = data.created_at
    ? new Date(data.created_at).toLocaleString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  // Cálculo financiero normalizado según el esquema real
  const costo = Number(data.costo_previsto ?? data.costo_estimado ?? 0);
  const anticipo = Number(data.monto_anticipo ?? data.anticipo ?? 0);
  const descuento = Number(data.monto_descuento ?? data.descuento ?? 0);
  const saldo = Math.max(0, costo - anticipo - descuento);

  // Cliente info
  const clienteNombre = data.cliente_nombre || data.nombre_cliente || (data.cliente ? `${data.cliente.nombre || ''} ${data.cliente.apellido || ''}`.trim() : '');
  const clienteTel = data.telefono_cliente || data.telefono_cliente_libre || data.cliente?.telefono || '';
  const clienteCedula = data.cedula_cliente || data.cedula_cliente_libre || data.cliente?.cedula_rnc || '';

  // URL real de seguimiento para código QR
  const cleanDomain = (companyData?.dominio_sistema || servicio?.dominio_sistema || 'https://franyermobilecenter.com').replace(/\/$/, '');
  const trackingUrl = `${cleanDomain}/estado/${encodeURIComponent(data.codigo_ticket || '')}`;

  // Checklist normalizado (soporta JSON string, array u objeto de claves booleanas)
  const rawChecklist = data.checklist_recepcion ?? data.checklist_entrada ?? data.checklist;
  let parsedChecklist = rawChecklist;
  if (typeof rawChecklist === 'string') {
    try {
      parsedChecklist = JSON.parse(rawChecklist);
    } catch {
      parsedChecklist = {};
    }
  }

  const checklistItems = [];
  if (Array.isArray(parsedChecklist)) {
    parsedChecklist.forEach((item) => {
      if (typeof item === 'string') {
        checklistItems.push({ key: item, label: item, checked: true, valStr: 'Sí' });
      } else if (typeof item === 'object' && item !== null) {
        const name = item.nombre || item.item || item.label || Object.keys(item)[0] || 'Item';
        const isOk = item.estado === 'bueno' || item.checked === true || item.valor === true || item.status === 'ok';
        checklistItems.push({ key: name, label: name, checked: isOk, valStr: isOk ? 'Sí' : 'No' });
      }
    });
  } else if (typeof parsedChecklist === 'object' && parsedChecklist !== null) {
    Object.entries(parsedChecklist).forEach(([key, val]) => {
      const isOk = val === true || val === 'ok' || val === 'si' || val === 'bueno';
      checklistItems.push({
        key,
        label: key,
        checked: isOk,
        valStr: val === true ? 'Sí' : val === false ? 'No' : String(val)
      });
    });
  }

  const containerStyles = isPrintable
    ? {
        width: `${widthMm}mm`,
        maxWidth: `${widthMm}mm`,
        margin: 0,
        padding: is58mm ? '2mm 1.5mm' : '4mm 2.5mm',
        background: '#ffffff',
        color: '#000000',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: is58mm ? '10px' : '11.5px',
        lineHeight: 1.25,
        boxSizing: 'border-box'
      }
    : {
        width: is58mm ? '260px' : '320px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      };

  return (
    <div className={isPrintable ? '' : 'flex justify-center select-none'}>
      <div
        className={`bg-white text-black font-mono transition-all ${
          isPrintable
            ? ''
            : `px-4 pt-7 pb-8 rounded-xl border border-neutral-300 dark:border-neutral-700 ${
                is58mm ? 'text-[11px]' : 'text-xs'
              }`
        }`}
        style={containerStyles}
      >
        {/* Cabecera del Ticket */}
        <div className="text-center space-y-1 border-b border-dashed border-neutral-400 pb-3 mb-2">
          {normConfig.imprimir_logo && companyData?.logo_url && (
            <div className="flex justify-center mb-1">
              <img
                src={companyData.logo_url}
                alt={companyData?.nombre_empresa || 'Logotipo'}
                className="max-h-12 max-w-[140px] mx-auto mb-2 object-contain grayscale contrast-150"
              />
            </div>
          )}

          <div className="font-bold uppercase text-[13px] tracking-tight">
            {companyData?.nombre_empresa || 'FRANYER MOBILE CENTER, S.R.L.'}
          </div>

          {normConfig.mostrar_rnc && (companyData?.rnc || companyData?.rnc_empresa) && (
            <div className="text-[10px] text-neutral-600">
              RNC: {companyData?.rnc || companyData?.rnc_empresa}
            </div>
          )}

          {normConfig.mostrar_contacto_sucursal && (
            <div className="text-[10.5px] text-neutral-700 font-sans mt-0.5 leading-tight">
              <span className="font-semibold">{branch?.nombre_sucursal || 'Sucursal Principal'}</span>
              {branch?.direccion && (
                <>
                  <br />
                  <span className="text-[9.5px]">{branch.direccion}</span>
                </>
              )}
              {branch?.telefono && (
                <>
                  <br />
                  <span className="text-[9.5px]">Tel: {branch.telefono}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Metadatos de la Orden */}
        <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10.5px] space-y-0.5">
          <div className="flex justify-between font-bold text-xs text-neutral-900">
            <span>TICKET:</span>
            <span className="font-mono tracking-wider">#{data.codigo_ticket || '---'}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Fecha Recepción:</span>
            <span>{fechaStr}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Estado:</span>
            <span className="font-semibold uppercase text-neutral-800">
              {data.estado || 'Recibido en Taller'}
            </span>
          </div>
          {(copiaTipo || Number(normConfig.copias_impresion) === 2) && (
            <div className="flex justify-between text-[9px] text-neutral-500 italic pt-0.5 border-t border-dotted border-neutral-200 mt-1">
              <span>Tipo de Impresión:</span>
              <span>{copiaTipo || 'Original (Cliente)'}</span>
            </div>
          )}
        </div>

        {/* Datos del Cliente */}
        {normConfig.mostrar_cliente && clienteNombre && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10px] space-y-0.5">
            <div className="font-bold text-[10.5px] uppercase">Cliente:</div>
            <div className="text-neutral-800 font-sans font-semibold break-words">
              {clienteNombre}
            </div>
            <div className="flex justify-between text-neutral-600 flex-wrap gap-x-2">
              {clienteTel && <span>Tel: {clienteTel}</span>}
              {clienteCedula && <span>Céd: {clienteCedula}</span>}
            </div>
          </div>
        )}

        {/* Datos del Dispositivo y Falla */}
        {(normConfig.mostrar_equipo || normConfig.mostrar_falla || normConfig.mostrar_observaciones) && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10px] space-y-1">
            {normConfig.mostrar_equipo && (data.marca_equipo || data.modelo_equipo) && (
              <div>
                <span className="font-bold">Equipo: </span>
                <span className="font-sans font-semibold">
                  {[data.marca_equipo, data.modelo_equipo].filter(Boolean).join(' ')}
                </span>
                {data.num_serie_imei && (
                  <div className="text-[9px] text-neutral-500 font-mono">
                    IMEI/Serie: {data.num_serie_imei}
                  </div>
                )}
              </div>
            )}

            {normConfig.mostrar_falla && data.falla_reportada && (
              <div>
                <span className="font-bold">Falla: </span>
                <span className="text-neutral-700 break-words">{data.falla_reportada}</span>
              </div>
            )}

            {normConfig.mostrar_observaciones && (data.observaciones_recepcion || data.observaciones) && (
              <div className="text-[9px] text-neutral-600 italic break-words">
                Obs: {data.observaciones_recepcion || data.observaciones}
              </div>
            )}
          </div>
        )}

        {/* Checklist de Entrada */}
        {(normConfig.mostrar_checklist_recepcion || normConfig.mostrar_checklist) && checklistItems.length > 0 && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10px] space-y-1 text-neutral-900">
            <div className="font-bold text-[10.5px] uppercase">Checklist Entrada:</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[9.5px]">
              {checklistItems.map((item) => (
                <div key={item.key} className="flex items-center gap-1 truncate">
                  <span>{item.checked ? '[✓]' : '[!]'}</span>
                  <span className="capitalize">{item.label}: {item.valStr}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Desglose Financiero */}
        {normConfig.mostrar_costo_y_anticipo && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10.5px] space-y-1">
            <div className="flex justify-between">
              <span>Costo Estimado:</span>
              <span className="font-mono">RD$ {costo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-neutral-700">
                <span>Descuento:</span>
                <span className="font-mono">- RD$ {descuento.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-900 font-semibold">
              <span>Anticipo Recibido:</span>
              <span className="font-mono">- RD$ {anticipo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-neutral-300">
              <span>SALDO PENDIENTE:</span>
              <span className="font-mono">RD$ {saldo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Código QR de Consulta Web */}
        {normConfig.incluir_qr_tracking && (
          <div className="text-center my-3 flex flex-col items-center">
            <div className="p-2 border border-neutral-300 rounded-lg bg-white w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center mx-auto shrink-0">
              <QRCodeSVG
                value={trackingUrl}
                size={80}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
                includeMargin={false}
                className="w-full h-full text-black"
              />
            </div>
            <div className="mt-2 text-center space-y-0.5">
              <span className="block text-[8.5px] text-neutral-600 font-sans">
                Escanea para consultar el estado en vivo
              </span>
              <div className="font-mono font-bold text-[10px] text-neutral-900 tracking-wider">
                #{data.codigo_ticket || 'FMC-TICKET'}
              </div>
            </div>
          </div>
        )}

        {/* Cláusula de Garantía */}
        {normConfig.imprimir_garantia && (data.condiciones_garantia || normConfig.clausula_garantia_defecto) && (
          <div className="border-t border-dashed border-neutral-400 pt-2 mb-2 text-[8.5px] text-neutral-600 text-center leading-tight font-sans">
            <div className="font-bold uppercase text-[9px] text-neutral-800 mb-0.5">
              Condiciones de Garantía
            </div>
            {data.condiciones_garantia || normConfig.clausula_garantia_defecto}
          </div>
        )}

        {/* Mensaje de Cortesía */}
        {normConfig.mostrar_mensaje_cortesia && normConfig.mensaje_cortesia && (
          <div className="text-center text-[9.5px] font-sans font-semibold text-neutral-800 pt-1">
            {normConfig.mensaje_cortesia}
          </div>
        )}

        {/* Simulación de Corte de Papel en Pantalla */}
        {!isPrintable && (
          <div className="mt-3 pt-2 border-t-2 border-dotted border-neutral-400 text-center text-[8px] text-neutral-400 uppercase tracking-widest font-mono">
            - - - CORTE DE TICKET - - -
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketTermico;
