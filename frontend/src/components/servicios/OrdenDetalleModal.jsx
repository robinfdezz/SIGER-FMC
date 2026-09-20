import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  User,
  Hash,
  Wrench,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Laptop,
  Tablet,
  Watch,
  Gamepad2,
  Store,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  DollarSign,
  Package,
  ClipboardList,
  CheckCircle2,
  Image as ImageIcon,
  KeyRound,
  Unlock,
  RefreshCw,
  Flame,
  ChevronsUp,
  Equal,
  ChevronsDown,
  Clock,
  Search,
  ClipboardCheck,
  PackageCheck,
  Shield
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import SimpleButton from '../common/SimpleButton';
import { DeviceChecklistPicker } from './DeviceChecklistPicker';
import { UnlockMethodView } from '../common/PatternLock';
import { ServiceTimeline } from './ServiceTimeline';
import { getServicioById } from '../../services/servicios.service';

/**
 * Normaliza y limpia el teléfono para enlaces de WhatsApp
 */
const cleanPhoneForWa = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `1${digits}`;
  }
  return digits;
};

/**
 * Formato telefónico dominicano legible
 */
const formatPhoneLegible = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

/**
 * Formateo de fecha y hora completa
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-DO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '—';
  }
};

/**
 * Mapeo de icono según categoría de dispositivo
 */
const getCategoryIcon = (categoria = '') => {
  const norm = String(categoria).toLowerCase().trim();
  if (norm.includes('laptop') || norm.includes('portatil') || norm.includes('computadora')) {
    return Laptop;
  }
  if (norm.includes('tablet') || norm.includes('ipad')) {
    return Tablet;
  }
  if (norm.includes('watch') || norm.includes('reloj')) {
    return Watch;
  }
  if (norm.includes('consola') || norm.includes('game') || norm.includes('play')) {
    return Gamepad2;
  }
  return Smartphone;
};

/**
 * Configuración visual de la prioridad
 */
const getPrioridadConfig = (prioridad = '') => {
  switch (String(prioridad).toLowerCase().trim()) {
    case 'urgente':
      return {
        label: 'Urgente',
        color: 'danger',
        icon: <Flame size={12} className="fill-current text-rose-500" />
      };
    case 'alta':
      return {
        label: 'Alta',
        color: 'warning',
        icon: <ChevronsUp size={12} className="text-amber-500" />
      };
    case 'media':
      return {
        label: 'Media',
        color: 'info',
        icon: <Equal size={12} className="text-sky-500" />
      };
    case 'baja':
    default:
      return {
        label: 'Baja',
        color: 'neutral',
        icon: <ChevronsDown size={12} className="text-neutral-400" />
      };
  }
};

/**
 * Icono según código de estado
 */
const getEstadoIcon = (codigoEstado = '', ordenFlujo = null) => {
  const cod = String(codigoEstado).toUpperCase().trim();
  const f = Number(ordenFlujo);
  if (f === 1 || cod.includes('RECIB')) return Clock;
  if (f === 2 || cod.includes('DIAGN')) return Search;
  if (f === 3 || cod.includes('ESPERA')) return Package;
  if (f === 4 || cod.includes('REPARAC')) return Wrench;
  if (f === 5 || cod.includes('CALIDAD')) return ClipboardCheck;
  if (f === 6 || cod.includes('LISTO')) return PackageCheck;
  if (f === 7 || cod.includes('ENTREG')) return CheckCircle2;
  return Clock;
};

