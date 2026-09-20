import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Smartphone,
  KeyRound,
  FileText,
  AlertCircle,
  AlertTriangle,
  Save,
  X,
  Lock,
  Unlock,
  Hash,
  Type,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Flame,
  ChevronsUp,
  Equal,
  ChevronsDown,
  ShieldCheck,
  Loader2,
  Clock,
  Search,
  Package,
  ClipboardCheck,
  PackageCheck,
  User,
  Store,
  Wrench
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Select from '../common/Select';
import AnimatedTabs from '../common/AnimatedTabs';
import DatePicker, { getTodayString } from '../common/DatePicker';
import DeviceSecurityPicker from './DeviceSecurityPicker';
import { DeviceChecklistPicker } from './DeviceChecklistPicker';
import { updateServicio } from '../../services/servicios.service';
import { sileo } from 'sileo';

const EDIT_TABS = [
  { id: 'dispositivo', label: 'Dispositivo y Falla', icon: Smartphone },
  { id: 'seguridad', label: 'Seguridad y Acceso', icon: KeyRound },
  { id: 'prioridad', label: 'Prioridad y Observaciones', icon: FileText },
];

/**
 * Formateo de fecha y hora completa homologado
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

const getEstadoIcon = (codigoEstado = '', ordenFlujo = null) => {
  const cod = String(codigoEstado || '').toUpperCase().trim();
  const f = Number(ordenFlujo);
  if (f === 1 || cod.includes('RECIB')) return Clock;
  if (f === 2 || cod.includes('DIAGN')) return Search;
  if (f === 3 || cod.includes('ESPERA')) return Package;
  if (f === 4 || cod.includes('REPARAC')) return Wrench;
  if (f === 5 || cod.includes('CALIDAD')) return ClipboardCheck;
  if (f === 6 || cod.includes('LISTO')) return PackageCheck;
  if (f === 7 || cod.includes('ENTREG')) return CheckCircle2;
  if (f === 8 || cod.includes('CANCEL')) return AlertTriangle;
  return Clock;
};

const getEstadoColor = (orden) => {
  if (orden?.estado_color) return orden.estado_color;
  const f = Number(orden?.orden_flujo || 0);
  const cod = String(orden?.codigo_estado || '').toUpperCase().trim();
  if (f === 1 || cod.includes('RECIB')) return '#3B82F6';
  if (f === 2 || cod.includes('DIAGN')) return '#F59E0B';
  if (f === 3 || cod.includes('ESPERA')) return '#EC4899';
  if (f === 4 || cod.includes('REPARAC')) return '#8B5CF6';
  if (f === 5 || cod.includes('CALIDAD')) return '#06B6D4';
  if (f === 6 || cod.includes('LISTO')) return '#10B981';
  if (f === 7 || cod.includes('ENTREG')) return '#059669';
  if (f === 8 || cod.includes('CANCEL')) return '#EF4444';
  return '#6B7280';
};

const getEstadoLabel = (orden) => {
  return orden?.estado || orden?.nombre_estado || 'En Proceso';
};

const PRIORIDAD_OPTIONS = [
  {
    id: 'baja',
    value: 'baja',
    label: 'Baja',
    icon: <ChevronsDown size={16} className="text-neutral-500 dark:text-neutral-400 shrink-0" />
  },
  {
    id: 'media',
    value: 'media',
    label: 'Media',
    icon: <Equal size={16} className="text-blue-500 dark:text-blue-400 shrink-0" />
  },
  {
    id: 'alta',
    value: 'alta',
    label: 'Alta',
    icon: <ChevronsUp size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
  },
  {
    id: 'urgente',
    value: 'urgente',
    label: 'Urgente',
    icon: <Flame size={16} className="fill-current text-red-500 dark:text-red-400 shrink-0" />
  }
];

const inputClass =
  'w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-inter transition-colors disabled:bg-neutral-100 dark:disabled:bg-neutral-800/60 disabled:text-neutral-500 disabled:cursor-not-allowed';

const labelClass =
  'block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5';

/**
 * EditarOrdenModal
 * Modal ágil con pestañas para editar órdenes de servicio activas con reglas de permisos y fases de taller.
 */
