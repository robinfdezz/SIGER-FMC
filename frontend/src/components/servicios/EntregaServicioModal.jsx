import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  Smartphone,
  Laptop,
  Tablet,
  Gamepad2,
  Watch,
  Package,
  ShieldCheck,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  Wrench,
  Loader2,
  Coins,
  Check,
  X
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InlineConfirmButton from '../common/InlineConfirmButton';
import { AnimatedTabs } from '../common/AnimatedTabs';
import { getServicioById, liquidarYEntregarServicio } from '../../services/servicios.service';
import { getCompanyProfile, getBranches } from '../../services/configuracion.service';
import PostEntregaModal from './PostEntregaModal';
import DevicePhotoUploader from './DevicePhotoUploader';
import { useAuth } from '../../context/AuthContext';
import { sileo } from 'sileo';

const METODOS_PAGO_TABS = [
  { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'Transferencia', label: 'Transferencia', icon: ArrowLeftRight },
  { id: 'Tarjeta', label: 'Tarjeta', icon: CreditCard }
];

const getCategoryIcon = (categoria = '') => {
  const cat = String(categoria).toLowerCase();
  if (cat.includes('smart') || cat.includes('celular') || cat.includes('tel')) return Smartphone;
  if (cat.includes('lap') || cat.includes('noteb') || cat.includes('pc') || cat.includes('comput')) return Laptop;
  if (cat.includes('tab') || cat.includes('ipad')) return Tablet;
  if (cat.includes('cons') || cat.includes('jueg') || cat.includes('game')) return Gamepad2;
  if (cat.includes('reloj') || cat.includes('watch')) return Watch;
  return Package;
};

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
  const [deliveredOrder, setDeliveredOrder] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [branchData, setBranchData] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de cobro y evidencias
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [notasEntrega, setNotasEntrega] = useState('');
  const [fotosEntrega, setFotosEntrega] = useState([]);

  // Cargar datos de empresa y sucursal para la impresión térmica
  useEffect(() => {
    if (isOpen) {
      getCompanyProfile().then((r) => r.ok && setCompanyData(r.data)).catch(() => { });
      getBranches().then((r) => {
        if (!r.ok) return;
        const branches = r.data || [];
        const userBranch = branches.find((b) => b.id === currentUser?.sucursal_id) ||
          (currentUser?.sucursal_nombre ? branches.find((b) => b.nombre_sucursal === currentUser.sucursal_nombre) : null) ||
          branches[0];
        setBranchData(userBranch);
      }).catch(() => { });
    }
  }, [isOpen, currentUser?.sucursal_id, currentUser?.sucursal_nombre]);

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
      setDeliveredOrder(null);
      setMontoRecibido('');
      setNotasEntrega('');
      setMetodoPago('Efectivo');
      setFotosEntrega([]);
    }
  }, [isOpen, orden]);

  // Cálculos financieros
  const activeOrder = fullOrden || orden;
  const CategoryIcon = getCategoryIcon(activeOrder?.categoria);

  const finanzas = useMemo(() => {
    if (!activeOrder) {
      return {
        costoBase: 0,
        repuestosAprobados: [],
        sumaRepuestos: 0,
        montoDescuento: 0,
        montoAnticipo: 0,
        total: 0,
        balance: 0,
        tasaImpuesto: 18,
        subtotal: 0,
        montoImpuesto: 0
      };
    }

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

    const totalConfirmado = parseFloat(
      activeOrder.costo_final_confirmado ??
      activeOrder.costo_final ??
      activeOrder.total_liquidado ??
      activeOrder.monto_total ??
      0
    );

    const costoEstimadoRaw = parseFloat(
      activeOrder.costo_estimado ??
      activeOrder.presupuesto_base ??
      activeOrder.mano_obra ??
      activeOrder.costo_previsto ??
      0
    );

    let costoBase = costoEstimadoRaw > 0 ? costoEstimadoRaw : 0;
    if (costoBase === 0 && totalConfirmado > 0) {
      costoBase = Math.max(0, totalConfirmado - sumaRepuestos + montoDescuento);
    } else if (costoBase > 0 && sumaRepuestos > 0 && Math.abs(costoBase - totalConfirmado) < 0.05) {
      costoBase = Math.max(0, totalConfirmado - sumaRepuestos + montoDescuento);
    }

    const total = totalConfirmado > 0 && Math.abs(totalConfirmado - (costoBase + sumaRepuestos - montoDescuento)) < 0.05
      ? totalConfirmado
      : Math.max(0, (costoBase + sumaRepuestos) - montoDescuento);

    const balance = Math.max(0, total - montoAnticipo);

    const tasaImpuesto = Number(activeOrder?.tasa_impuesto || 18);
    const subtotal = activeOrder?.desglose_impuesto?.subtotal && Math.abs(Number(activeOrder.desglose_impuesto.subtotal) + Number(activeOrder.desglose_impuesto.monto_impuesto || 0) - total) < 0.05
      ? Number(activeOrder.desglose_impuesto.subtotal)
      : Math.round((total / (1 + (tasaImpuesto / 100))) * 100) / 100;
    const montoImpuesto = activeOrder?.desglose_impuesto?.monto_impuesto && Math.abs(Number(activeOrder.desglose_impuesto.subtotal || 0) + Number(activeOrder.desglose_impuesto.monto_impuesto) - total) < 0.05
      ? Number(activeOrder.desglose_impuesto.monto_impuesto)
      : Math.round((total - subtotal) * 100) / 100;

    return {
      costoBase,
      repuestosAprobados,
      sumaRepuestos,
      montoDescuento,
      montoAnticipo,
      total,
      balance,
      tasaImpuesto,
      subtotal,
      montoImpuesto
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

  // Validación previa antes de iniciar la confirmación en dos pasos
  const handleValidarAntesDeConfirmar = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isTecnico) {
      sileo.error({
        title: 'Acceso Denegado',
        description: 'El perfil de Técnico no tiene autorización para realizar la entrega ni cobro de órdenes.'
      });
      return false;
    }

    if (finanzas.balance > 0) {
      if (!hasEnteredAmount || numMontoRecibido <= 0) {
        sileo.warning({
          title: 'Monto Requerido',
          description: 'Debe ingresar el monto recibido del cliente para saldar la orden.'
        });
        return false;
      }
      if (numMontoRecibido < finanzas.balance) {
        sileo.warning({
          title: 'Monto Insuficiente',
          description: `El monto recibido (RD$ ${numMontoRecibido.toFixed(2)}) no cubre el balance pendiente (RD$ ${finanzas.balance.toFixed(2)}).`
        });
        return false;
      }
    }

    return true;
  };

  // Liquidación y entrega definitiva tras confirmar
  const handleConfirmEntrega = async (e) => {
    if (e?.preventDefault) e.preventDefault();
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
        notas_entrega: notasEntrega.trim() || null,
        fotos_entrega: fotosEntrega
      };

      const res = await liquidarYEntregarServicio(activeOrder.id, payload);

      if (res.ok && res.data) {
        sileo.success({
          title: 'Equipo Entregado',
          description: `La orden #${activeOrder.codigo_ticket} fue liquidada y entregada con éxito.`
        });
        const mergedOrder = {
          ...activeOrder,
          ...res.data,
          fecha_entrega_real: res.data.fecha_entrega_real || new Date().toISOString()
        };
        if (onSuccess) {
          onSuccess(mergedOrder);
        }
        setDeliveredOrder(mergedOrder);
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

  const handlePostEntregaClose = () => {
    setDeliveredOrder(null);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !deliveredOrder}
        onClose={onClose}
        size="3xl"
        title={
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-normal text-neutral-500 dark:text-neutral-400 font-outfit">
              Liquidación y Entrega de Equipo
            </span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
              {activeOrder?.codigo_ticket || '...'}
            </span>
          </div>
        }
        titleSlot={
          activeOrder?.es_garantia ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300/40 dark:border-amber-800/40 uppercase">
              Garantía
            </span>
          ) : null
        }
        description={
          activeOrder ? (
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter flex-wrap mt-0.5">
              <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-medium">
                <CategoryIcon size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                <span>{activeOrder.marca_equipo} {activeOrder.modelo_equipo}</span>
              </div>
              <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <User size={13} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                <span>{activeOrder.cliente || activeOrder.nombre_cliente || 'Cliente no registrado'}</span>
              </div>
            </div>
          ) : (
            'Cargando información...'
          )
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
              <InlineConfirmButton
                variant="primary"
                size="md"
                icon={PackageCheck}
                text="Confirmar Entrega y Cobro"
                confirmText="¿Confirmar entrega?"
                disabled={isSubmitting || isLoadingDetails || !canSubmit}
                isLoading={isSubmitting}
                onBeforeConfirm={handleValidarAntesDeConfirmar}
                onConfirm={handleConfirmEntrega}
              />
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
          <form id="form-entrega-servicio" onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* COLUMNA IZQUIERDA: Desglose Financiero y Balance */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
                <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block">
                  Desglose de Liquidación
                </span>

                {/* Fila: Costo Base */}
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 font-inter">
                  <span>Costo Base / Mano de Obra:</span>
                  <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    RD$ {finanzas.costoBase.toFixed(2)}
                  </span>
                </div>

                {/* Repuestos o Extras Aprobados */}
                {finanzas.repuestosAprobados.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-dashed border-neutral-200 dark:border-neutral-800">
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

                {/* Subtotal (Base Imponible) */}
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-inter">
                  <span>Subtotal (Base Imponible):</span>
                  <span className="font-mono">
                    RD$ {Number(finanzas?.subtotal || 0).toFixed(2)}
                  </span>
                </div>

                {/* ITBIS ({tasa}% incl.) */}
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-inter">
                  <span>ITBIS ({finanzas?.tasaImpuesto || 18}% incl.):</span>
                  <span className="font-mono">
                    RD$ {Number(finanzas?.montoImpuesto || 0).toFixed(2)}
                  </span>
                </div>

                {/* Total General de la Orden */}
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200 pt-2 border-t border-neutral-200/80 dark:border-neutral-800 font-inter">
                  <span>Total Liquidado de la Orden:</span>
                  <span className="font-mono text-sm font-bold text-neutral-900 dark:text-neutral-100">
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

                {/* Balance Pendiente - Fila limpia integrada */}
                <div className="pt-3 mt-1 border-t border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block">
                      {finanzas.balance === 0 ? 'Orden Saldada' : 'Balance Pendiente'}
                    </span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-inter block mt-0.5">
                      {finanzas.balance === 0 ? 'Saldo liquidado en RD$ 0.00' : 'Monto pendiente de cobro'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${finanzas.balance === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'
                      }`}>
                      RD$ {finanzas.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cargador de Evidencias de Salida / Entrega */}
              <DevicePhotoUploader
                value={fotosEntrega}
                onChange={setFotosEntrega}
                maxPhotos={4}
                title="EVIDENCIAS DE SALIDA / ENTREGA (Opcional)"
                description="Fotografías del equipo entregado conforme (pantalla encendida, empaque, etc.)"
              />
            </div>

            {/* COLUMNA DERECHA: Cobro y Observaciones */}
            <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Formulario de Pago si resta balance */}
                {finanzas.balance > 0 ? (
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3.5">
                    <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block">
                      Detalle del Cobro de Saldo
                    </span>

                    {/* Selector de Método de Pago con AnimatedTabs */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5 font-inter">
                        Método de Pago
                      </label>
                      <AnimatedTabs
                        items={METODOS_PAGO_TABS}
                        value={metodoPago}
                        onChange={setMetodoPago}
                        size="sm"
                        className="w-full [&>button]:flex-1"
                      />
                    </div>

                    {/* Monto Recibido y Cambio */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5 font-inter">
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
                            className={`w-full pl-10 pr-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 transition-colors ${montoInsuficiente
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
                          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5 font-inter">
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
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-2">
                    <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block">
                      Detalle del Cobro de Saldo
                    </span>
                    <div className="flex items-start gap-2.5 pt-1 text-xs text-neutral-600 dark:text-neutral-400 font-inter">
                      <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Esta orden no tiene saldo pendiente por cobrar. Puede proceder a registrar las observaciones finales y completar la entrega.
                      </p>
                    </div>
                  </div>
                )}

                {/* Observaciones de Entrega */}
                <div className="pt-1 space-y-1.5">
                  <label className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block font-inter">
                    Observaciones de Entrega <span className="normal-case font-normal text-neutral-400 font-inter">(Opcional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={notasEntrega}
                    onChange={(e) => setNotasEntrega(e.target.value)}
                    placeholder="Ej: Se probó pantalla y carga frente al cliente, totalmente conforme..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-red-500 focus:ring-red-500/20 transition-colors resize-none font-inter"
                  />
                </div>

                {/* Garantía Informativa Plana */}
                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-inter pt-0.5 px-0.5">
                  <ShieldCheck size={16} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <span>
                    Garantía de servicio técnico: <strong className="font-medium text-neutral-700 dark:text-neutral-300">{diasGarantia} días</strong>
                    <span className="mx-1.5 text-neutral-300 dark:text-neutral-700">·</span>
                    Vence el <strong className="font-medium text-neutral-700 dark:text-neutral-300">{fechaVencimientoGarantia}</strong>
                  </span>
                </div>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Diálogo de éxito inmediato y post-entrega con impresión de recibo */}
      <PostEntregaModal
        isOpen={Boolean(deliveredOrder)}
        onClose={handlePostEntregaClose}
        orden={deliveredOrder}
        companyData={companyData}
        branchData={branchData}
      />
    </>
  );
};

export default EntregaServicioModal;