export const OrdenDetalleModal = ({
  isOpen,
  onClose,
  ordenId = null,
  orden = null,
  onOpenTaller = null,
  onPrintTicket = null,
  onOrderUpdated = null
}) => {
  const [detalles, setDetalles] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);

  const targetId = ordenId || orden?.id;

  // Cargar detalles completos al abrir
  useEffect(() => {
    let isMounted = true;
    if (!isOpen || !targetId) {
      setDetalles(null);
      return;
    }

    // Si ya tenemos una orden completa con historial e incidencias, usarla temporalmente
    if (orden && orden.id === targetId && Array.isArray(orden.historial_estados)) {
      setDetalles(orden);
    }

    const fetchDetalles = async () => {
      try {
        setIsLoading(true);
        const res = await getServicioById(targetId);
        if (isMounted) {
          const fetchedData = res?.data || res;
          setDetalles(fetchedData);
        }
      } catch (err) {
        console.error('Error al cargar orden detallada:', err);
        // Fallback a los datos recibidos por prop
        if (isMounted && orden) {
          setDetalles(orden);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetalles();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetId]);

  const currentOrder = detalles || orden;

  // Normalización de datos de acceso y checklist
  const parsedDatosAcceso = useMemo(() => {
    const raw = currentOrder?.datos_acceso_equipo || currentOrder?.datos_acceso;
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return { metodo: 'ninguno', valor: raw };
      }
    }
    return null;
  }, [currentOrder]);

  const seguridadInfo = useMemo(() => {
    const datos = parsedDatosAcceso?.datos_acceso || parsedDatosAcceso?.datos_acceso_equipo || parsedDatosAcceso;
    const metodo = String(datos?.metodo || datos?.tipo || 'ninguno').toLowerCase();
    const isPatron = metodo === 'patron';
    const isPin = metodo === 'pin';
    const isClave = metodo === 'password' || metodo === 'contrasena' || metodo === 'clave';
    const isSinBloqueo = !isPatron && !isPin && !isClave;

    const rawVal = datos?.valor ?? datos?.pin ?? datos?.password ?? datos?.clave ?? '';
    let valor = '';
    if (typeof rawVal === 'string' || typeof rawVal === 'number') {
      valor = String(rawVal).trim();
    } else if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
      valor = JSON.stringify(rawVal);
    }

    return {
      metodo,
      isPatron,
      isPin,
      isClave,
      isSinBloqueo,
      valor
    };
  }, [parsedDatosAcceso]);

  const parsedChecklist = useMemo(() => {
    const raw = currentOrder?.checklist_recepcion || currentOrder?.checklist_entrada || currentOrder?.checklist;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return {};
  }, [currentOrder]);

  // Construcción de la línea de tiempo cronológica unificada
  const timelineEvents = useMemo(() => {
    if (!currentOrder) return [];

    const baseEstados = Array.isArray(currentOrder.historial_estados) ? currentOrder.historial_estados : [];
    const fotosArray = Array.isArray(currentOrder.fotos_recepcion) && currentOrder.fotos_recepcion.length > 0
      ? currentOrder.fotos_recepcion
      : Array.isArray(currentOrder.fotos)
        ? currentOrder.fotos
        : [];
    const fotosEntrega = Array.isArray(currentOrder.fotos_entrega) ? currentOrder.fotos_entrega : [];

    const estadosEvents = baseEstados.map((item, idx) => {
      const isReceptionEvent =
        Number(item.orden_flujo) === 1 ||
        String(item.codigo_estado || '').toUpperCase().includes('RECIB') ||
        idx === 0;

      const isEntregaEvent =
        Number(item.orden_flujo) === 7 ||
        String(item.codigo_estado || '').toUpperCase().includes('ENTREG');

      let itemFotos = Array.isArray(item.fotos) && item.fotos.length > 0 ? item.fotos : [];
      if (itemFotos.length === 0) {
        if (isReceptionEvent) {
          itemFotos = fotosArray;
        } else if (isEntregaEvent) {
          itemFotos = fotosEntrega;
        }
      }

      return {
        ...item,
        tipo_evento: 'ESTADO',
        fotos: itemFotos,
        _timelineKey: `estado-${item.id || idx}`,
        _sortTime: new Date(item.fecha_registro || currentOrder.created_at || 0).getTime()
      };
    });

    const incidenciasEvents = (Array.isArray(currentOrder.incidencias) ? currentOrder.incidencias : []).map(
      (item, idx) => ({
        ...item,
        tipo_evento: 'INCIDENCIA',
        _timelineKey: `incidencia-${item.id || idx}`,
        _sortTime: new Date(item.fecha_registro || 0).getTime()
      })
    );

    return [...estadosEvents, ...incidenciasEvents].sort((a, b) => b._sortTime - a._sortTime);
  }, [currentOrder]);

  // Cálculos económicos
  const economia = useMemo(() => {
    if (!currentOrder) {
      return { costoBase: 0, repuestosTotal: 0, repuestosList: [], descuento: 0, anticipo: 0, total: 0, balance: 0 };
    }

    const costoBase = Number(currentOrder.costo_previsto || 0);
    const anticipo = Number(currentOrder.monto_anticipo || 0);
    const descuento = Number(currentOrder.monto_descuento || 0);

    const incidencias = Array.isArray(currentOrder.incidencias) ? currentOrder.incidencias : [];
    const repuestosList = incidencias.filter(
      (inc) => inc.repuesto_requerido && inc.aprobado_por_cliente === true
    );
    const repuestosTotal = repuestosList.reduce(
      (acc, curr) => acc + Number(curr.costo_adicional_repuesto || 0),
      0
    );

    const total = Math.max(0, costoBase + repuestosTotal - descuento);

    // Validación de estado de entrega y liquidación
    const codEstado = String(currentOrder.codigo_estado || '').toUpperCase().trim();
    const nomEstado = String(currentOrder.estado || currentOrder.nombre_estado || '').toLowerCase().trim();
    const flujoEstado = Number(currentOrder.orden_flujo || 0);

    const esEntregado = flujoEstado === 7 || codEstado.includes('ENTREG') || nomEstado.includes('entregad');
    const esCancelado = flujoEstado === 8 || codEstado.includes('CANCEL') || nomEstado.includes('cancelad');

    const montoLiquidado = Number(currentOrder.monto_liquidado || 0);

    let balance = 0;
    if (esEntregado || esCancelado) {
      balance = 0;
    } else if (montoLiquidado > 0) {
      balance = Math.max(0, total - anticipo - montoLiquidado);
    } else {
      balance = Math.max(0, total - anticipo);
    }

    return {
      costoBase,
      repuestosTotal,
      repuestosList,
      descuento,
      anticipo,
      total,
      balance,
      esEntregado
    };
  }, [currentOrder]);

  // Extracción robusta y unificada de técnicos asignados
  const listaTecnicos = useMemo(() => {
    if (!currentOrder) return [];

    // 1. Array de técnicos (objetos o strings)
    const arr = Array.isArray(currentOrder.tecnicos) && currentOrder.tecnicos.length > 0
      ? currentOrder.tecnicos
      : Array.isArray(currentOrder.tecnicos_asignados) && currentOrder.tecnicos_asignados.length > 0
        ? currentOrder.tecnicos_asignados
        : [];

    if (arr.length > 0) {
      const names = arr
        .map((t) => (typeof t === 'string' ? t : t?.nombre_completo || [t?.nombre, t?.apellido].filter(Boolean).join(' ') || t?.usuario))
        .map((s) => String(s || '').trim())
        .filter(Boolean);
      if (names.length > 0) return names;
    }

    // 2. String concatenado tecnicos_nombres
    if (currentOrder.tecnicos_nombres && String(currentOrder.tecnicos_nombres).trim() !== 'Sin asignar') {
      const splitNames = String(currentOrder.tecnicos_nombres)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (splitNames.length > 0) return splitNames;
    }

    // 3. Técnico individual
    if (currentOrder.tecnico_nombre && String(currentOrder.tecnico_nombre).trim() !== 'Sin asignar') {
      return [String(currentOrder.tecnico_nombre).trim()];
    }

    return [];
  }, [currentOrder]);

  if (!isOpen || !currentOrder) return null;

  const prioridadConfig = getPrioridadConfig(currentOrder.prioridad);
  const estadoColor = currentOrder.estado_color || '#DC2626';
  const EstadoIcon = getEstadoIcon(currentOrder.codigo_estado, currentOrder.orden_flujo);
  const estadoNombre = currentOrder.estado || currentOrder.nombre_estado || 'En Proceso';
  const formattedDate = formatDateTime(currentOrder.created_at);

  const numTecnicos = listaTecnicos.length;
  const labelTecnicos = numTecnicos > 1 ? 'Técnicos' : 'Técnico';
  const textoTecnicos = numTecnicos > 0 ? listaTecnicos.join(', ') : 'Sin asignar';

  // Desduplicación inteligente de marca y modelo
  const rawMarca = (currentOrder.marca_equipo || '').trim();
  let rawModelo = (currentOrder.modelo_equipo || '').trim();
  if (rawMarca && rawModelo.toLowerCase().startsWith(rawMarca.toLowerCase())) {
    rawModelo = rawModelo.slice(rawMarca.length).replace(/^[\s\-_/]+/, '').trim();
  }

  const customHeader = (
    <div className="p-5 sm:p-6 pb-4 shrink-0 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-1 flex-1">
        {/* Fila 1: Marca · Modelo + Badge Estado + Badge Prioridad + Garantía */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-lg sm:text-xl font-outfit leading-tight break-words inline-flex items-center flex-wrap">
            {rawMarca && (
              <span className="font-bold text-neutral-900 dark:text-white">{rawMarca}</span>
            )}
            {rawMarca && rawModelo && (
              <span className="text-neutral-300 dark:text-neutral-700 mx-1.5 font-light">·</span>
            )}
            {rawModelo && (
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{rawModelo}</span>
            )}
            {!rawMarca && !rawModelo && (
              <span className="font-bold text-neutral-900 dark:text-white">Dispositivo Sin Identificar</span>
            )}
          </h2>
          <Badge
            variant="minimal"
            size="sm"
            style={{ color: estadoColor }}
            icon={<EstadoIcon size={12} className="shrink-0 stroke-[2.2]" style={{ color: estadoColor }} />}
            className="font-medium"
          >
            {estadoNombre}
          </Badge>
          <Badge
            variant="minimal"
            color={prioridadConfig.color}
            icon={prioridadConfig.icon}
            size="sm"
            className="capitalize font-medium"
          >
            {prioridadConfig.label}
          </Badge>
          {currentOrder.es_garantia && (
            <Badge
              variant="minimal"
              color="danger"
              icon={<ShieldCheck size={11} className="stroke-[2.2] shrink-0" />}
              size="sm"
              className="font-semibold text-[10px] tracking-wide"
            >
              GARANTÍA
            </Badge>
          )}
        </div>

        {/* Fila 2: Ticket, Fecha Ingreso y Técnico/s (Limpia sin cajas redundantes) */}
        <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter mt-1">
          <span className="inline-flex items-center gap-1 font-mono font-bold text-neutral-800 dark:text-neutral-200">
            <Hash size={13} className="shrink-0 text-red-500" />
            <span>{currentOrder.codigo_ticket}</span>
          </span>
          <span className="text-neutral-300 dark:text-neutral-700 font-bold">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} className="shrink-0 text-neutral-400" />
            <span>Ingreso: {formattedDate}</span>
          </span>
          <span className="text-neutral-300 dark:text-neutral-700 font-bold">·</span>
          <span className="inline-flex items-center gap-1.5">
            <User size={13} className="shrink-0 text-neutral-400" />
            <span>{labelTecnicos}: <strong className="font-semibold text-neutral-700 dark:text-neutral-300 ml-0.5">{textoTecnicos}</strong></span>
          </span>
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
        title="Cerrar modal"
        aria-label="Cerrar"
      >
        <X size={18} />
      </button>
    </div>
  );

  const codEstado = String(currentOrder.codigo_estado || '').toUpperCase().trim();
  const nomEstado = String(currentOrder.estado || currentOrder.nombre_estado || '').toLowerCase().trim();
  const flujoEstado = Number(currentOrder.orden_flujo || 0);

  const esEstadoInactivo =
    flujoEstado === 7 ||
    flujoEstado === 8 ||
    codEstado.includes('ENTREG') ||
    codEstado.includes('CANCEL') ||
    nomEstado.includes('entregad') ||
    nomEstado.includes('cancelad');

  const canShowOpenTaller = Boolean(onOpenTaller && !esEstadoInactivo);

  const footer = canShowOpenTaller ? (
    <div className="flex items-center justify-end w-full">
      <Button
        variant="primary"
        icon={Wrench}
        size="sm"
        onClick={() => {
          onClose?.();
          onOpenTaller(currentOrder);
        }}
      >
        Abrir en Banco de Trabajo
      </Button>
    </div>
  ) : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        customHeader={customHeader}
        footer={footer}
        size="3xl"
        height="h-auto max-h-[90vh]"
        bodyClassName="p-5 sm:p-6 overflow-y-auto space-y-6"
      >
        {isLoading && !detalles ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
            <RefreshCw size={28} className="animate-spin text-red-500" />
            <p className="text-sm font-medium font-inter">Cargando detalles de la orden...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* SECCIÓN 1: Tarjeta de Cliente y Recepción */}
            <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60 dark:border-neutral-800/60">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-outfit flex items-center gap-1.5">
                  <User size={13} className="text-red-500" />
                  Información del Cliente y Recepción
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-inter flex items-center gap-1">
                  <Store size={12} className="text-neutral-400" />
                  {currentOrder.sucursal || 'Sucursal Principal'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pt-1">
                <div>
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase mb-1 block">
                    Cliente
                  </span>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {currentOrder.nombre_cliente || currentOrder.cliente_nombre || 'Cliente Ocasional'}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase mb-1 block">
                    Teléfono de Contacto
                  </span>
                  {currentOrder.telefono_cliente ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {formatPhoneLegible(currentOrder.telefono_cliente)}
                      </span>
                      <SimpleButton
                        icon={Phone}
                        variant="success"
                        size="xs"
                        onClick={() => window.open(`https://wa.me/${cleanPhoneForWa(currentOrder.telefono_cliente)}`, '_blank', 'noopener,noreferrer')}
                        title="Abrir chat en WhatsApp"
                      >
                        WhatsApp
                      </SimpleButton>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-400 italic">No registrado</p>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase mb-1 block">
                    Serial / IMEI
                  </span>
                  <p className="text-sm font-mono text-neutral-700 dark:text-neutral-300 font-medium select-all">
                    {currentOrder.num_serie_imei || 'Sin serial / IMEI'}
                  </p>
                </div>
              </div>

              {/* Falla Reportada y Observaciones */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <div>
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase mb-1 block">
                    Falla Reportada por el Cliente
                  </span>
                  <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal">
                    {currentOrder.falla_reportada || 'Sin descripción de falla.'}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase mb-1 block">
                    Observaciones y Accesorios
                  </span>
                  <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal">
                    {currentOrder.observaciones || currentOrder.observaciones_recepcion || 'Sin observaciones de entrega.'}
                  </p>
                  {currentOrder.accesorios && (
                    <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      <strong className="font-semibold text-neutral-600 dark:text-neutral-300">Accesorios:</strong> {currentOrder.accesorios}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Inspección Inicial y Seguridad */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* Checklist de Recepción */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-outfit flex items-center gap-1.5">
                  <ClipboardList size={13} className="text-red-500" />
                  Checklist Inicial de Hardware
                </span>

                <DeviceChecklistPicker
                  value={parsedChecklist}
                  readOnly={true}
                  badgeVariant="minimal"
                  showCard={false}
                  showHeader={false}
                  showSummary={true}
                />
              </div>

              {/* Seguridad / Desbloqueo */}
              <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 flex flex-col justify-between h-full">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-outfit flex items-center gap-1.5 shrink-0">
                  <KeyRound size={13} className="text-red-500" />
                  Acceso al Equipo
                </span>

                <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center w-full py-2">
                  {seguridadInfo.isPatron ? (
                    <UnlockMethodView datosAcceso={parsedDatosAcceso} />
                  ) : seguridadInfo.isPin || seguridadInfo.isClave ? (
                    <div className="flex flex-col items-center justify-center gap-2 text-center w-full">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shadow-2xs">
                        {seguridadInfo.isPin ? (
                          <Hash size={22} className="stroke-[2.2]" />
                        ) : (
                          <KeyRound size={22} className="stroke-[2]" />
                        )}
                      </div>
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 block">
                        {seguridadInfo.isPin ? 'PIN Numérico' : 'Contraseña de Acceso'}
                      </span>
                      <div
                        className="px-4 py-1.5 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-lg font-mono font-bold tracking-widest text-neutral-900 dark:text-white shadow-2xs select-all inline-block"
                        title={seguridadInfo.valor || '----'}
                      >
                        {seguridadInfo.valor || '----'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-center w-full">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
                        <Unlock size={22} className="stroke-[2]" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block font-outfit">
                          Sin Bloqueo
                        </span>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 block">
                          Acceso libre sin clave
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {Boolean(parsedDatosAcceso?.requiere_cuenta && (parsedDatosAcceso?.cuenta_adicional || parsedDatosAcceso?.usuario_cuenta)) && (
                  <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 text-[11px] space-y-0.5 shrink-0 text-left w-full">
                    <p className="font-semibold text-neutral-700 dark:text-neutral-200">
                      Cuenta: <span className="font-normal font-mono">{parsedDatosAcceso.cuenta_adicional?.usuario || parsedDatosAcceso.usuario_cuenta}</span>
                    </p>
                    <p className="font-semibold text-neutral-700 dark:text-neutral-200">
                      Clave: <span className="font-normal font-mono">{parsedDatosAcceso.cuenta_adicional?.password || parsedDatosAcceso.clave_cuenta}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 3: Resumen Económico y Repuestos */}
            <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-outfit flex items-center gap-1.5">
                <DollarSign size={13} className="text-red-500" />
                Resumen Económico y Repuestos
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/70 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase mb-1 block">
                    Presupuesto Base
                  </span>
                  <p className="text-base sm:text-lg font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    RD$ {economia.costoBase.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/70 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase mb-1 block">
                    Repuestos / Extras
                  </span>
                  <p className="text-base sm:text-lg font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    +RD$ {economia.repuestosTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/70 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase mb-1 block">
                    Anticipo Abonado
                  </span>
                  <p className="text-base sm:text-lg font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                    -RD$ {economia.anticipo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/70 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase mb-1 block">
                    Balance Pendiente
                  </span>
                  <p className="text-base sm:text-lg font-mono font-bold text-neutral-900 dark:text-white">
                    RD$ {economia.balance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {economia.repuestosList.length > 0 && (
                <div className="pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-outfit block">
                    Piezas y Repuestos Aprobados
                  </span>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-neutral-600 dark:text-neutral-400 font-outfit">
                    {economia.repuestosList.map((r, idx) => {
                      const desc = r.repuesto_requerido || r.descripcion || 'Repuesto';
                      const monto = Number(r.costo_adicional_repuesto || 0).toLocaleString('es-DO', {
                        minimumFractionDigits: 2
                      });

                      return (
                        <div key={r.id || idx} className="inline-flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="text-neutral-700 dark:text-neutral-300">{desc}</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">RD$ {monto}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 4: Línea de Tiempo y Avances en Taller */}
            <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-outfit flex items-center gap-1.5">
                <Clock size={13} className="text-red-500" />
                Historial de Avance Técnico y Evidencias
              </span>

              <ServiceTimeline
                events={timelineEvents}
                isPublic={false}
                onPhotoClick={setActivePhoto}
                maxHeight="max-h-[380px]"
                showHeader={false}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Lightbox para Ampliación de Fotos */}
      {activePhoto &&
        createPortal(
          <div
            onClick={() => setActivePhoto(null)}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-fade-in"
          >
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10"
              title="Cerrar visor"
            >
              <X size={22} />
            </button>
            <div
              className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={activePhoto}
                alt="Evidencia fotográfica ampliada"
                className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-xl"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default OrdenDetalleModal;
