import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  Smartphone,
  ShieldCheck,
  Calendar,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Wrench,
  Loader2,
  Coins,
  FileText
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { getServicioById, liquidarYEntregarServicio } from '../../services/servicios.service';
import { useAuth } from '../../context/AuthContext';
import { sileo } from 'sileo';

const METODOS_PAGO = [
  { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'Transferencia', label: 'Transferencia', icon: ArrowRightLeft },
  { id: 'Tarjeta', label: 'Tarjeta', icon: CreditCard }
];

export const EntregaServicioModal = ({
  isOpen,
  onClose,
  orden,
  onSuccess
}) => {
  const { user: currentUser } = useAuth();
  const userRole = String(currentUser?.rol_nombre || currentUser?.rol || '').trim().toLowerCase();
  const isTecnico = userRole === 'tecnico' || userRole.includes('tecnic') || Number(currentUser?.rol_id) === 4;

  const [fullOrden, setFullOrden] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de cobro
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [notasEntrega, setNotasEntrega] = useState('');

  // Cargar detalles completos al abrir (para asegurar que las incidencias vengan pobladas)
  useEffect(() => {
    if (isOpen && orden?.id) {
      setIsLoadingDetails(true);
      getServicioById(orden.id)
        .then((res) => {
          if (res.ok && res.data) {
            setFullOrden(res.data);
          } else {
            setFullOrden(orden);
          }
        })
        .catch(() => setFullOrden(orden))
        .finally(() => setIsLoadingDetails(false));
    } else {
      setFullOrden(null);
      setMontoRecibido('');
      setNotasEntrega('');
      setMetodoPago('Efectivo');
    }
  }, [isOpen, orden]);

  // Cálculos financieros
  const activeOrder = fullOrden || orden;

  const finanzas = useMemo(() => {
    if (!activeOrder) {
      return {
        costoBase: 0,
        repuestosAprobados: [],
        sumaRepuestos: 0,
        montoDescuento: 0,
        montoAnticipo: 0,
        total: 0,
        balance: 0
      };
    }

    const costoBase = parseFloat(activeOrder.costo_final_confirmado) > 0
      ? parseFloat(activeOrder.costo_final_confirmado)
      : (parseFloat(activeOrder.costo_previsto) || 0);

    const incidencias = Array.isArray(activeOrder.incidencias) ? activeOrder.incidencias : [];
    const repuestosAprobados = incidencias.filter(
      (i) => i.aprobado_por_cliente === true && parseFloat(i.costo_adicional_repuesto || 0) > 0
    );
    const sumaRepuestos = repuestosAprobados.reduce(
      (acc, cur) => acc + parseFloat(cur.costo_adicional_repuesto || 0),
      0
    );

    const montoDescuento = parseFloat(activeOrder.monto_descuento) || 0;
    const montoAnticipo = parseFloat(activeOrder.monto_anticipo) || 0;

    const total = Math.max(0, (costoBase + sumaRepuestos) - montoDescuento);
    const balance = Math.max(0, total - montoAnticipo);

    return {
      costoBase,
      repuestosAprobados,
      sumaRepuestos,
      montoDescuento,
      montoAnticipo,
      total,
      balance
    };
  }, [activeOrder]);

  const hasEnteredAmount = String(montoRecibido).trim() !== '';
  const numMontoRecibido = parseFloat(montoRecibido) || 0;
  const cambio = finanzas.balance > 0 && metodoPago === 'Efectivo'
    ? Math.max(0, numMontoRecibido - finanzas.balance)
    : 0;

  // Solo se alerta de monto insuficiente si el usuario ya ingresó una cantidad
  const montoInsuficiente = finanzas.balance > 0 && hasEnteredAmount && numMontoRecibido < finanzas.balance;
  const canSubmit = finanzas.balance === 0 || (hasEnteredAmount && numMontoRecibido >= finanzas.balance);

  // Cálculo de garantía
  const diasGarantia = activeOrder?.tiempo_garantia ?? 30;
  const fechaVencimientoGarantia = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + Number(diasGarantia));
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }, [diasGarantia]);

  const handleEntregar = async (e) => {
    e.preventDefault();
    if (isTecnico) {
      sileo.error({
        title: 'Acceso Denegado',
        description: 'El perfil de Técnico no tiene autorización para realizar la entrega ni cobro de órdenes.'
      });
      return;
    }
    if (!activeOrder?.id || !canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        monto_recibido: finanzas.balance > 0 ? numMontoRecibido : 0,
        metodo_pago: finanzas.balance > 0 ? metodoPago : null,
        notas_entrega: notasEntrega.trim() || null
      };

      const res = await liquidarYEntregarServicio(activeOrder.id, payload);

      if (res.ok && res.data) {
        sileo.success({
          title: 'Equipo Entregado',
          description: `La orden #${activeOrder.codigo_ticket} fue liquidada y entregada con éxito.`
        });
        if (onSuccess) {
          onSuccess(res.data);
        }
        onClose();
      } else {
        sileo.error({
          title: 'Error en entrega',
          description: res.message || 'No se pudo procesar la entrega de la orden.'
        });
      }
    } catch (err) {
      console.error('Error al liquidar y entregar servicio:', err);
      sileo.error({
        title: 'Error de servidor',
        description: err.response?.data?.message || err.message || 'Error al liquidar el servicio.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <PackageCheck size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
              Liquidación y Entrega de Equipo
            </h3>
            <span className="text-xs text-neutral-400 font-mono font-normal">
              Ticket: {activeOrder?.codigo_ticket || '...'}
            </span>
          </div>
        </div>
      }
      bodyClassName="p-5 sm:p-6 overflow-y-auto"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {isTecnico ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isTecnico && (
            <Button
              type="submit"
              form="form-entrega-servicio"
              variant="primary"
              size="md"
              icon={PackageCheck}
              disabled={isSubmitting || isLoadingDetails || !canSubmit}
              isLoading={isSubmitting}
            >
              Confirmar Entrega y Cobro
            </Button>
          )}
        </>
      }
    >
      {isTecnico ? (
        <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3.5 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
            <AlertTriangle size={32} />
          </div>
          <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
            Acceso no autorizado
          </h4>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-md font-inter leading-relaxed">
            El perfil de Técnico no tiene autorización para realizar la entrega ni cobro de órdenes. Esta operación está reservada para SuperAdmin, Administrador de Sucursal o Secretaría.
          </p>
        </div>
      ) : isLoadingDetails && !activeOrder ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <Loader2 size={32} className="animate-spin text-red-600" />
          <p className="text-xs font-medium font-inter">Cargando datos de liquidación...</p>
        </div>
      ) : (
        <form id="form-entrega-servicio" onSubmit={handleEntregar} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* COLUMNA IZQUIERDA: Resumen del Equipo y Desglose Financiero */}
          <div className="lg:col-span-6 space-y-4">
            {/* Tarjeta Resumen: Dispositivo & Cliente */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <Smartphone size={16} className="text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-neutral-400 block font-inter text-[11px] uppercase tracking-wider">
                    Dispositivo
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-inter">
                    {activeOrder?.marca_equipo} {activeOrder?.modelo_equipo}
                  </span>
                  {activeOrder?.num_serie_imei && (
                    <span className="block text-[11px] text-neutral-400 font-mono mt-0.5">
                      S/N: {activeOrder.num_serie_imei}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User size={16} className="text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-neutral-400 block font-inter text-[11px] uppercase tracking-wider">
                    Cliente
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-inter">
                    {activeOrder?.cliente || activeOrder?.nombre_cliente || 'Cliente no registrado'}
                  </span>
                  {activeOrder?.telefono_cliente && (
                    <span className="block text-[11px] text-neutral-400 font-mono mt-0.5">
                      {activeOrder.telefono_cliente}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Desglose Financiero */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-200/90 dark:border-neutral-800 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-2">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider font-outfit flex items-center gap-1.5">
                  <Receipt size={14} className="text-neutral-400" />
                  <span>Desglose de Liquidación</span>
                </span>
              </div>

              {/* Fila: Costo Base */}
              <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 font-inter">
                <span>Costo Base / Mano de Obra:</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  RD$ {finanzas.costoBase.toFixed(2)}
                </span>
              </div>

              {/* Repuestos o Extras Aprobados */}
              {finanzas.repuestosAprobados.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 font-inter">
                    <span className="flex items-center gap-1">
                      <Wrench size={12} className="text-neutral-400" />
                      <span>Repuestos / Extras Autorizados ({finanzas.repuestosAprobados.length}):</span>
                    </span>
                    <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      + RD$ {finanzas.sumaRepuestos.toFixed(2)}
                    </span>
                  </div>
                  {finanzas.repuestosAprobados.map((rep) => (
                    <div
                      key={rep.id}
                      className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 pl-4 font-inter"
                    >
                      <span className="truncate max-w-[240px]">
                        • {rep.repuesto_requerido || rep.tipo_incidencia || 'Pieza'}
                      </span>
                      <span className="font-mono">
                        RD$ {parseFloat(rep.costo_adicional_repuesto || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Descuento Aplicado */}
              {finanzas.montoDescuento > 0 && (
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 font-inter">
                  <span>Descuento Aplicado:</span>
                  <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                    - RD$ {finanzas.montoDescuento.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Total General de la Orden */}
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200 pt-1.5 border-t border-neutral-100 dark:border-neutral-800 font-inter">
                <span>Total Liquidado de la Orden:</span>
                <span className="font-mono text-sm font-bold">
                  RD$ {finanzas.total.toFixed(2)}
                </span>
              </div>

              {/* Anticipo Previo */}
              <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 font-inter">
                <span>Anticipo Pagado en Recepción:</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  - RD$ {finanzas.montoAnticipo.toFixed(2)}
                </span>
              </div>

              {/* Tarjeta de Balance Destacado */}
              <div
                className={`mt-2 p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  finanzas.balance === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                    : 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-950 dark:text-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {finanzas.balance === 0 ? (
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Coins size={18} className="text-red-600 dark:text-red-400 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider block font-outfit">
                      {finanzas.balance === 0 ? 'Orden Saldada' : 'Balance Pendiente'}
                    </span>
                    <span className="text-[11px] opacity-80 font-inter block">
                      {finanzas.balance === 0
                        ? 'Saldo en RD$ 0.00'
                        : 'Monto restante a cobrar'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg sm:text-xl font-mono font-bold tracking-tight block">
                    RD$ {finanzas.balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Cobro, Garantía y Observaciones */}
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Formulario de Pago si resta balance */}
              {finanzas.balance > 0 ? (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider font-outfit block">
                    Detalle del Cobro de Saldo
                  </span>

                  {/* Selector de Método de Pago */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 font-inter">
                      Método de Pago
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {METODOS_PAGO.map((m) => {
                        const isSelected = metodoPago === m.id;
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMetodoPago(m.id)}
                            className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white dark:bg-neutral-800 border-red-500 dark:border-red-500 text-red-600 dark:text-red-400 shadow-2xs'
                                : 'bg-transparent border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40'
                            }`}
                          >
                            <Icon size={14} />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monto Recibido y Cambio */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 font-inter">
                        Monto Recibido <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">
                          RD$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={montoRecibido}
                          onChange={(e) => setMontoRecibido(e.target.value)}
                          placeholder="0.00"
                          className={`w-full pl-10 pr-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 transition-colors ${
                            montoInsuficiente
                              ? 'border-red-500 bg-red-50/20 text-red-700 dark:text-red-300 focus:ring-red-500/20'
                              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:border-red-500 focus:ring-red-500/20'
                          }`}
                        />
                      </div>
                      {montoInsuficiente && (
                        <p className="text-[11px] text-red-500 font-inter mt-1">
                          No cubre el balance pendiente (RD$ {finanzas.balance.toFixed(2)}).
                        </p>
                      )}
                    </div>

                    {metodoPago === 'Efectivo' && (
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 font-inter">
                          Cambio / Devuelta
                        </label>
                        <div className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 text-sm font-mono font-bold text-neutral-800 dark:text-neutral-200">
                          RD$ {cambio.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wider block font-outfit">
                      Liquidación Completa
                    </span>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-inter mt-1 leading-relaxed">
                      Esta orden no tiene saldo pendiente por cobrar. Puede proceder a registrar las observaciones finales y completar la entrega.
                    </p>
                  </div>
                </div>
              )}

              {/* Resumen de Garantía Informativa */}
              <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-2.5 text-xs">
                <ShieldCheck size={17} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-blue-900 dark:text-blue-300 font-inter">
                    Garantía del Servicio Técnico ({diasGarantia} días)
                  </span>
                  <p className="text-neutral-600 dark:text-neutral-400 font-inter text-[11px] leading-relaxed">
                    A partir de hoy, la garantía informativa vencerá el <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">{fechaVencimientoGarantia}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Observaciones o notas de entrega */}
            <div className="pt-1">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 font-inter">
                Observaciones de Entrega <span className="text-neutral-400 font-normal font-inter">(Opcional)</span>
              </label>
              <textarea
                rows={2}
                value={notasEntrega}
                onChange={(e) => setNotasEntrega(e.target.value)}
                placeholder="Ej: Se probó pantalla y carga frente al cliente, totalmente conforme..."
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-red-500 focus:ring-red-500/20 transition-colors resize-none"
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EntregaServicioModal;
