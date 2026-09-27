import React from 'react';
import logoFmcBlack from '../../assets/logo-FMC Black.png';

const formatMoney = (amount) => {
  return Number(amount || 0).toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
};

export const ReporteEjecutivoImprimible = ({
  kpis = {},
  paymentMethodsList = [],
  dateRange = {},
  sucursalNombre = 'Todas las sucursales',
  estadoFiltroLabel = 'Entregadas / Liquidadas',
  detalleData = { ordenes: [], totales: {} },
  user = {},
  companyData = null
}) => {
  const ordenes = detalleData?.ordenes || [];
  const totales = detalleData?.totales || {};

  // 1. Ingresos Totales (Total Cobrado: Liquidado + Anticipos)
  const totalFacturado = Number(
    kpis.total_facturado ??
    (kpis.total_liquidado != null || kpis.total_anticipos != null
      ? (Number(kpis.total_liquidado || 0) + Number(kpis.total_anticipos || 0))
      : (totales.suma_facturado || 0))
  );

  const totalLiquidado = Number(kpis.total_liquidado ?? (totales.suma_liquidado || 0));
  const totalAnticipos = Number(kpis.total_anticipos ?? (totales.suma_anticipo || 0));
  const totalManoObra = Number(kpis.total_mano_obra ?? (totales.suma_mano_obra || 0));

  // 2. Costo de Repuestos
  const totalRepuestos = Number(kpis.total_repuestos || 0);

  // 3. Margen Bruto (Ingresos Totales - Costo de Repuestos)
  const margenBrutoMonto = Math.max(0, totalFacturado - totalRepuestos);
  const margenBrutoPct = totalFacturado > 0 ? Math.round((margenBrutoMonto / totalFacturado) * 100) : 0;

  // 4. Conteo de Órdenes del Período
  const ordenesRecibidas = Number(
    kpis.ordenes_recibidas ?? (totales.total_items || ordenes.length || 0)
  );
  const ordenesLiquidadas = Number(kpis.ordenes_liquidadas || 0);

  // 5. Tasa de Efectividad (Entregadas / Recibidas * 100)
  const tasaEfectividad = ordenesRecibidas > 0 ? Math.round((ordenesLiquidadas / ordenesRecibidas) * 100) : 0;

  // 6. Ticket Promedio
  const ticketPromedio = Number(
    kpis.ticket_promedio ??
    (ordenesLiquidadas > 0 ? Math.round((totalFacturado / ordenesLiquidadas) * 100) / 100 : 0)
  );

  // Desglose de Métodos de Pago
  const metodosPago = kpis.metodos_pago || {};
  const montoEfectivo = Number(metodosPago.efectivo || 0);
  const montoTarjeta = Number(metodosPago.tarjeta || 0);
  const montoTransferencia = Number(metodosPago.transferencia || 0);
  const totalPagosMetodos = (montoEfectivo + montoTarjeta + montoTransferencia) || totalLiquidado;

  const now = new Date();
  const fechaEmision = now.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const horaEmision = now.toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const logoSrc = companyData?.logo_url || logoFmcBlack;
  const nombreEmpresa = companyData?.nombre_empresa || 'Franyer Mobile Center';

  return (
    <div className="bg-white text-neutral-900 p-6 max-w-[210mm] mx-auto text-xs leading-normal">
      {/* ── Encabezado Institucional con Logo ── */}
      <div className="border-b-2 border-neutral-900 pb-4 mb-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt={nombreEmpresa}
              className="h-11 max-h-12 w-auto max-w-[160px] object-contain shrink-0"
            />
            <div className="border-l border-neutral-300 pl-3 min-w-0">
              <h1 className="text-base font-bold tracking-tight text-neutral-950 uppercase leading-tight font-outfit truncate">
                {nombreEmpresa}
              </h1>
              <p className="text-[10px] font-medium text-neutral-500 font-inter mt-0.5 truncate">
                {companyData?.rnc ? `RNC: ${companyData.rnc} • ` : ''}
                {companyData?.telefono ? `Tel: ${companyData.telefono} • ` : ''}
                {companyData?.lema || 'Sistema Integral de Gestión y Control de Reparaciones'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block bg-neutral-900 text-white font-bold text-[9.5px] px-2.5 py-1 rounded tracking-wider uppercase font-mono">
              Informe Oficial
            </span>
            <span className="block text-[8.5px] text-neutral-400 mt-1 uppercase font-medium">
              SIGER-FMC • AUDITORÍA
            </span>
          </div>
        </div>

        <div className="mt-3 text-center">
          <h2 className="text-base font-bold uppercase text-neutral-900 tracking-wide font-outfit">
            Informe Ejecutivo de Operaciones y Rendimiento
          </h2>
          <p className="text-[10.5px] text-neutral-600 mt-0.5 font-inter">
            Auditoría financiera de ingresos, productividad de taller y detalle de liquidaciones
          </p>
        </div>
      </div>

      {/* ── Metadatos del Informe ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 border border-neutral-300 rounded p-3 mb-5">
        <div>
          <span className="block text-[9px] uppercase tracking-wider font-bold text-neutral-500">
            Período Analizado
          </span>
          <span className="font-semibold text-neutral-900 text-[11px]">
            {formatDateOnly(dateRange?.desde)} al {formatDateOnly(dateRange?.hasta)}
          </span>
        </div>
        <div>
          <span className="block text-[9px] uppercase tracking-wider font-bold text-neutral-500">
            Sucursal
          </span>
          <span className="font-semibold text-neutral-900 text-[11px]">
            {sucursalNombre || 'Todas las sucursales'}
          </span>
        </div>
        <div>
          <span className="block text-[9px] uppercase tracking-wider font-bold text-neutral-500">
            Filtro de Órdenes
          </span>
          <span className="font-semibold text-neutral-900 text-[11px]">
            {estadoFiltroLabel}
          </span>
        </div>
        <div>
          <span className="block text-[9px] uppercase tracking-wider font-bold text-neutral-500">
            Fecha de Emisión
          </span>
          <span className="font-semibold text-neutral-900 text-[11px]">
            {fechaEmision} {horaEmision}
          </span>
        </div>
      </div>

      {/* ── 1. Resumen Financiero y Operativo ── */}
      <div className="mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 border-b border-neutral-300 pb-1 mb-2">
          1. Resumen Financiero y Operativo
        </h3>
        <div className="grid grid-cols-3 gap-2.5 text-center">
          {/* Total Cobrado / Facturado */}
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50/50">
            <span className="block text-[9px] uppercase font-bold text-neutral-500">Total Cobrado</span>
            <span className="text-sm font-bold text-neutral-950 font-mono">RD$ {formatMoney(totalFacturado)}</span>
            <span className="block text-[9px] text-neutral-500 mt-0.5">
              Liq: RD$ {formatMoney(totalLiquidado)} | Ant: RD$ {formatMoney(totalAnticipos)}
            </span>
          </div>

          {/* Costo de Repuestos */}
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50/50">
            <span className="block text-[9px] uppercase font-bold text-neutral-500">Costo de Repuestos</span>
            <span className="text-sm font-bold text-neutral-950 font-mono">RD$ {formatMoney(totalRepuestos)}</span>
            <span className="block text-[9px] text-neutral-500 mt-0.5">
              Mano de obra: RD$ {formatMoney(totalManoObra)}
            </span>
          </div>

          {/* Margen Bruto */}
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50/50">
            <span className="block text-[9px] uppercase font-bold text-neutral-500">Margen Bruto</span>
            <span className="text-sm font-bold text-neutral-950 font-mono">
              RD$ {formatMoney(margenBrutoMonto)}{' '}
              <span className="text-[10px] font-normal text-neutral-600">({margenBrutoPct}%)</span>
            </span>
            <span className="block text-[9px] text-neutral-500 mt-0.5">
              Ingresos netos post-repuestos
            </span>
          </div>

          {/* Ticket Promedio */}
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50/50">
            <span className="block text-[9px] uppercase font-bold text-neutral-500">Ticket Promedio</span>
            <span className="text-sm font-bold text-neutral-950 font-mono">RD$ {formatMoney(ticketPromedio)}</span>
            <span className="block text-[9px] text-neutral-500 mt-0.5">
              Por orden liquidada
            </span>
          </div>

          {/* Total Órdenes */}
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50/50">
            <span className="block text-[9px] uppercase font-bold text-neutral-500">Total Órdenes</span>
            <span className="text-sm font-bold text-neutral-950">{ordenesRecibidas}</span>
            <span className="block text-[9px] text-neutral-500 mt-0.5">
              {ordenesLiquidadas} entregadas / {ordenesRecibidas} recibidas
            </span>
          </div>

          {/* Tasa de Efectividad */}
          <div className="border border-neutral-300 p-2 rounded bg-neutral-50/50">
            <span className="block text-[9px] uppercase font-bold text-neutral-500">Tasa de Efectividad</span>
            <span className="text-sm font-bold text-neutral-950">{tasaEfectividad}%</span>
            <span className="block text-[9px] text-neutral-500 mt-0.5">
              Relación entregadas / recibidas
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Desglose de Cobros por Método de Pago ── */}
      <div className="mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 border-b border-neutral-300 pb-1 mb-2">
          2. Desglose de Cobros por Método de Pago
        </h3>
        <table className="w-full border-collapse border border-neutral-300 text-[10px]">
          <thead>
            <tr className="bg-neutral-100 text-neutral-700">
              <th className="border border-neutral-300 p-1.5 text-left font-bold">Método de Pago</th>
              <th className="border border-neutral-300 p-1.5 text-right font-bold">Monto Recaudado (RD$)</th>
              <th className="border border-neutral-300 p-1.5 text-right font-bold">% del Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-300 p-1.5 font-medium">Efectivo</td>
              <td className="border border-neutral-300 p-1.5 text-right font-mono">RD$ {formatMoney(montoEfectivo)}</td>
              <td className="border border-neutral-300 p-1.5 text-right">
                {totalPagosMetodos > 0 ? Math.round((montoEfectivo / totalPagosMetodos) * 100) : 0}%
              </td>
            </tr>
            <tr>
              <td className="border border-neutral-300 p-1.5 font-medium">Tarjeta (Débito / Crédito)</td>
              <td className="border border-neutral-300 p-1.5 text-right font-mono">RD$ {formatMoney(montoTarjeta)}</td>
              <td className="border border-neutral-300 p-1.5 text-right">
                {totalPagosMetodos > 0 ? Math.round((montoTarjeta / totalPagosMetodos) * 100) : 0}%
              </td>
            </tr>
            <tr>
              <td className="border border-neutral-300 p-1.5 font-medium">Transferencia Bancaria</td>
              <td className="border border-neutral-300 p-1.5 text-right font-mono">RD$ {formatMoney(montoTransferencia)}</td>
              <td className="border border-neutral-300 p-1.5 text-right">
                {totalPagosMetodos > 0 ? Math.round((montoTransferencia / totalPagosMetodos) * 100) : 0}%
              </td>
            </tr>
            <tr className="bg-neutral-100 font-bold">
              <td className="border border-neutral-300 p-1.5 text-left uppercase">Total Recaudado</td>
              <td className="border border-neutral-300 p-1.5 text-right font-mono">RD$ {formatMoney(totalPagosMetodos)}</td>
              <td className="border border-neutral-300 p-1.5 text-right">100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 3. Detalle de Órdenes del Período ── */}
      <div className="mb-6">
        <div className="flex justify-between items-center border-b border-neutral-300 pb-1 mb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-800">
            3. Detalle de Órdenes ({ordenes.length} registradas en vista)
          </h3>
          {totales?.total_items && (
            <span className="text-[10px] text-neutral-600 font-medium">
              Total período general: {totales.total_items} órdenes
            </span>
          )}
        </div>

        <table className="w-full border-collapse border border-neutral-300 text-[9px]">
          <thead>
            <tr className="bg-neutral-100 text-neutral-800 uppercase tracking-wider text-[8.5px]">
              <th className="border border-neutral-300 p-1 text-left">Ticket</th>
              <th className="border border-neutral-300 p-1 text-center">Recepción</th>
              <th className="border border-neutral-300 p-1 text-center">Entrega</th>
              <th className="border border-neutral-300 p-1 text-left">Cliente</th>
              <th className="border border-neutral-300 p-1 text-left">Equipo</th>
              <th className="border border-neutral-300 p-1 text-left">Técnico</th>
              <th className="border border-neutral-300 p-1 text-right">Anticipo</th>
              <th className="border border-neutral-300 p-1 text-right">Liquidado</th>
              <th className="border border-neutral-300 p-1 text-right">Total Cobrado</th>
              <th className="border border-neutral-300 p-1 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.length === 0 ? (
              <tr>
                <td colSpan={10} className="border border-neutral-300 p-3 text-center text-neutral-500">
                  No hay órdenes registradas para el período seleccionado.
                </td>
              </tr>
            ) : (
              ordenes.map((o, idx) => (
                <tr key={o.id || idx} className={idx % 2 === 1 ? 'bg-neutral-50/70' : ''}>
                  <td className="border border-neutral-300 p-1 font-mono font-semibold">{o.codigo_ticket}</td>
                  <td className="border border-neutral-300 p-1 text-center">{formatDateOnly(o.fecha_recepcion)}</td>
                  <td className="border border-neutral-300 p-1 text-center">{formatDateOnly(o.fecha_entrega_real)}</td>
                  <td className="border border-neutral-300 p-1 font-medium truncate max-w-[110px]">{o.cliente_nombre || '—'}</td>
                  <td className="border border-neutral-300 p-1 truncate max-w-[110px]">{o.equipo || '—'}</td>
                  <td className="border border-neutral-300 p-1 truncate max-w-[90px]">{o.tecnico_nombre || 'Sin asignar'}</td>
                  <td className="border border-neutral-300 p-1 text-right font-mono">RD$ {formatMoney(o.monto_anticipo)}</td>
                  <td className="border border-neutral-300 p-1 text-right font-mono">RD$ {formatMoney(o.monto_liquidado)}</td>
                  <td className="border border-neutral-300 p-1 text-right font-mono font-bold">RD$ {formatMoney(o.total_cobrado)}</td>
                  <td className="border border-neutral-300 p-1 text-center">{o.nombre_estado || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
          {totales && (
            <tfoot>
              <tr className="bg-neutral-100 font-bold border-t-2 border-neutral-400">
                <td colSpan={6} className="border border-neutral-300 p-1 text-right uppercase">
                  Totales del Período ({totales.total_items || ordenes.length} órdenes):
                </td>
                <td className="border border-neutral-300 p-1 text-right font-mono">
                  RD$ {formatMoney(totales.suma_anticipo)}
                </td>
                <td className="border border-neutral-300 p-1 text-right font-mono">
                  RD$ {formatMoney(totales.suma_liquidado)}
                </td>
                <td className="border border-neutral-300 p-1 text-right font-mono font-bold">
                  RD$ {formatMoney(totales.suma_facturado)}
                </td>
                <td className="border border-neutral-300 p-1 text-center">—</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── 4. Firmas de Auditoría y Responsabilidad ── */}
      <div className="pt-6 border-t border-neutral-300 mt-6 page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-12 text-center">
          <div>
            <div className="border-b border-neutral-900 pb-1 mb-1 mx-8 h-10 flex items-end justify-center">
              <span className="text-[10px] font-medium text-neutral-500 italic">Firma del Emisor</span>
            </div>
            <span className="block font-bold text-[10px] text-neutral-900 uppercase">
              {user?.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : (user?.email || 'Administrador')}
            </span>
            <span className="block text-[9px] text-neutral-500 uppercase tracking-wider">
              {user?.rol_nombre || user?.rol || 'Responsable de Reporte'}
            </span>
          </div>

          <div>
            <div className="border-b border-neutral-900 pb-1 mb-1 mx-8 h-10 flex items-end justify-center">
              <span className="text-[10px] font-medium text-neutral-500 italic">Firma y Sello</span>
            </div>
            <span className="block font-bold text-[10px] text-neutral-900 uppercase">
              Gerencia General / Auditoría
            </span>
            <span className="block text-[9px] text-neutral-500 uppercase tracking-wider">
              Revisado y Aprobado
            </span>
          </div>
        </div>

        <div className="text-center text-[8.5px] text-neutral-400 mt-6">
          Documento generado automáticamente por SIGER-FMC. Confidencial y de uso interno exclusivo para control financiero y operativo.
        </div>
      </div>
    </div>
  );
};

export default ReporteEjecutivoImprimible;
