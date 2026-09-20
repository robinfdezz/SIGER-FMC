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
const DEFAULT_MOCK_RECIBO = {
  codigo_ticket: 'SFM-48LM-YFN4',
  created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  fecha_entrega_real: new Date().toISOString(),
  cliente_nombre: 'Carlos Manuel Mendoza',
  telefono_cliente: '829-555-0149',
  marca_equipo: 'Sony',
  modelo_equipo: 'DualSense PS5',
  num_serie_imei: '354892019482019',
  falla_reportada: 'Ambos joystick con drift y gatillos no responden.',
  costo_estimado: 2000,
  costo_previsto: 2000,
  costo_final_confirmado: 4200,
  incidencias: [
    {
      id: 1,
      aprobado_por_cliente: true,
      repuesto_requerido: 'Ambos joystick dañados',
      costo_adicional_repuesto: 1200
    },
    {
      id: 2,
      aprobado_por_cliente: true,
      repuesto_requerido: 'los gatillos no sirven',
      costo_adicional_repuesto: 1000
    }
  ],
  monto_descuento: 0,
  monto_anticipo: 0,
  tasa_impuesto: 18,
  monto_liquidado: 4200,
  metodo_pago_entrega: 'Efectivo',
  monto_recibido_entrega: 4500,
  cambio_devuelto_entrega: 300,
  tiempo_garantia: 30
};