export const EditarOrdenModal = ({ isOpen, onClose, orden, onUpdated }) => {
  const [activeTab, setActiveTab] = useState('dispositivo'); // 'dispositivo' | 'seguridad' | 'prioridad'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Formulario local
  const [form, setForm] = useState({
    // Dispositivo & Falla
    marca_equipo: '',
    modelo_equipo: '',
    num_serie_imei: '',
    falla_reportada: '',
    accesorios_recibidos: '',
    checklist_entrada: {},

    // Seguridad
    datos_acceso_equipo: { metodo: 'ninguno', tipo: 'ninguno', valor: '', patron: [] },

    // Prioridad & Notas
    prioridad: 'media',
    fecha_entrega_estimada: '',
    observaciones_recepcion: ''
  });

  // Determinar si la orden está en fase inicial (Recibido / Diagnóstico)
  const isFaseInicial = useMemo(() => {
    if (!orden) return true;
    const flujo = Number(orden.orden_flujo || 0);
    const cod = String(orden.codigo_estado || '').toUpperCase();
    return flujo <= 2 || cod === 'RECIBIDO' || cod === 'EN_DIAGNOSTICO';
  }, [orden]);

  // Cargar datos de la orden en el estado local al abrir
  useEffect(() => {
    if (isOpen && orden) {
      // Normalizar datos de acceso
      let rawAcceso = orden.datos_acceso_equipo || orden.datos_acceso || null;
      if (typeof rawAcceso === 'string') {
        try {
          rawAcceso = JSON.parse(rawAcceso);
        } catch {
          rawAcceso = { metodo: 'ninguno', valor: rawAcceso };
        }
      }

      // Normalizar checklist
      let rawChecklist = orden.checklist_entrada || orden.checklist_recepcion || {};
      if (typeof rawChecklist === 'string') {
        try {
          rawChecklist = JSON.parse(rawChecklist);
        } catch {
          rawChecklist = {};
        }
      }

      // Normalizar fecha estimada de entrega a YYYY-MM-DD
      let rawFecha = orden.fecha_entrega_estimada || orden.fecha_estimada_entrega || '';
      if (rawFecha && rawFecha.includes('T')) {
        rawFecha = rawFecha.split('T')[0];
      }

      setForm({
        marca_equipo: orden.marca_equipo || '',
        modelo_equipo: orden.modelo_equipo || '',
        num_serie_imei: orden.num_serie_imei || '',
        falla_reportada: orden.falla_reportada || '',
        accesorios_recibidos: orden.accesorios_recibidos || orden.accesorios || '',
        checklist_entrada: rawChecklist && typeof rawChecklist === 'object' ? rawChecklist : {},
        datos_acceso_equipo: rawAcceso && typeof rawAcceso === 'object'
          ? rawAcceso
          : { metodo: 'ninguno', tipo: 'ninguno', valor: '', patron: [] },
        prioridad: orden.prioridad || 'media',
        fecha_entrega_estimada: rawFecha || '',
        observaciones_recepcion: orden.observaciones_recepcion || orden.observaciones || ''
      });

      setErrors({});
      setActiveTab('dispositivo');
    }
  }, [isOpen, orden]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  // Detectar si hubo cambios respecto al objeto original
  const hasChanges = useMemo(() => {
    if (!orden) return false;

    // Normalizar accesos originales para comparación
    let origAcceso = orden.datos_acceso_equipo || orden.datos_acceso || null;
    if (typeof origAcceso === 'string') {
      try { origAcceso = JSON.parse(origAcceso); } catch { /* ignore */ }
    }
    const strOrigAcceso = JSON.stringify(origAcceso || {});
    const strNuevoAcceso = JSON.stringify(form.datos_acceso_equipo || {});

    // Checklist
    let origChecklist = orden.checklist_entrada || orden.checklist_recepcion || {};
    if (typeof origChecklist === 'string') {
      try { origChecklist = JSON.parse(origChecklist); } catch { /* ignore */ }
    }
    const strOrigChecklist = JSON.stringify(origChecklist || {});
    const strNuevoChecklist = JSON.stringify(form.checklist_entrada || {});

    // Fechas
    let origFecha = orden.fecha_entrega_estimada || orden.fecha_estimada_entrega || '';
    if (origFecha && origFecha.includes('T')) origFecha = origFecha.split('T')[0];

    const fieldsChanged =
      (form.prioridad || 'media') !== (orden.prioridad || 'media') ||
      (form.fecha_entrega_estimada || '') !== (origFecha || '') ||
      (form.observaciones_recepcion || '').trim() !== (orden.observaciones_recepcion || orden.observaciones || '').trim() ||
      strOrigAcceso !== strNuevoAcceso;

    if (isFaseInicial) {
      return (
        fieldsChanged ||
        (form.marca_equipo || '').trim() !== (orden.marca_equipo || '').trim() ||
        (form.modelo_equipo || '').trim() !== (orden.modelo_equipo || '').trim() ||
        (form.num_serie_imei || '').trim() !== (orden.num_serie_imei || '').trim() ||
        (form.falla_reportada || '').trim() !== (orden.falla_reportada || '').trim() ||
        (form.accesorios_recibidos || '').trim() !== (orden.accesorios_recibidos || orden.accesorios || '').trim() ||
        strOrigChecklist !== strNuevoChecklist
      );
    }

    return fieldsChanged;
  }, [form, orden, isFaseInicial]);

  // Validación rápida de campos
  const validateForm = () => {
    const errs = {};
    if (isFaseInicial) {
      if (!form.marca_equipo.trim()) errs.marca_equipo = 'La marca es obligatoria';
      if (!form.modelo_equipo.trim()) errs.modelo_equipo = 'El modelo es obligatorio';
      if (!form.falla_reportada.trim()) errs.falla_reportada = 'La falla reportada es obligatoria';
    }
    if (form.fecha_entrega_estimada && String(form.fecha_entrega_estimada).trim()) {
      const today = getTodayString();
      const cleanDate = String(form.fecha_entrega_estimada).trim().split('T')[0];
      if (cleanDate < today) {
        errs.fecha_entrega_estimada = 'La fecha estimada de entrega no puede ser anterior a la fecha actual';
      }
    }
    return errs;
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Si el error está en la fecha estimada, alertar y enfocar pestaña de prioridad
      if (validationErrors.fecha_entrega_estimada) {
        sileo.warning({
          title: 'Fecha inválida',
          description: validationErrors.fecha_entrega_estimada
        });
        setActiveTab('prioridad');
      } else if (validationErrors.marca_equipo || validationErrors.modelo_equipo || validationErrors.falla_reportada) {
        setActiveTab('dispositivo');
      }
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        prioridad: form.prioridad,
        fecha_entrega_estimada: form.fecha_entrega_estimada || null,
        observaciones_recepcion: form.observaciones_recepcion.trim() || null,
        datos_acceso_equipo: form.datos_acceso_equipo
      };

      if (isFaseInicial) {
        payload.marca_equipo = form.marca_equipo.trim();
        payload.modelo_equipo = form.modelo_equipo.trim();
        payload.num_serie_imei = form.num_serie_imei.trim() || null;
        payload.falla_reportada = form.falla_reportada.trim();
        payload.accesorios_recibidos = form.accesorios_recibidos.trim() || null;
        payload.checklist_entrada = form.checklist_entrada;
      }

      const res = await updateServicio(orden.id, payload);
      if (res && res.ok) {
        sileo.success({
          title: 'Orden actualizada',
          description: `Ticket #${orden.codigo_ticket} modificado exitosamente.`
        });
        if (onUpdated) {
          onUpdated(res.data || { ...orden, ...payload });
        }
        onClose();
      } else {
        sileo.error({
          title: 'Error al actualizar',
          description: res?.message || 'No se pudieron guardar los cambios de la orden.'
        });
      }
    } catch (err) {
      console.error('Error al actualizar orden:', err);
      const msg = err?.response?.data?.message || err?.message || 'Error de conexión con el servidor.';
      sileo.error({ title: 'Error', description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extracción robusta de técnicos asignados
  const listaTecnicos = useMemo(() => {
    if (!orden) return [];

    const arr = Array.isArray(orden.tecnicos) && orden.tecnicos.length > 0
      ? orden.tecnicos
      : Array.isArray(orden.tecnicos_asignados) && orden.tecnicos_asignados.length > 0
        ? orden.tecnicos_asignados
        : [];

    if (arr.length > 0) {
      const names = arr
        .map((t) => (typeof t === 'string' ? t : t?.nombre_completo || [t?.nombre, t?.apellido].filter(Boolean).join(' ') || t?.usuario))
        .map((s) => String(s || '').trim())
        .filter(Boolean);
      if (names.length > 0) return names;
    }

    if (orden.tecnicos_nombres && String(orden.tecnicos_nombres).trim() !== 'Sin asignar') {
      const splitNames = String(orden.tecnicos_nombres)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (splitNames.length > 0) return splitNames;
    }

    if (orden.tecnico_nombre && String(orden.tecnico_nombre).trim() !== 'Sin asignar') {
      return [String(orden.tecnico_nombre).trim()];
    }

    return [];
  }, [orden]);

  if (!isOpen || !orden) return null;

  const prioridadConfig = getPrioridadConfig(form.prioridad || orden.prioridad);
  const estadoColor = orden.estado_color || getEstadoColor(orden);
  const EstadoIcon = getEstadoIcon(orden.codigo_estado, orden.orden_flujo);
  const estadoLabel = getEstadoLabel(orden);
  const formattedDate = formatDateTime(orden.created_at || orden.fecha_creacion || orden.fecha_ingreso);

  const numTecnicos = listaTecnicos.length;
  const labelTecnicos = numTecnicos > 1 ? 'Técnicos' : 'Técnico';
  const textoTecnicos = numTecnicos > 0 ? listaTecnicos.join(', ') : 'Sin asignar';

  const customHeader = (
    <div className="p-5 sm:p-6 pb-4 shrink-0 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-1 flex-1">
        {/* Fila 1: Título Editar Orden + Badge Estado + Badge Prioridad + Garantía */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white font-outfit">
            Editar Orden
          </h2>
          <Badge
            variant="minimal"
            size="sm"
            style={{ color: estadoColor }}
            icon={<EstadoIcon size={12} className="shrink-0 stroke-[2.2]" style={{ color: estadoColor }} />}
            className="font-medium"
          >
            {estadoLabel}
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
          {orden.es_garantia && (
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

        {/* Fila 2: Ticket, Fecha Ingreso, Técnico/s, Sucursal */}
        <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter mt-1">
          <span className="inline-flex items-center gap-1 font-mono font-bold text-neutral-800 dark:text-neutral-200">
            <Hash size={13} className="shrink-0 text-red-500" />
            <span>{orden.codigo_ticket}</span>
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
          <span className="text-neutral-300 dark:text-neutral-700 font-bold">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Store size={13} className="shrink-0 text-neutral-400" />
            <span>{orden.sucursal || orden.nombre_sucursal || 'Principal'}</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
        title="Cerrar modal"
        aria-label="Cerrar"
      >
        <X size={18} />
      </button>
    </div>
  );

  const customFooter = (
    <div className="flex items-center justify-between w-full pt-2">
      <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-inter hidden sm:inline">
        {hasChanges ? 'Hay cambios sin guardar' : 'Sin cambios pendientes'}
      </span>
      <div className="flex items-center gap-2.5 ml-auto">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={isSubmitting ? Loader2 : Save}
          isLoading={isSubmitting}
          disabled={!hasChanges || isSubmitting}
          onClick={handleSave}
        >
          Guardar Cambios
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      customHeader={customHeader}
      footer={customFooter}
      size="3xl"
      height="h-auto max-h-[88vh]"
      bodyClassName="p-0 overflow-y-auto"
    >
      <div className="flex flex-col h-full">
        {/* ── Barra de Pestañas Superiores Homologada con AnimatedTabs ── */}
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-10">
          <AnimatedTabs
            items={EDIT_TABS}
            value={activeTab}
            onChange={(tabId) => setActiveTab(tabId)}
            className="w-full sm:w-fit"
          />
        </div>

        {/* ── Contenido de las Pestañas ── */}
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          {/* ═══════════════════════════════════════════════════
              PESTAÑA 1: DISPOSITIVO Y FALLA
          ═══════════════════════════════════════════════════ */}
          {activeTab === 'dispositivo' && (
            <div className="space-y-5 animate-fade-in">
              {!isFaseInicial && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 py-1.5 font-inter">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Campos de hardware bloqueados por fase avanzada de taller ({estadoLabel}). Solo lectura.
                  </span>
                </div>
              )}

              {/* Grid limpio de 3 columnas: Marca, Modelo, Serial / IMEI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>
                    Marca {isFaseInicial && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    disabled={!isFaseInicial}
                    value={form.marca_equipo}
                    onChange={(e) => setField('marca_equipo', e.target.value)}
                    placeholder="Ej. Apple, Samsung"
                    className={`${inputClass} ${errors.marca_equipo ? 'border-red-500 dark:border-red-500' : ''}`}
                  />
                  {errors.marca_equipo && <p className="text-[11px] text-red-500 mt-1">{errors.marca_equipo}</p>}
                </div>

                <div>
                  <label className={labelClass}>
                    Modelo {isFaseInicial && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    disabled={!isFaseInicial}
                    value={form.modelo_equipo}
                    onChange={(e) => setField('modelo_equipo', e.target.value)}
                    placeholder="Ej. iPhone 13 Pro"
                    className={`${inputClass} ${errors.modelo_equipo ? 'border-red-500 dark:border-red-500' : ''}`}
                  />
                  {errors.modelo_equipo && <p className="text-[11px] text-red-500 mt-1">{errors.modelo_equipo}</p>}
                </div>

                <div>
                  <label className={labelClass}>Serial / IMEI</label>
                  <input
                    type="text"
                    maxLength={50}
                    disabled={!isFaseInicial}
                    value={form.num_serie_imei}
                    onChange={(e) => setField('num_serie_imei', e.target.value)}
                    placeholder="Ej. 352849102948192"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Falla reportada y Accesorios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Falla Reportada por el Cliente {isFaseInicial && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    rows={3}
                    disabled={!isFaseInicial}
                    value={form.falla_reportada}
                    onChange={(e) => setField('falla_reportada', e.target.value)}
                    placeholder="Descripción detallada de la falla observada por el cliente..."
                    className={`${inputClass} resize-none ${errors.falla_reportada ? 'border-red-500 dark:border-red-500' : ''}`}
                  />
                  {errors.falla_reportada && <p className="text-[11px] text-red-500 mt-1">{errors.falla_reportada}</p>}
                </div>

                <div>
                  <label className={labelClass}>Accesorios Dejados</label>
                  <textarea
                    rows={3}
                    disabled={!isFaseInicial}
                    value={form.accesorios_recibidos}
                    onChange={(e) => setField('accesorios_recibidos', e.target.value)}
                    placeholder="Ej. Funda protectora, cable lightning, cargador original..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              {/* Checklist inicial de recepción */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <DeviceChecklistPicker
                  value={form.checklist_entrada}
                  onChange={(v) => isFaseInicial && setField('checklist_entrada', v)}
                  readOnly={!isFaseInicial}
                  showCard={true}
                  showHeader={true}
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              PESTAÑA 2: SEGURIDAD Y ACCESO
          ═══════════════════════════════════════════════════ */}
          {activeTab === 'seguridad' && (
            <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
              <DeviceSecurityPicker
                value={form.datos_acceso_equipo}
                onChange={(val) => setField('datos_acceso_equipo', val)}
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              PESTAÑA 3: PRIORIDAD Y NOTAS
          ═══════════════════════════════════════════════════ */}
          {activeTab === 'prioridad' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Nivel de Prioridad"
                    items={PRIORIDAD_OPTIONS}
                    value={form.prioridad}
                    onChange={(val) => setField('prioridad', val)}
                    placeholder="Seleccionar prioridad..."
                  />
                </div>

                <div>
                  <DatePicker
                    label="Fecha Estimada de Entrega"
                    value={form.fecha_entrega_estimada}
                    onChange={(dateStr) => setField('fecha_entrega_estimada', dateStr)}
                    placeholder="Seleccionar fecha..."
                    minDate={getTodayString()}
                    error={errors.fecha_entrega_estimada}
                    align="right"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Observaciones de Recepción</label>
                <textarea
                  rows={4}
                  value={form.observaciones_recepcion}
                  onChange={(e) => setField('observaciones_recepcion', e.target.value)}
                  placeholder="Observaciones de recepción registradas para el equipo..."
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditarOrdenModal;
