import React from 'react';
import { normalizeTicketsConfig, DEFAULT_CONFIG_TICKETS } from './TicketTermico';

/**
 * ReciboEntregaTermico
 * Componente dedicado para impresión térmica POS (80mm / 58mm)
 * de comprobantes de liquidación y despacho físico de equipos entregados al cliente.
 *
 * @param {Object} props
 * @param {Object} props.servicio    - Datos completos de la orden entregada
 * @param {Object} [props.config]    - Configuración térmica de la sucursal
 * @param {Object} [props.branch]    - Datos de la sucursal activa
 * @param {Object} [props.companyData]- Datos de la empresa (logo, RNC, nombre)
 * @param {boolean} [props.isPrintable]- True cuando se monta para window.print()
 * @param {string} [props.copiaTipo] - 'Original (Cliente)' | 'Copia (Taller)'
 */
export const ReciboEntregaTermico = ({
  servicio = null,
  config = {},
  branch = null,
  companyData = null,
  isPrintable = false,
  copiaTipo = null
}) => {
  const normConfig = normalizeTicketsConfig(config || DEFAULT_CONFIG_TICKETS);
  const data = servicio || {};

  const is58mm = Number(normConfig.ancho_papel_mm) === 58;
  const widthMm = is58mm ? 58 : 80;

  // Fechas formateadas
  const fechaEntrega = data.fecha_entrega_real || data.updated_at || new Date().toISOString();
  const fechaEntregaStr = new Date(fechaEntrega).toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const fechaRecepcionStr = data.created_at
    ? new Date(data.created_at).toLocaleDateString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '—';

  // Garantía calculada
  const diasGarantia = Number(data.tiempo_garantia ?? 30);
  const fechaVenceGarantia = (() => {
    const d = new Date(fechaEntrega);
    d.setDate(d.getDate() + diasGarantia);
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  })();

  // Finanzas y desglose
  const costoBase = parseFloat(data.costo_final_confirmado) > 0
    ? parseFloat(data.costo_final_confirmado)
    : (parseFloat(data.costo_previsto) || 0);

  const incidencias = Array.isArray(data.incidencias) ? data.incidencias : [];
  const repuestosAprobados = incidencias.filter(
    (i) => i.aprobado_por_cliente === true && parseFloat(i.costo_adicional_repuesto || 0) > 0
  );
  const sumaRepuestos = repuestosAprobados.reduce(
    (acc, cur) => acc + parseFloat(cur.costo_adicional_repuesto || 0),
    0
  );

  const montoDescuento = parseFloat(data.monto_descuento) || 0;
  const montoAnticipo = parseFloat(data.monto_anticipo) || 0;

  const totalCalculado = Math.max(0, (costoBase + sumaRepuestos) - montoDescuento);
  const balanceNeto = Math.max(0, totalCalculado - montoAnticipo);

  const montoLiquidado = parseFloat(data.monto_liquidado ?? balanceNeto);
  const montoRecibido = parseFloat(data.monto_recibido_entrega ?? montoLiquidado);
  const cambioDevuelto = parseFloat(data.cambio_devuelto_entrega ?? Math.max(0, montoRecibido - montoLiquidado));
  const metodoPago = data.metodo_pago_entrega || 'Efectivo';

  // Datos del cliente y despacho
  const clienteNombre = data.cliente_nombre || data.nombre_cliente || (data.cliente ? `${data.cliente.nombre || ''} ${data.cliente.apellido || ''}`.trim() : 'Cliente al Portador');
  const clienteTel = data.telefono_cliente || data.telefono_cliente_libre || data.cliente?.telefono || '';
  const despachadoPor = data.despachado_por || data.usuario_entrega_nombre || data.recepcionista || 'Personal Autorizado';

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
        {/* ── Cabecera de la Empresa ── */}
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
              <span className="font-semibold">{branch?.nombre_sucursal || data.sucursal || 'Sucursal Principal'}</span>
              {(branch?.direccion || data.sucursal_direccion) && (
                <>
                  <br />
                  <span className="text-[9.5px]">{branch?.direccion || data.sucursal_direccion}</span>
                </>
              )}
              {(branch?.telefono || data.sucursal_telefono) && (
                <>
                  <br />
                  <span className="text-[9.5px]">Tel: {branch?.telefono || data.sucursal_telefono}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Título del Recibo de Entrega y Liquidación ── */}
        <div className="text-center border-b border-dashed border-neutral-400 pb-2 mb-2 space-y-0.5">
          <div className="font-bold text-xs uppercase tracking-wide">
            RECIBO DE ENTREGA Y LIQUIDACIÓN
          </div>
          <div className="flex justify-between font-bold text-xs text-neutral-900 pt-0.5">
            <span>TICKET:</span>
            <span className="font-mono tracking-wider">#{data.codigo_ticket || '---'}</span>
          </div>
          <div className="flex justify-between text-neutral-600 text-[10px]">
            <span>Fecha Entrega:</span>
            <span>{fechaEntregaStr}</span>
          </div>
          <div className="flex justify-between text-neutral-500 text-[9.5px]">
            <span>Ingreso Taller:</span>
            <span>{fechaRecepcionStr}</span>
          </div>
          <div className="flex justify-between text-neutral-600 text-[10px] pt-0.5 border-t border-dotted border-neutral-200">
            <span>Entregado por:</span>
            <span className="font-semibold">{despachadoPor}</span>
          </div>
          {(copiaTipo || Number(normConfig.copias_impresion) === 2) && (
            <div className="flex justify-between text-[9px] text-neutral-500 italic pt-0.5 border-t border-dotted border-neutral-200">
              <span>Tipo de Impresión:</span>
              <span>{copiaTipo || 'Original (Cliente)'}</span>
            </div>
          )}
        </div>

        {/* ── Datos del Cliente y Equipo ── */}
        {(normConfig.mostrar_cliente || normConfig.mostrar_equipo || normConfig.mostrar_falla) && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10px] space-y-1">
            {normConfig.mostrar_cliente && (
              <div>
                <span className="font-bold">Cliente: </span>
                <span className="font-sans font-semibold">{clienteNombre}</span>
                {clienteTel && <span className="text-neutral-600 block text-[9.5px]">Tel: {clienteTel}</span>}
              </div>
            )}
            {normConfig.mostrar_equipo && (
              <div>
                <span className="font-bold">Equipo: </span>
                <span className="font-sans font-semibold">
                  {[data.marca_equipo, data.modelo_equipo].filter(Boolean).join(' ') || 'Dispositivo'}
                </span>
                {data.num_serie_imei && (
                  <div className="text-[9px] text-neutral-500 font-mono">
                    S/N: {data.num_serie_imei}
                  </div>
                )}
              </div>
            )}
            {normConfig.mostrar_falla && data.falla_reportada && (
              <div className="text-[9.5px] text-neutral-700">
                <span className="font-bold">Servicio / Falla: </span>
                <span className="break-words">{data.falla_reportada}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Desglose de Liquidación Financiera ── */}
        {normConfig.mostrar_costo_y_anticipo && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10.5px] space-y-1">
            <div className="font-bold text-[10.5px] uppercase border-b border-dotted border-neutral-300 pb-0.5">
              Liquidación de Servicios
            </div>

            <div className="flex justify-between">
              <span>Mano de Obra / Base:</span>
              <span className="font-mono">RD$ {costoBase.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Repuestos / extras aprobados */}
            {repuestosAprobados.length > 0 && (
              <div className="space-y-0.5 pt-0.5">
                <div className="text-[9.5px] font-bold text-neutral-700 uppercase">
                  Repuestos / Adicionales ({repuestosAprobados.length}):
                </div>
                {repuestosAprobados.map((rep, idx) => (
                  <div key={rep.id || idx} className="flex justify-between text-[9.5px] pl-1 text-neutral-600">
                    <span className="truncate max-w-[180px]">
                      • {rep.repuesto_requerido || rep.tipo_incidencia || 'Pieza'}
                    </span>
                    <span className="font-mono">
                      RD$ {parseFloat(rep.costo_adicional_repuesto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {montoDescuento > 0 && (
              <div className="flex justify-between text-neutral-700">
                <span>Descuento:</span>
                <span className="font-mono">- RD$ {montoDescuento.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-neutral-300">
              <span>TOTAL LIQUIDADO:</span>
              <span className="font-mono">RD$ {totalCalculado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
            </div>

            {montoAnticipo > 0 && (
              <div className="flex justify-between text-neutral-700 text-[10px]">
                <span>Anticipo en Recepción:</span>
                <span className="font-mono">- RD$ {montoAnticipo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            {/* Saldo cobrado en entrega y forma de pago */}
            <div className="pt-1 mt-1 border-t border-dashed border-neutral-400 space-y-0.5">
              <div className="flex justify-between font-bold text-xs text-neutral-900">
                <span>SALDO COBRADO:</span>
                <span className="font-mono">RD$ {montoLiquidado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-700">
                <span>Método de Pago:</span>
                <span className="font-semibold uppercase">{metodoPago}</span>
              </div>
              {metodoPago === 'Efectivo' && montoRecibido > 0 && (
                <>
                  <div className="flex justify-between text-[9.5px] text-neutral-600">
                    <span>Monto Recibido:</span>
                    <span className="font-mono">RD$ {montoRecibido.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[9.5px] text-neutral-600">
                    <span>Cambio / Devuelta:</span>
                    <span className="font-mono">RD$ {cambioDevuelto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Cobertura de Garantía ── */}
        {normConfig.imprimir_garantia && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[9.5px] space-y-0.5 text-center">
            <div className="font-bold text-[10px] uppercase text-neutral-900">
              Garantía del Servicio: {diasGarantia} Días
            </div>
            <div className="text-neutral-700">
              Válida hasta el: <span className="font-bold">{fechaVenceGarantia}</span>
            </div>
            <div className="text-[8.5px] text-neutral-500 italic leading-tight pt-0.5">
              {data.condiciones_garantia || normConfig.clausula_garantia_defecto || 'Cubre mano de obra y repuestos instalados por nuestro centro. No cubre caídas, humedad ni rotura de sellos.'}
            </div>
          </div>
        )}

        {/* ── Observaciones de Entrega ── */}
        {normConfig.mostrar_observaciones && data.observaciones_entrega && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[9.5px] text-neutral-700">
            <span className="font-bold">Nota de Entrega: </span>
            <span className="italic">{data.observaciones_entrega}</span>
          </div>
        )}

        {/* ── Firma de Conformidad del Cliente ── */}
        <div className="pt-6 pb-2 text-center">
          <div className="w-48 mx-auto border-t border-black mb-1" />
          <div className="font-bold text-[9.5px] uppercase tracking-wider">
            Recibido Conforme
          </div>
          <div className="text-[8.5px] text-neutral-500 font-sans">
            Firma del Cliente
          </div>
        </div>

        {/* ── Mensaje de Cortesía ── */}
        {normConfig.mostrar_mensaje_cortesia && (normConfig.mensaje_cortesia || data.mensaje_cortesia) && (
          <div className="text-center text-[9px] font-sans font-semibold text-neutral-800 pt-2 border-t border-dotted border-neutral-300">
            {normConfig.mensaje_cortesia || '¡Gracias por su preferencia! Su equipo ha sido probado y entregado a su entera satisfacción.'}
          </div>
        )}

        {/* Simulación de Corte de Papel en Pantalla */}
        {!isPrintable && (
          <div className="mt-3 pt-2 border-t-2 border-dotted border-neutral-400 text-center text-[8px] text-neutral-400 uppercase tracking-widest font-mono">
            - - - CORTE DE RECIBO - - -
          </div>
        )}
      </div>
    </div>
  );
};

export default ReciboEntregaTermico;