export const ReciboEntregaTermico = ({
  servicio = null,
  config = {},
  branch = null,
  companyData = null,
  isPrintable = false,
  copiaTipo = null
}) => {
  const normConfig = normalizeTicketsConfig(config || DEFAULT_CONFIG_TICKETS);
  const data = servicio || DEFAULT_MOCK_RECIBO;

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

  // Cláusula legal de garantía:
  // 1. Prioridad: condición particular guardada en la orden (servicios_recepcion.condiciones_garantia en DB).
  // 2. Fallback: cláusula por defecto de la sucursal (datos_sucursales.config_tickets.clausula_garantia_defecto en DB).
  // 3. Fallback final: exclusiones estándar de la empresa.
  const condicionOrdenDB = data.condiciones_garantia && String(data.condiciones_garantia).trim() !== ''
    ? String(data.condiciones_garantia).trim()
    : null;

  const clausulaSucursalDB = normConfig.clausula_garantia_defecto && String(normConfig.clausula_garantia_defecto).trim() !== ''
    ? String(normConfig.clausula_garantia_defecto).trim()
    : 'La garantía no cubre humedad, golpes posteriores ni manipulación por terceros. Equipos no retirados pasados los 45 días generan costos de almacenaje.';

  // Si la orden tiene su propia condición en BD, se respeta tal como fue guardada;
  // de lo contrario, se usa la cláusula general de la sucursal limpiando frases fijas de días.
  const textoGarantia = condicionOrdenDB || clausulaSucursalDB
    .replace(/^Garant[ií]a\s+de\s+\d+\s+d[ií]as\s+en\s+piezas\s+instaladas\s+y\s+mano\s+de\s+obra\.?\s*/i, '')
    .trim();

  // Finanzas y desglose
  const incidencias = Array.isArray(data.incidencias) ? data.incidencias : [];
  const repuestosAprobados = incidencias.filter(
    (i) => i.aprobado_por_cliente === true && parseFloat(i.costo_adicional_repuesto || 0) > 0
  );
  const totalRepuestos = repuestosAprobados.reduce(
    (acc, cur) => acc + parseFloat(cur.costo_adicional_repuesto || 0),
    0
  );

  const montoDescuento = parseFloat(data.monto_descuento ?? data.descuento ?? 0) || 0;
  const montoAnticipo = parseFloat(data.monto_anticipo ?? data.anticipo ?? 0) || 0;

  // Total definitivo confirmado en la orden si ya fue liquidada
  const totalRegistrado = parseFloat(
    data.costo_final_confirmado ??
    data.costo_final ??
    data.total_liquidado ??
    data.monto_total ??
    data.total ??
    0
  );

  // 1. Mano de Obra / Base:
  // Mapear prioritariamente a costo_estimado / presupuesto_base / mano_obra / costo_previsto.
  // Solo si no existe o viene en 0, toma (totalRegistrado - totalRepuestos + montoDescuento).
  const costoEstimadoProp = parseFloat(
    data.costo_estimado ??
    data.presupuesto_base ??
    data.mano_obra ??
    data.costo_previsto ??
    0
  );

  let costoEstimado = costoEstimadoProp > 0 ? costoEstimadoProp : 0;
  if (costoEstimado === 0 && totalRegistrado > 0) {
    costoEstimado = Math.max(0, totalRegistrado - totalRepuestos + montoDescuento);
  } else if (costoEstimado > 0 && totalRepuestos > 0 && Math.abs(costoEstimado - totalRegistrado) < 0.05) {
    // Si por error en BD costo_previsto o costo_estimado contiene el total definitivo (incluyendo repuestos),
    // separamos la mano de obra restando los repuestos para no duplicar.
    costoEstimado = Math.max(0, totalRegistrado - totalRepuestos + montoDescuento);
  }

  // 2. Total de la orden:
  // Exactamente costo_final || total_liquidado || (costoEstimado + totalRepuestos)
  const totalCalculado = totalRegistrado > 0
    ? totalRegistrado
    : Math.max(0, (costoEstimado + totalRepuestos) - montoDescuento);

  const balanceNeto = Math.max(0, totalCalculado - montoAnticipo);

  const tasaImpuesto = Number(data.tasa_impuesto || 18);
  const subtotal = data.desglose_impuesto?.subtotal && Math.abs(Number(data.desglose_impuesto.subtotal) + Number(data.desglose_impuesto.monto_impuesto || 0) - totalCalculado) < 0.05
    ? Number(data.desglose_impuesto.subtotal)
    : (data.subtotal && Math.abs(Number(data.subtotal) + Number(data.monto_impuesto || 0) - totalCalculado) < 0.05
        ? Number(data.subtotal)
        : Math.round((totalCalculado / (1 + (tasaImpuesto / 100))) * 100) / 100);
  const montoImpuesto = data.desglose_impuesto?.monto_impuesto && Math.abs(Number(data.desglose_impuesto.subtotal || 0) + Number(data.desglose_impuesto.monto_impuesto) - totalCalculado) < 0.05
    ? Number(data.desglose_impuesto.monto_impuesto)
    : (data.monto_impuesto && Math.abs(Number(data.subtotal || 0) + Number(data.monto_impuesto) - totalCalculado) < 0.05
        ? Number(data.monto_impuesto)
        : Math.round((totalCalculado - subtotal) * 100) / 100);

  // Bandera para condicionar el desglose fiscal: solo se muestra si tiene impuesto en la orden (> 0)
  const tieneImpuesto = Number(data?.monto_impuesto || 0) > 0;

  // 3. Pago Recibido en Entrega:
  // montoLiquidado - anticipo (o balanceNeto)
  const rawLiquidado = parseFloat(data.monto_liquidado ?? data.saldo_cobrado ?? balanceNeto);
  const pagoRecibidoEntrega = Math.max(
    0,
    rawLiquidado > balanceNeto ? rawLiquidado - montoAnticipo : rawLiquidado
  );

  const montoRecibido = parseFloat(data.monto_recibido_entrega ?? pagoRecibidoEntrega);
  const cambioDevuelto = parseFloat(data.cambio_devuelto_entrega ?? Math.max(0, montoRecibido - pagoRecibidoEntrega));
  const metodoPago = data.metodo_pago_entrega || data.metodo_pago || 'Efectivo';

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
              <span className="font-mono">RD$ {costoEstimado.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                      RD$ {parseFloat(rep.costo_adicional_repuesto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {montoDescuento > 0 && (
              <div className="flex justify-between text-neutral-700">
                <span>Descuento:</span>
                <span className="font-mono">- RD$ {montoDescuento.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {/* Subtotal e ITBIS (ÚNICAMENTE si tieneImpuesto es verdadero) */}
            {tieneImpuesto && (
              <>
                <div className="border-t border-dotted border-neutral-300 my-1" />
                <div className="flex justify-between text-neutral-700 text-[10px]">
                  <span>Subtotal:</span>
                  <span className="font-mono">RD$ {Number(subtotal || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-neutral-700 text-[10px]">
                  <span>ITBIS ({tasaImpuesto || 18}%):</span>
                  <span className="font-mono">RD$ {Number(montoImpuesto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}

            {/* TOTAL DE LA ORDEN */}
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-neutral-300 text-neutral-900">
              <span>TOTAL DE LA ORDEN:</span>
              <span className="font-mono">RD$ {Number(totalCalculado || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Anticipo Pagado (si aplica) */}
            {montoAnticipo > 0 && (
              <div className="flex justify-between text-neutral-700 text-[10px]">
                <span>Anticipo en Recepción:</span>
                <span className="font-mono">- RD$ {Number(montoAnticipo || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {/* Saldo cobrado en entrega y forma de pago */}
            <div className="pt-1.5 mt-1 border-t-2 border-dashed border-neutral-400 space-y-0.5">
              <div className="flex justify-between font-bold text-xs text-neutral-900">
                <span>PAGO RECIBIDO EN ENTREGA:</span>
                <span className="font-mono text-[12px]">RD$ {Number(pagoRecibidoEntrega || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[10px] text-neutral-700 pt-0.5">
                <span>Método de Pago:</span>
                <span className="font-semibold uppercase">{metodoPago}</span>
              </div>
              {metodoPago === 'Efectivo' && montoRecibido > 0 && (
                <>
                  <div className="flex justify-between text-[9.5px] text-neutral-600">
                    <span>Monto Recibido:</span>
                    <span className="font-mono">RD$ {Number(montoRecibido || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[9.5px] text-neutral-600">
                    <span>Cambio / Devuelta:</span>
                    <span className="font-mono">RD$ {Number(cambioDevuelto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              {textoGarantia}
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
