import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Select from '../common/Select';
import Badge from '../common/Badge';
import InlineConfirmButton from '../common/InlineConfirmButton';
import SimpleButton from '../common/SimpleButton';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  UserPlus,
  UserMinus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  Layers,
  Sparkles,
  Smartphone,
  Laptop,
  Tablet,
  Gamepad2,
  Watch,
  Package,
  Flame,
  ChevronsUp,
  Equal,
  ChevronsDown,
  Inbox,
  Minus,
  AlertTriangle,
  Search,
  Wrench,
  ClipboardCheck,
  History,
  Plus,
  Check,
  XCircle,
  MessageSquare,
  Phone,
  UserCheck,
  Pencil
} from 'lucide-react';
import { UnlockMethodView } from '../common/PatternLock';
import { stripEmojis } from '../../utils/stripEmojis';
import {
  getServicioById,
  assignTecnicoServicio,
  removeTecnicoServicio,
  createIncidenciaServicio,
  updateAprobacionIncidencia
} from '../../services/servicios.service';
import { getWorkers } from '../../services/workers.service';
import DevicePhotoUploader from '../servicios/DevicePhotoUploader';
import { sileo } from 'sileo';

const TIPOS_INCIDENCIA = [
  { value: 'Hallazgo Tecnico', label: 'Hallazgo Técnico', color: 'info' },
  { value: 'Imprevisto', label: 'Imprevisto', color: 'danger' },
  { value: 'Pieza Extra', label: 'Pieza Extra / Repuesto', color: 'warning' },
  { value: 'Aviso al Cliente', label: 'Aviso al Cliente', color: 'primary' }
];

const getIncidenciaTipoConfig = (tipo = '') => {
  switch (String(tipo)) {
    case 'Imprevisto':
      return { label: 'Imprevisto', color: 'danger', icon: AlertTriangle };
    case 'Pieza Extra':
      return { label: 'Pieza Extra', color: 'warning', icon: Wrench };
    case 'Aviso al Cliente':
      return { label: 'Aviso al Cliente', color: 'primary', icon: AlertCircle };
    case 'Hallazgo Tecnico':
    default:
      return { label: 'Hallazgo Técnico', color: 'info', icon: Search };
  }
};

const getCategoryIcon = (categoria = '') => {
  const cat = String(categoria).toLowerCase();
  if (cat.includes('smart') || cat.includes('celular') || cat.includes('tel')) return Smartphone;
  if (cat.includes('lap') || cat.includes('noteb') || cat.includes('pc') || cat.includes('comput')) return Laptop;
  if (cat.includes('tab') || cat.includes('ipad')) return Tablet;
  if (cat.includes('cons') || cat.includes('jueg') || cat.includes('game')) return Gamepad2;
  if (cat.includes('reloj') || cat.includes('watch')) return Watch;
  return Package;
};

const getPrioridadConfig = (prioridad = '') => {
  switch (String(prioridad).toLowerCase()) {
    case 'urgente':
      return {
        label: 'Urgente',
        color: 'danger',
        icon: <Flame className="fill-current" />
      };
    case 'alta':
      return {
        label: 'Alta',
        color: 'warning',
        icon: ChevronsUp
      };
    case 'media':
      return {
        label: 'Media',
        color: 'info',
        icon: Equal
      };
    case 'baja':
    default:
      return {
        label: 'Baja',
        color: 'neutral',
        icon: ChevronsDown
      };
  }
};

const formatRoleName = (rolNombre = '') => {
  const normalized = String(rolNombre).toLowerCase().replace(/[\s_-]/g, '');
  if (normalized.includes('superadmin')) return 'Super Admin';
  if (normalized.includes('admin')) return 'Admin Sucursal';
  if (normalized.includes('secretaria')) return 'Secretaria';
  if (normalized.includes('tecnic')) return 'Técnico';
  return rolNombre ? rolNombre.replace(/_/g, ' ') : 'Colaborador';
};

const getEstadoLabel = (estado) => {
  if (!estado) return '';
  const flujo = Number(estado.orden_flujo);
  const cod = (estado.codigo_estado || '').toUpperCase();
  const nom = (estado.nombre_estado || estado.estado || '').toLowerCase();

  if (flujo === 1 || cod.includes('RECIB') || nom.includes('recib')) return 'Recibido';
  if (flujo === 2 || cod.includes('DIAGN') || nom.includes('diagn')) return 'En Diagnóstico';
  if (flujo === 3 || cod.includes('ESPERA') || nom.includes('espera') || cod.includes('REPUESTO') || nom.includes('repuesto')) return 'Esperando Repuesto';
  if (flujo === 4 || cod.includes('REPARAC') || nom.includes('reparac') || cod.includes('PROCESO') || nom.includes('proceso')) return 'En Reparación';
  if (flujo === 5 || cod.includes('CALIDAD') || nom.includes('calidad') || cod.includes('CONTROL') || nom.includes('control')) return 'Control de Calidad';
  if (flujo === 6 || cod.includes('LISTO') || nom.includes('listo')) return 'Listo para Entrega';
  if (flujo === 7 || cod.includes('ENTREG') || nom.includes('entreg')) return 'Entregado';
  if (flujo === 8 || cod.includes('CANCEL') || nom.includes('cancel')) return 'Cancelado';
  return estado.nombre_estado || estado.estado || '';
};

const getEstadoIcon = (estado) => {
  const flujo = Number(estado?.orden_flujo);
  const cod = (estado?.codigo_estado || '').toUpperCase();
  const nom = (estado?.nombre_estado || estado?.estado || '').toLowerCase();

  if (flujo === 1 || cod.includes('RECIB') || nom.includes('recib')) return Package;
  if (flujo === 2 || cod.includes('DIAGN') || nom.includes('diagn')) return Search;
  if (flujo === 3 || cod.includes('ESPERA') || cod.includes('REPUESTO') || nom.includes('espera') || nom.includes('repuesto')) return Clock;
  if (flujo === 4 || cod.includes('REPARAC') || cod.includes('PROCESO') || nom.includes('reparac') || nom.includes('proceso')) return Wrench;
  if (flujo === 5 || cod.includes('CALIDAD') || cod.includes('CONTROL') || nom.includes('calidad') || nom.includes('control')) return ClipboardCheck;
  if (flujo === 6 || cod.includes('LISTO') || cod.includes('ENTREGA') || nom.includes('listo') || nom.includes('entrega')) return CheckCircle2;
  if (flujo === 7 || cod.includes('ENTREG') || nom.includes('entreg')) return CheckCircle2;
  return Package;
};

const CHECKLIST_ITEMS_DEF = [
  { key: 'enciende',       label: 'Enciende' },
  { key: 'pantalla',       label: 'Pantalla / Imagen' },
  { key: 'tactil',         label: 'Tactil' },
  { key: 'puerto_carga',   label: 'Puerto de Carga' },
  { key: 'camara_frontal', label: 'Camara Frontal' },
  { key: 'camara_trasera', label: 'Camara Trasera' },
  { key: 'auricular',      label: 'Auricular / Altavoz' },
  { key: 'microfono',      label: 'Microfono' },
  { key: 'botones',        label: 'Botones Fisicos' },
  { key: 'sim_senal',      label: 'Lector SIM / Senal' },
  { key: 'golpes_tapa',    label: 'Golpes / Tapa Trasera' },
];

const CHECKLIST_STATE_STYLES = {
  sin_revisar: {
    chip: 'bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800',
    Icon: Minus,
  },
  ok: {
    chip: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 shadow-2xs',
    Icon: CheckCircle2,
  },
  falla: {
    chip: 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-600 text-rose-700 dark:text-rose-300 shadow-2xs',
    Icon: AlertTriangle,
  },
};

const normalizeChecklistState = (val) => {
  if (val === 'ok' || val === true || val === 'funciona') return 'ok';
  if (val === 'falla' || val === false || val === 'con_falla' || val === 'danado' || val === 'dañado') return 'falla';
  return 'sin_revisar';
};

export const FichaTecnicaModal = ({
  isOpen,
  onClose,
  ordenId,
  currentUserId,
  currentUserRole,
  allEstados = [],
  onEstadoUpdated,
  onTecnicosUpdated,
  onOrderReload
}) => {
  const { user: authUser } = useAuth();
  const effectiveUserId = currentUserId || authUser?.id;
  const effectiveUserRole = currentUserRole || authUser?.rol_nombre || authUser?.rol;

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEstadoId, setSelectedEstadoId] = useState('');
  const [notaCambio, setNotaCambio] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);

  // Gestión de incidencias y hallazgos
  const [incidencias, setIncidencias] = useState([]);
  const [isReportingIncidencia, setIsReportingIncidencia] = useState(false);
  const [tipoIncidencia, setTipoIncidencia] = useState('Hallazgo Tecnico');
  const [descripcionIncidencia, setDescripcionIncidencia] = useState('');
  const [errorDescripcion, setErrorDescripcion] = useState('');
  const [repuestoRequerido, setRepuestoRequerido] = useState('');
  const [costoAdicional, setCostoAdicional] = useState('');
  const [aprobadoPorCliente, setAprobadoPorCliente] = useState(false);
  const [metodoAprobacion, setMetodoAprobacion] = useState('WhatsApp');
  const [fotosIncidencia, setFotosIncidencia] = useState([]);
  const [isSubmittingIncidencia, setIsSubmittingIncidencia] = useState(false);

  // Acción rápida de resolución (aprobación / rechazo) de incidencia
  const [resolvingInc, setResolvingInc] = useState(null);
  const [quickMetodo, setQuickMetodo] = useState('WhatsApp');
  const [isSavingAprobacion, setIsSavingAprobacion] = useState(false);

  // Gestión de colaboradores
  const [allWorkers, setAllWorkers] = useState([]);
  const [selectedColabId, setSelectedColabId] = useState('');
  const [isManagingTecnicos, setIsManagingTecnicos] = useState(false);

  useEffect(() => {
    if (isOpen && ordenId) {
      setLoading(true);
      Promise.all([
        getServicioById(ordenId),
        getWorkers().catch(() => ({ data: [] }))
      ])
        .then(([resOrden, resWorkers]) => {
          if (resOrden.ok && resOrden.data) {
            setOrden(resOrden.data);
            setIncidencias(resOrden.data.incidencias || []);
            setSelectedEstadoId(String(resOrden.data.estado_actual_id || resOrden.data.estado_id || ''));
            setNotaCambio('');
            setIsReportingIncidencia(false);
            setDescripcionIncidencia('');
            setRepuestoRequerido('');
            setCostoAdicional('');
            setAprobadoPorCliente(false);
            setMetodoAprobacion('WhatsApp');
            setResolvingInc(null);
            setFotosIncidencia([]);
          } else {
            sileo.error({ title: 'Error', description: 'No se pudo cargar la orden seleccionada.' });
            onClose();
          }

          const rawWorkers = resWorkers?.data || (Array.isArray(resWorkers) ? resWorkers : []);
          setAllWorkers(rawWorkers);
        })
        .catch(() => {
          sileo.error({ title: 'Error', description: 'Error al consultar datos.' });
          onClose();
        })
        .finally(() => setLoading(false));
    } else {
      setOrden(null);
      setIncidencias([]);
      setActivePhoto(null);
      setIsReportingIncidencia(false);
      setDescripcionIncidencia('');
      setRepuestoRequerido('');
      setCostoAdicional('');
      setAprobadoPorCliente(false);
      setMetodoAprobacion('WhatsApp');
      setResolvingInc(null);
      setFotosIncidencia([]);
    }
  }, [isOpen, ordenId]);

  if (!isOpen) return null;

  const handleCreateIncidencia = async (e) => {
    e.preventDefault();
    if (!descripcionIncidencia || !descripcionIncidencia.trim()) {
      setErrorDescripcion('La descripción del hallazgo o daño es obligatoria.');
      return;
    }
    setErrorDescripcion('');

    setIsSubmittingIncidencia(true);
    try {
      const extraCostNum = costoAdicional ? parseFloat(costoAdicional) : 0;
      const isApproved = extraCostNum > 0 ? aprobadoPorCliente : false;
      const payload = {
        tipo_incidencia: tipoIncidencia,
        descripcion: descripcionIncidencia.trim(),
        repuesto_requerido: repuestoRequerido.trim() || null,
        costo_adicional_repuesto: extraCostNum,
        aprobado_por_cliente: isApproved,
        metodo_aprobacion: isApproved ? metodoAprobacion : null,
        fotos: fotosIncidencia
      };

      const res = await createIncidenciaServicio(orden.id, payload);
      if (res.ok && res.data) {
        const tieneCostoPendiente = extraCostNum > 0 && !isApproved;
        sileo.success({
          title: 'Hallazgo Registrado',
          description: tieneCostoPendiente
            ? 'Incidencia registrada. La orden pasó automáticamente a "En Espera de Repuesto".'
            : 'La incidencia técnica fue registrada exitosamente.'
        });
        setIncidencias((prev) => [res.data, ...prev]);

        // Si la orden pasó a Espera de Repuesto automáticamente
        const estadoEspera = allEstados.find((e) => e.codigo_estado === 'ESPERA_REPUESTO');
        setOrden((prev) => {
          if (!prev) return prev;
          const nextInc = [res.data, ...(prev.incidencias || []).filter((i) => i.id !== res.data.id)];
          if (tieneCostoPendiente && estadoEspera) {
            return {
              ...prev,
              incidencias: nextInc,
              estado_actual_id: estadoEspera.id,
              estado: estadoEspera.nombre_estado,
              codigo_estado: estadoEspera.codigo_estado,
              estado_color: estadoEspera.color_badge,
              orden_flujo: estadoEspera.orden_flujo
            };
          }
          return { ...prev, incidencias: nextInc };
        });

        if (tieneCostoPendiente && estadoEspera) {
          setSelectedEstadoId(String(estadoEspera.id));
        }

        setDescripcionIncidencia('');
        setErrorDescripcion('');
        setRepuestoRequerido('');
        setCostoAdicional('');
        setAprobadoPorCliente(false);
        setMetodoAprobacion('WhatsApp');
        setFotosIncidencia([]);
        setIsReportingIncidencia(false);

        if (onOrderReload) {
          onOrderReload();
        }
      } else {
        sileo.error({
          title: 'Error al registrar',
          description: res?.message || 'No se pudo guardar la incidencia.'
        });
      }
    } catch (err) {
      console.error('Error al registrar incidencia:', err);
      sileo.error({
        title: 'Error de servidor',
        description: err.response?.data?.message || 'No se pudo registrar la incidencia.'
      });
    } finally {
      setIsSubmittingIncidencia(false);
    }
  };

  const handleResolverIncidencia = async (incId, action, metodo) => {
    setIsSavingAprobacion(true);
    const isReject = action === 'RECHAZAR';
    try {
      const payload = isReject
        ? { estado_aprobacion: 'RECHAZADO', rechazado_por_cliente: true, metodo_aprobacion: metodo || 'Llamada' }
        : { estado_aprobacion: 'APROBADO', aprobado_por_cliente: true, metodo_aprobacion: metodo || 'WhatsApp' };

      const res = await updateAprobacionIncidencia(orden.id, incId, payload);
      if (res.ok && res.data) {
        sileo.success({
          title: isReject ? 'Presupuesto Rechazado' : 'Presupuesto Aprobado',
          description: isReject
            ? `Se registró el rechazo del cliente vía ${metodo || 'Llamada'}. El costo adicional ha sido descartado.`
            : `La aprobación vía ${metodo || 'WhatsApp'} fue registrada exitosamente.`
        });
        setIncidencias((prev) => prev.map((item) => (item.id === incId ? res.data : item)));
        setOrden((prev) => {
          if (!prev) return prev;
          const updatedIncidencias = (prev.incidencias || []).map((item) => (item.id === incId ? res.data : item));
          return { ...prev, incidencias: updatedIncidencias };
        });
        setResolvingInc(null);
        if (onOrderReload) {
          onOrderReload();
        }
      } else {
        sileo.error({
          title: 'Error al registrar resolución',
          description: res?.message || 'No se pudo actualizar el estado.'
        });
      }
    } catch (err) {
      console.error('Error al actualizar resolución de incidencia:', err);
      sileo.error({
        title: 'Error de servidor',
        description: err.response?.data?.message || 'No se pudo registrar la resolución.'
      });
    } finally {
      setIsSavingAprobacion(false);
    }
  };

  const handleUpdateEstado = async (e) => {
    e.preventDefault();
    if (!selectedEstadoId) return;

    if (String(selectedEstadoId) === String(orden.estado_actual_id)) {
      sileo.info({ title: 'Mismo estado', description: 'La orden ya se encuentra en este estado.' });
      return;
    }

    const targetEstado = allEstados.find((est) => String(est.id) === String(selectedEstadoId));
    const esEstadoOperativo = targetEstado && targetEstado.codigo_estado !== 'RECIBIDO' && Number(targetEstado.orden_flujo) !== 1;
    const tieneTecnicos = Array.isArray(orden?.tecnicos) && orden.tecnicos.length > 0;

    if (esEstadoOperativo && !tieneTecnicos) {
      sileo.warning({
        title: 'Técnico requerido',
        description: 'Debe asignar al menos un técnico responsable a la orden antes de avanzar de estado.'
      });
      return;
    }

    // Regla de Negocio: Bloqueo defensivo por costos adicionales pendientes
    const esEstadoAvance = targetEstado && (
      ['EN_REPARACION', 'CONTROL_CALIDAD', 'LISTO_ENTREGA', 'ENTREGADO'].includes(targetEstado.codigo_estado) ||
      (Number(targetEstado.orden_flujo) >= 4 && Number(targetEstado.orden_flujo) <= 7)
    );
    if (esEstadoAvance && hasPendingCosts) {
      sileo.warning({
        title: 'Costo adicional pendiente',
        description: `No se puede avanzar la orden a "${targetEstado.nombre_estado}" porque existen ${pendingCostIncidencias.length} repuesto(s)/costo(s) pendiente(s) de aprobación por el cliente (RD$ ${totalCostoPendiente.toFixed(2)}). Resuelva el presupuesto en la sección de incidencias primero.`
      });
      return;
    }

    setIsUpdating(true);
    try {
      if (onEstadoUpdated) {
        await onEstadoUpdated(orden.id, parseInt(selectedEstadoId), notaCambio);
      }
      onClose();
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      sileo.error({
        title: 'Error al cambiar estado',
        description: err.response?.data?.message || err.message || 'No se pudo actualizar el estado de la orden.'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Asignar técnico colaborador
  const handleAddTecnico = async (targetId) => {
    if (!targetId) return;
    setIsManagingTecnicos(true);
    try {
      const res = await assignTecnicoServicio(orden.id, targetId);
      if (res.ok && res.data) {
        sileo.success({ title: 'Técnico asignado', description: res.message });
        setOrden((prev) => ({
          ...prev,
          tecnicos: res.data.tecnicos
        }));
        setSelectedColabId('');
        if (onTecnicosUpdated) {
          onTecnicosUpdated(orden.id, res.data.tecnicos);
        }
      }
    } catch (err) {
      console.error('Error al asignar colaborador:', err);
      sileo.error({
        title: 'Error',
        description: err.response?.data?.message || 'No se pudo asignar el técnico.'
      });
    } finally {
      setIsManagingTecnicos(false);
    }
  };

  // Remover técnico colaborador
  const handleRemoveTecnico = async (tecnicoId) => {
    const tecnicosActuales = Array.isArray(orden?.tecnicos) ? orden.tecnicos : [];
    const ordenFlujoActual = Number(orden?.orden_flujo || 1);
    const esEstadoPosterior = orden?.codigo_estado !== 'RECIBIDO' && ordenFlujoActual > 1;

    if (esEstadoPosterior && tecnicosActuales.length <= 1) {
      sileo.warning({
        title: 'Acción bloqueada',
        description: 'No se puede desasignar al único técnico mientras la orden esté en proceso. Asigne otro técnico primero o regrese la orden a Recibido.'
      });
      return;
    }

    setIsManagingTecnicos(true);
    try {
      const res = await removeTecnicoServicio(orden.id, tecnicoId);
      if (res.ok && res.data) {
        sileo.success({ title: 'Técnico desvinculado', description: res.message });
        setOrden((prev) => ({
          ...prev,
          tecnicos: res.data.tecnicos
        }));
        if (onTecnicosUpdated) {
          onTecnicosUpdated(orden.id, res.data.tecnicos);
        }
      }
    } catch (err) {
      console.error('Error al remover colaborador:', err);
      sileo.error({
        title: 'Error',
        description: err.response?.data?.message || 'No se pudo desvincular el técnico.'
      });
    } finally {
      setIsManagingTecnicos(false);
    }
  };

  const rawChecklist = orden?.checklist_recepcion || orden?.checklist_entrada;
  let checklistData = null;
  if (rawChecklist) {
    if (typeof rawChecklist === 'object') {
      checklistData = rawChecklist;
    } else if (typeof rawChecklist === 'string') {
      try {
        const parsed = JSON.parse(rawChecklist);
        if (typeof parsed === 'object' && parsed !== null) {
          checklistData = parsed;
        }
      } catch {
        checklistData = null;
      }
    }
  }

  const checklistDisplayItems = [];
  if (checklistData && typeof checklistData === 'object') {
    CHECKLIST_ITEMS_DEF.forEach((item) => checklistDisplayItems.push(item));
    Object.keys(checklistData).forEach((k) => {
      if (!checklistDisplayItems.some((it) => it.key === k)) {
        checklistDisplayItems.push({ key: k, label: k.replace(/_/g, ' ') });
      }
    });
  }

  const countOk = checklistDisplayItems.filter(
    ({ key }) => normalizeChecklistState(checklistData?.[key]) === 'ok'
  ).length;
  const countFalla = checklistDisplayItems.filter(
    ({ key }) => normalizeChecklistState(checklistData?.[key]) === 'falla'
  ).length;
  const countPendientes = checklistDisplayItems.filter(
    ({ key }) => normalizeChecklistState(checklistData?.[key]) === 'sin_revisar'
  ).length;
  const fotosArray = (orden?.fotos || []).filter(
    (f) => !f.incidencia_id && (f.tipo_evidencia === 'RECEPCION' || !f.tipo_evidencia || f.tipo_evidencia !== 'INCIDENCIA')
  );
  const tecnicosList = Array.isArray(orden?.tecnicos) ? orden.tecnicos : [];
  const isCurrentUserAssigned = tecnicosList.some((t) => t.id === effectiveUserId);

  // Incidencias con costo adicional pendientes de aprobación
  const incidenciasList = Array.isArray(incidencias) && incidencias.length > 0
    ? incidencias
    : (Array.isArray(orden?.incidencias) ? orden.incidencias : []);

  const pendingCostIncidencias = incidenciasList.filter(
    (inc) =>
      Number(inc.costo_adicional_repuesto) > 0 &&
      inc.aprobado_por_cliente !== true &&
      !inc.fecha_aprobacion
  );
  const hasPendingCosts = pendingCostIncidencias.length > 0;
  const totalCostoPendiente = pendingCostIncidencias.reduce(
    (acc, c) => acc + Number(c.costo_adicional_repuesto || 0),
    0
  );

  const selectedEstadoObj = allEstados.find((est) => String(est.id) === String(selectedEstadoId));
  const isSelectedAvance = selectedEstadoObj && (
    ['EN_REPARACION', 'CONTROL_CALIDAD', 'LISTO_ENTREGA', 'ENTREGADO'].includes(selectedEstadoObj.codigo_estado) ||
    (Number(selectedEstadoObj.orden_flujo) >= 4 && Number(selectedEstadoObj.orden_flujo) <= 7)
  );
  const isSelectedEstadoBlocked = hasPendingCosts && isSelectedAvance;

  // Roles que no pueden operar como técnicos en taller
  const rolesNoTecnicos = ['secretaria', 'recepcionista', 'recepcion', 'cajero'];
  const normalizedUserRole = String(effectiveUserRole || '').toLowerCase();
  const isAdministrativeOrReception = rolesNoTecnicos.some((r) => normalizedUserRole.includes(r));
  const canSelfAssign = !isCurrentUserAssigned && !isAdministrativeOrReception;

  // Técnicos disponibles para agregar que no estén ya asignados, no sean secretaría/recepción y pertenezcan a la sucursal de la orden
  const availableWorkersToAdd = allWorkers.filter((w) => {
    if (!w.activo) return false;
    if (tecnicosList.some((t) => t.id === w.id)) return false;

    // Excluir roles de secretaría / recepción / administrativo
    const wRole = String(w.rol_nombre || w.nombre_rol || w.rol || '').toLowerCase();
    if (rolesNoTecnicos.some((r) => wRole.includes(r))) {
      return false;
    }

    // Si la orden tiene sucursal definida, verificar que el trabajador pertenezca a la misma sucursal (o tenga sucursal nula/global)
    if (orden?.sucursal_id && w.sucursal_id) {
      return Number(w.sucursal_id) === Number(orden.sucursal_id);
    }
    return true;
  });

  const workerSelectItems = availableWorkersToAdd.map((w) => ({
    id: String(w.id),
    value: String(w.id),
    label: `${w.nombre} ${w.apellido}`,
    supportingText: formatRoleName(w.rol_nombre || w.nombre_rol || w.rol),
    avatarUrl: w.foto_perfil_url || undefined
  }));

  const estadoSelectItems = allEstados.map((est) => {
    const isAvance =
      ['EN_REPARACION', 'CONTROL_CALIDAD', 'LISTO_ENTREGA', 'ENTREGADO'].includes(est.codigo_estado) ||
      (Number(est.orden_flujo) >= 4 && Number(est.orden_flujo) <= 7);
    const isBlocked = hasPendingCosts && isAvance;

    return {
      id: String(est.id),
      value: String(est.id),
      label: getEstadoLabel(est),
      disabled: isBlocked,
      icon: est.color_badge ? (
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: est.color_badge }}
        />
      ) : null
    };
  });

  const CategoryIcon = getCategoryIcon(orden?.categoria);
  const priorityConfig = getPrioridadConfig(orden?.prioridad);
  const PriorityIcon = priorityConfig.icon;

  const currentEstadoObj = (allEstados || []).find(
    (e) => String(e.id) === String(orden?.estado_actual_id || orden?.estado_id) || e.codigo_estado === orden?.codigo_estado
  ) || {
    orden_flujo: orden?.orden_flujo,
    codigo_estado: orden?.codigo_estado,
    nombre_estado: orden?.estado
  };
  const CurrentEstadoIcon = getEstadoIcon(currentEstadoObj);
  const currentEstadoColor = orden?.estado_color || currentEstadoObj.color_badge || '#6B7280';
  const currentEstadoLabel = getEstadoLabel(currentEstadoObj);

  const rawHistorial = Array.isArray(orden?.historial_estados) && orden.historial_estados.length > 0
    ? orden.historial_estados
    : [];

  const baseEstados = rawHistorial.length > 0
    ? rawHistorial
    : [
        {
          id: 'inicio',
          estado_id: orden?.estado_actual_id || orden?.estado_id,
          nombre_estado: orden?.estado || 'Recibido en Taller',
          codigo_estado: orden?.codigo_estado,
          color_badge: orden?.estado_color,
          orden_flujo: orden?.orden_flujo || 1,
          usuario_nombre: orden?.recepcionista || 'Recepción',
          nota_cambio: orden?.observaciones_recepcion || orden?.observaciones || null,
          fecha_registro: orden?.created_at,
          fotos: fotosArray
        }
      ];

  // Eventos de cambios de estado
  const estadosEvents = baseEstados.map((item, idx) => ({
    ...item,
    tipo_evento: 'ESTADO',
    _timelineKey: `estado-${item.id || idx}`,
    _sortTime: new Date(item.fecha_registro || orden?.created_at || 0).getTime()
  }));

  // Eventos de incidencias y hallazgos técnicos
  const incidenciasEvents = (Array.isArray(incidencias) ? incidencias : []).map((item, idx) => ({
    ...item,
    tipo_evento: 'INCIDENCIA',
    _timelineKey: `incidencia-${item.id || idx}`,
    _sortTime: new Date(item.fecha_registro || 0).getTime()
  }));

  // Unificación cronológica descendente (de lo más reciente a lo más antiguo)
  const timelineEvents = [...estadosEvents, ...incidenciasEvents].sort(
    (a, b) => b._sortTime - a._sortTime
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        height="h-[85vh] sm:h-[90vh]"
        title={
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-normal text-neutral-500 dark:text-neutral-400 font-outfit">Ficha Técnica</span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100 font-outfit">{orden?.codigo_ticket || '...'}</span>
          </div>
        }
        titleSlot={
          orden?.es_garantia ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300/40 dark:border-amber-800/40 uppercase">
              Garantía
            </span>
          ) : null
        }
        description={
          orden ? (
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter flex-wrap mt-0.5">
              <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-medium">
                <CategoryIcon size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                <span>{orden.marca_equipo} {orden.modelo_equipo}</span>
              </div>
              <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                <User size={13} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                <span>{orden.cliente || orden.nombre_cliente}</span>
              </div>
            </div>
          ) : (
            'Cargando información...'
          )
        }
        bodyClassName="p-5 overflow-y-auto space-y-6"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-actualizar-estado"
              variant="primary"
              size="md"
              disabled={
                isUpdating ||
                !orden ||
                String(selectedEstadoId) === String(orden?.estado_actual_id) ||
                isSelectedEstadoBlocked
              }
              isLoading={isUpdating}
              onClick={(e) => {
                e.preventDefault();
                handleUpdateEstado(e);
              }}
            >
              Guardar Cambio
            </Button>
          </>
        }
      >
        {loading || !orden ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-red-600" />
              <p className="text-sm font-medium text-neutral-500">Cargando expediente de taller...</p>
            </div>
          ) : (
            <>
              {/* Resumen Superior: Dispositivo y Seguridad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Info Dispositivo */}
                <div className="sm:col-span-2 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
                  <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block">
                    Datos del Dispositivo
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                        Marca / Modelo
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 font-inter block leading-normal">
                        {orden.marca_equipo} {orden.modelo_equipo}
                      </span>
                    </div>
                    <div>
                      <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                        IMEI / N° de Serie
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 font-inter tabular-nums tracking-wide block leading-normal">
                        {orden.num_serie_imei || 'No especificado'}
                      </span>
                    </div>
                    <div>
                      <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                        Prioridad
                      </span>
                      <div className="flex items-center leading-normal">
                        <Badge
                          variant="minimal"
                          color={priorityConfig.color}
                          icon={PriorityIcon}
                          size="md"
                          className="capitalize font-semibold !text-sm sm:!text-base !px-0"
                        >
                          {priorityConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                        Fecha de Ingreso
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 font-inter tabular-nums block leading-normal">
                        {orden.created_at ? new Date(orden.created_at).toLocaleDateString('es-DO') : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Seguridad (PIN / Patrón de desbloqueo) */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 flex flex-col items-center justify-between text-center gap-2">
                  <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                    Acceso al Equipo
                  </span>
                  <div className="my-auto py-1 w-full flex items-center justify-center">
                    <UnlockMethodView datosAcceso={orden.datos_acceso_equipo} />
                  </div>
                </div>
              </div>

              {/* Formulario de Transición de Estado */}
              <form
                id="form-actualizar-estado"
                onSubmit={handleUpdateEstado}
                className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-red-500" />
                    <span>Actualizar Estado Técnico</span>
                  </span>
                  <Badge
                    variant="minimal"
                    size="sm"
                    showDot={false}
                    icon={<CurrentEstadoIcon size={12} className="shrink-0 stroke-[2.2]" style={{ color: currentEstadoColor }} />}
                    className="font-medium"
                    style={{ color: currentEstadoColor }}
                  >
                    {currentEstadoLabel}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <Select
                      label="Nuevo Estado"
                      value={selectedEstadoId}
                      onChange={(val) => setSelectedEstadoId(val)}
                      items={estadoSelectItems}
                      placeholder="Seleccionar nuevo estado..."
                      placement="bottom"
                    />
                    {isSelectedEstadoBlocked && (
                      <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-inter">
                        <AlertTriangle size={12} className="shrink-0 stroke-[2.5]" />
                        <span>Estado no permitido mientras existan costos adicionales sin resolver.</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium font-inter text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Nota de Avance / Diagnóstico <span className="text-neutral-400 font-normal font-inter">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={notaCambio}
                      onChange={(e) => setNotaCambio(stripEmojis(e.target.value, false))}
                      placeholder="Ej: Se reemplazó conector de carga..."
                      className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-red-500 focus:ring-red-500/20 transition-colors"
                    />
                  </div>
                </div>
              </form>

              {/* Sección de Incidencias y Hallazgos Técnicos */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-outfit">
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    <span>Incidencias y Hallazgos Técnicos</span>
                    <strong className="text-neutral-700 dark:text-neutral-300 font-bold ml-1">
                      {incidencias.length}
                    </strong>
                  </span>

                  <Button
                    type="button"
                    variant={isReportingIncidencia ? 'secondary' : 'primary'}
                    size="sm"
                    icon={isReportingIncidencia ? X : Plus}
                    onClick={() => {
                      setIsReportingIncidencia((prev) => !prev);
                      setErrorDescripcion('');
                    }}
                    className="h-8 px-3 text-xs font-semibold"
                  >
                    {isReportingIncidencia ? 'Cancelar' : 'Reportar Hallazgo'}
                  </Button>
                </div>

                {/* Formulario colapsable para reportar incidencia */}
                {isReportingIncidencia && (
                  <form
                    onSubmit={handleCreateIncidencia}
                    noValidate
                    className="p-4 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-4"
                  >
                    {/* Fila 1: Tipo de Incidencia, Repuesto Requerido y Costo Adicional en la misma línea */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                      <div>
                        <Select
                          label="Tipo de Incidencia"
                          isRequired
                          value={tipoIncidencia}
                          onChange={(val) => setTipoIncidencia(val)}
                          items={TIPOS_INCIDENCIA.map((t) => ({ value: t.value, label: t.label }))}
                          placeholder="Seleccionar tipo..."
                          placement="bottom"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium font-inter text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Repuesto Requerido <span className="text-neutral-400 font-normal font-inter">(Opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={repuestoRequerido}
                          onChange={(e) => setRepuestoRequerido(stripEmojis(e.target.value, false))}
                          placeholder="Ej: Pantalla OLED, Batería, Flex..."
                          className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-red-500 focus:ring-red-500/20 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium font-inter text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Costo Adicional <span className="text-neutral-400 font-normal font-inter">(RD$ - Opcional)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={costoAdicional}
                          onChange={(e) => setCostoAdicional(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-red-500 focus:ring-red-500/20 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Bloque condicional de Autorización del Cliente (Solo si hay Costo Adicional) */}
                    {parseFloat(costoAdicional || 0) > 0 && (
                      <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-150">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={aprobadoPorCliente}
                            onChange={(e) => setAprobadoPorCliente(e.target.checked)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-150 border ${
                              aprobadoPorCliente
                                ? 'bg-red-600 border-red-600 shadow-2xs text-white ring-2 ring-red-500/20'
                                : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 group-hover:border-red-400 dark:group-hover:border-red-500/60'
                            }`}
                          >
                            {aprobadoPorCliente && (
                              <Check size={11} strokeWidth={3} className="text-white animate-in zoom-in-75 duration-150" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 font-inter flex items-center gap-1.5">
                            <ShieldCheck
                              size={13}
                              className={aprobadoPorCliente ? 'text-red-500 shrink-0' : 'text-neutral-400 shrink-0'}
                            />
                            <span>¿Autorizado previamente por el cliente?</span>
                          </span>
                        </label>

                        {aprobadoPorCliente && (
                          <div className="inline-flex items-center p-0.5 rounded-md bg-neutral-200/60 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-700/60 animate-in fade-in duration-150">
                            {[
                              { id: 'Llamada', label: 'Llamada', icon: Phone },
                              { id: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
                              { id: 'Presencial', label: 'Presencial', icon: UserCheck }
                            ].map((m) => {
                              const isSel = metodoAprobacion === m.id;
                              const MIcon = m.icon;
                              return (
                                <button
                                  type="button"
                                  key={m.id}
                                  onClick={() => setMetodoAprobacion(m.id)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs transition-all cursor-pointer ${
                                    isSel
                                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium shadow-2xs'
                                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                                  }`}
                                >
                                  <MIcon
                                    size={12}
                                    className={
                                      isSel
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-neutral-400 dark:text-neutral-500'
                                    }
                                  />
                                  <span>{m.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fila 2: Descripción del Hallazgo / Daño debajo de los 3 */}
                    <div>
                      <label className="block text-xs font-medium font-inter text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Descripción del Hallazgo / Daño <span className="text-red-500 ml-1">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={descripcionIncidencia}
                        onChange={(e) => {
                          setDescripcionIncidencia(stripEmojis(e.target.value, false));
                          if (errorDescripcion) setErrorDescripcion('');
                        }}
                        placeholder="Describe detalladamente el daño no previsto, anomalía detectada o hallazgo técnico..."
                        className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors resize-none leading-relaxed font-inter ${
                          errorDescripcion
                            ? 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                        }`}
                      />
                      {errorDescripcion && (
                        <p className="text-[11px] text-red-500 mt-1.5 font-inter flex items-center gap-1 animate-in fade-in duration-150">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{errorDescripcion}</span>
                        </p>
                      )}
                    </div>

                    {/* Cargador de Evidencias Fotográficas */}
                    <div>
                      <DevicePhotoUploader
                        value={fotosIncidencia}
                        onChange={setFotosIncidencia}
                        maxPhotos={4}
                        title="Evidencias Fotográficas del Hallazgo"
                        description="Sube hasta 4 fotos que evidencien el daño o repuesto requerido. Máx 5MB c/u."
                        className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/70"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsReportingIncidencia(false)}
                        disabled={isSubmittingIncidencia}
                        className="h-8 px-3.5 text-xs font-medium"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isSubmittingIncidencia}
                        isLoading={isSubmittingIncidencia}
                        className="h-8 px-3.5 text-xs font-semibold"
                      >
                        Registrar Incidencia
                      </Button>
                    </div>
                  </form>
                )}

                {/* Listado de Incidencias Registradas */}
                {incidencias.length === 0 ? (
                  !isReportingIncidencia && (
                    <div className="py-5 px-4 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 flex flex-col items-center justify-center gap-1.5 text-center select-none shadow-2xs">
                      <Inbox size={22} className="text-neutral-400 dark:text-neutral-500 stroke-[1.75]" />
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-inter">
                        No se han reportado incidencias ni hallazgos técnicos en esta orden.
                      </span>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {incidencias.map((inc) => {
                      const config = getIncidenciaTipoConfig(inc.tipo_incidencia);
                      const IconComponent = config.icon;
                      const extraCost = parseFloat(inc.costo_adicional_repuesto || 0);
                      const fotosList = Array.isArray(inc.fotos) ? inc.fotos : [];

                      return (
                        <div
                          key={inc.id}
                          className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] shadow-2xs space-y-3"
                        >
                          {/* Fila superior: Tipo, Autor, Fecha */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800/80 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="minimal"
                                color={config.color}
                                icon={IconComponent}
                                size="sm"
                                className="font-semibold text-xs"
                              >
                                {config.label}
                              </Badge>
                              {inc.usuario_nombre && (
                                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-inter flex items-center gap-1">
                                  <User size={12} className="shrink-0 text-neutral-400" />
                                  <span>{inc.usuario_nombre}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-inter tabular-nums">
                              {inc.fecha_registro
                                ? new Date(inc.fecha_registro).toLocaleString('es-DO', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })
                                : '—'}
                            </span>
                          </div>

                          {/* Descripción */}
                          <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 font-inter whitespace-pre-wrap leading-relaxed">
                            {inc.descripcion}
                          </p>

                          {/* Fila opcional: Repuesto, Costo adicional y Estado de Aprobación */}
                          {(inc.repuesto_requerido || extraCost > 0) && (() => {
                            const incIsAprobado = inc.aprobado_por_cliente === true || inc.estado_aprobacion === 'APROBADO';
                            const incIsRechazado = inc.rechazado_por_cliente === true || inc.estado_aprobacion === 'RECHAZADO' || (!inc.aprobado_por_cliente && !!inc.fecha_aprobacion);
                            const incIsPendiente = !incIsAprobado && !incIsRechazado;

                            return (
                              <div className="space-y-2 pt-0.5">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400 font-inter">
                                  {inc.repuesto_requerido && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <Wrench size={12} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                                      <span>Repuesto:</span>
                                      <strong className="font-semibold text-neutral-800 dark:text-neutral-200">{inc.repuesto_requerido}</strong>
                                    </span>
                                  )}

                                  {inc.repuesto_requerido && extraCost > 0 && (
                                    <span className="text-neutral-300 dark:text-neutral-700 select-none">·</span>
                                  )}

                                  {extraCost > 0 && (
                                    incIsRechazado ? (
                                      <span
                                        className="inline-flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 select-none"
                                        title="Descartado del total a cobrar"
                                      >
                                        <span>Costo Extra:</span>
                                        <strong className="line-through opacity-75">
                                          RD$ {extraCost.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </strong>
                                        <span className="text-[11px] text-rose-500 dark:text-rose-400 font-normal ml-0.5">
                                          (Descartado)
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5">
                                        <span>Costo Extra:</span>
                                        <strong className="font-semibold text-rose-600 dark:text-rose-400">
                                          RD$ {extraCost.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </strong>
                                      </span>
                                    )
                                  )}

                                  {extraCost > 0 && (
                                    <span className="text-neutral-300 dark:text-neutral-700 select-none">·</span>
                                  )}

                                  {extraCost > 0 && (
                                    incIsAprobado ? (
                                      <div className="inline-flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                          <CheckCircle2 size={13} className="shrink-0" />
                                          <span>Aprobado ({inc.metodo_aprobacion || 'Cliente'})</span>
                                          {inc.fecha_aprobacion && (
                                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal">
                                              · {new Date(inc.fecha_aprobacion).toLocaleString('es-DO', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                              })}
                                            </span>
                                          )}
                                        </span>
                                        {resolvingInc?.id !== inc.id && (
                                          <SimpleButton
                                            icon={Pencil}
                                            onClick={() => {
                                              setResolvingInc({ id: inc.id, action: 'RECHAZAR' });
                                              setQuickMetodo('Llamada');
                                            }}
                                            title="Cambiar estado de aprobación"
                                          >
                                            Cambiar
                                          </SimpleButton>
                                        )}
                                      </div>
                                    ) : incIsRechazado ? (
                                      <div className="inline-flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                                          <XCircle size={13} className="shrink-0" />
                                          <span>Rechazado por Cliente {inc.metodo_aprobacion ? `(${inc.metodo_aprobacion})` : ''}</span>
                                          {inc.fecha_aprobacion && (
                                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-normal">
                                              · {new Date(inc.fecha_aprobacion).toLocaleString('es-DO', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                              })}
                                            </span>
                                          )}
                                        </span>
                                        {resolvingInc?.id !== inc.id && (
                                          <SimpleButton
                                            icon={Pencil}
                                            onClick={() => {
                                              setResolvingInc({ id: inc.id, action: 'APROBAR' });
                                              setQuickMetodo('WhatsApp');
                                            }}
                                            title="Cambiar estado de aprobación"
                                          >
                                            Cambiar
                                          </SimpleButton>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="inline-flex flex-wrap items-center gap-2.5">
                                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                                          <Clock size={13} className="shrink-0" />
                                          <span>Pendiente de Aprobación</span>
                                        </span>

                                        {resolvingInc?.id !== inc.id && (
                                          <div className="inline-flex items-center gap-1.5">
                                            <SimpleButton
                                              variant="success"
                                              icon={Check}
                                              onClick={() => {
                                                setResolvingInc({ id: inc.id, action: 'APROBAR' });
                                                setQuickMetodo('WhatsApp');
                                              }}
                                              title="Registrar autorización del cliente"
                                            >
                                              Aprobar
                                            </SimpleButton>

                                            <SimpleButton
                                              variant="danger"
                                              icon={X}
                                              onClick={() => {
                                                setResolvingInc({ id: inc.id, action: 'RECHAZAR' });
                                                setQuickMetodo('Llamada');
                                              }}
                                              title="Registrar rechazo / desestimación del cliente"
                                            >
                                              Rechazar
                                            </SimpleButton>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>

                                {/* Barra de acción rápida para confirmar resolución (Aprobar o Rechazar) */}
                                {extraCost > 0 && resolvingInc?.id === inc.id && (
                                  <div className="mt-2.5 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-150">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 font-inter">
                                        {resolvingInc.action === 'RECHAZAR'
                                          ? '¿Por qué medio notificó el rechazo?'
                                          : '¿Por qué medio autorizó el cliente?'}
                                      </span>

                                      <div className="inline-flex items-center p-0.5 rounded-md bg-neutral-200/60 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-700/60">
                                        {[
                                          { id: 'Llamada', label: 'Llamada', icon: Phone },
                                          { id: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
                                          { id: 'Presencial', label: 'Presencial', icon: UserCheck }
                                        ].map((m) => {
                                          const isSel = quickMetodo === m.id;
                                          const MIcon = m.icon;
                                          return (
                                            <button
                                              type="button"
                                              key={m.id}
                                              onClick={() => setQuickMetodo(m.id)}
                                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs transition-all cursor-pointer ${
                                                isSel
                                                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium shadow-2xs'
                                                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                                              }`}
                                            >
                                              <MIcon
                                                size={12}
                                                className={
                                                  isSel
                                                    ? resolvingInc.action === 'RECHAZAR'
                                                      ? 'text-rose-500 dark:text-rose-400'
                                                      : 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-neutral-400 dark:text-neutral-500'
                                                }
                                              />
                                              <span>{m.label}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-auto">
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setResolvingInc(null)}
                                        disabled={isSavingAprobacion}
                                        className="h-7 px-2.5 text-xs font-medium rounded-md"
                                      >
                                        Cancelar
                                      </Button>

                                      <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleResolverIncidencia(inc.id, resolvingInc.action, quickMetodo)}
                                        disabled={isSavingAprobacion}
                                        isLoading={isSavingAprobacion}
                                        icon={resolvingInc.action === 'RECHAZAR' ? XCircle : Check}
                                        className="h-7 px-3 text-xs font-medium rounded-md"
                                      >
                                        {resolvingInc.action === 'RECHAZAR' ? 'Confirmar Rechazo' : 'Confirmar'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Galería de fotos adjuntas con visor lightbox */}
                          {fotosList.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 mb-2 font-outfit">
                                <ImageIcon size={13} />
                                <span>Evidencias Fotográficas ({fotosList.length})</span>
                              </span>
                              <div className="flex flex-wrap gap-2.5">
                                {fotosList.map((foto, fIdx) => {
                                  const url = foto.url || foto.url_foto;
                                  return (
                                    <div
                                      key={foto.id || fIdx}
                                      onClick={() => setActivePhoto(url)}
                                      className="aspect-square w-16 h-16 rounded-xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 cursor-pointer group hover:border-neutral-400 dark:hover:border-neutral-600 transition-all shadow-2xs hover:scale-105"
                                      title="Ver foto completa"
                                    >
                                      <img
                                        src={url}
                                        alt={`Evidencia ${fIdx + 1}`}
                                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                        loading="lazy"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sección de Asignación Multitécnico */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                    Técnicos Asignados <strong className="text-neutral-800 dark:text-neutral-200 font-bold ml-1">{tecnicosList.length}</strong>
                  </span>
                </div>

                {/* Lista de Tarjetas de Técnicos Asignados */}
                {tecnicosList.length === 0 ? (
                  <div className="py-5 px-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 flex flex-col items-center justify-center gap-2 text-center select-none">
                    <Inbox size={24} className="text-red-500/80 dark:text-red-400/80 stroke-[1.75]" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 font-inter">
                      Sin técnicos asignados
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {tecnicosList.map((tec) => {
                      const fullName = tec.nombre_completo || `${tec.nombre} ${tec.apellido || ''}`.trim();
                      const rolText = formatRoleName(tec.rol_nombre || tec.nombre_rol || tec.rol);

                      return (
                        <div
                          key={tec.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#18181b] shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                        >
                          {/* Avatar circular */}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 overflow-hidden border border-neutral-200/50 dark:border-neutral-700/50">
                            {tec.foto_perfil_url ? (
                              <img src={tec.foto_perfil_url} alt={fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{fullName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          {/* Nombre y Cargo/Rol */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate font-outfit">
                              {fullName}
                            </p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-inter truncate capitalize">
                              {rolText}
                            </p>
                          </div>

                          {/* Botón de desvincular */}
                          <button
                            type="button"
                            disabled={isManagingTecnicos}
                            onClick={() => handleRemoveTecnico(tec.id)}
                            title="Remover de la orden"
                            className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selector para agregar colaborador adicional y botón de autoasignación */}
                {(availableWorkersToAdd.length > 0 || canSelfAssign) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                    {availableWorkersToAdd.length > 0 && (
                      <div className="flex-1 min-w-[200px]">
                        <Select
                          value={selectedColabId}
                          onChange={(val) => setSelectedColabId(val)}
                          items={workerSelectItems}
                          placeholder="Seleccionar colaborador para agregar..."
                          disabled={isManagingTecnicos}
                          buttonClassName="py-1.5 text-xs rounded-xl"
                        />
                      </div>
                    )}

                    {availableWorkersToAdd.length > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isManagingTecnicos || !selectedColabId}
                        isLoading={isManagingTecnicos}
                        onClick={() => handleAddTecnico(parseInt(selectedColabId))}
                        className="h-[38px] px-3.5 text-xs font-semibold shrink-0"
                      >
                        Agregar
                      </Button>
                    )}

                    {canSelfAssign && (
                      <InlineConfirmButton
                        variant="primary"
                        text="Unirme"
                        confirmText="¿Unirte?"
                        icon={UserPlus}
                        disabled={isManagingTecnicos}
                        isLoading={isManagingTecnicos}
                        onConfirm={() => handleAddTecnico(effectiveUserId)}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Falla Reportada y Observaciones */}
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
                  <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block">
                    Falla Declarada por el Cliente
                  </span>
                  <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                    {orden.falla_reportada || 'Revisión general'}
                  </p>
                </div>

                {orden.observaciones_recepcion && (
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
                    <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block">
                      Observaciones de Recepción
                    </span>
                    <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {orden.observaciones_recepcion}
                    </p>
                  </div>
                )}
              </div>

              {/* Checklist de Recepción */}
              {checklistData && Object.keys(checklistData).length > 0 && (
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block">
                      Checklist de Recepción
                    </span>
                  </div>

                  {/* Grid / Flex de chips */}
                  <div className="flex flex-wrap gap-2">
                    {checklistDisplayItems.map(({ key, label }) => {
                      const estado = normalizeChecklistState(checklistData[key]);
                      const style = CHECKLIST_STATE_STYLES[estado] || CHECKLIST_STATE_STYLES.sin_revisar;
                      const { chip, Icon } = style;
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-1.5 rounded-xl py-2 px-3.5 text-xs font-semibold select-none border ${chip}`}
                        >
                          <Icon size={11} className="shrink-0" />
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumen de contadores */}
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80 text-xs font-inter text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Minus size={12} className="text-neutral-400 shrink-0" />
                      <span>Sin revisar:</span> <b className="font-bold text-neutral-800 dark:text-neutral-200">{countPendientes}</b>
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>OK:</span> <b className="font-bold">{countOk}</b>
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <AlertTriangle size={12} className="shrink-0" />
                      <span>Con Falla:</span> <b className="font-bold">{countFalla}</b>
                    </span>
                  </div>
                </div>
              )}

              {/* Histórico en Taller (Línea de Tiempo) */}
              <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 bg-white dark:bg-neutral-900/50 h-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-outfit">
                    <History size={14} className="text-red-500 shrink-0" />
                    <span>Histórico en Taller</span>
                    <strong className="text-neutral-700 dark:text-neutral-300 font-bold ml-1">
                      {timelineEvents.length}
                    </strong>
                  </span>
                </div>

                {timelineEvents.length === 0 ? (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 font-inter italic py-2">
                    No hay eventos registrados en la bitácora técnica.
                  </p>
                ) : (
                  <div className="max-h-[480px] overflow-y-auto overflow-x-hidden pr-2.5 pt-1 pb-2">
                    <div className="relative pl-7 space-y-6">
                      {timelineEvents.map((event, idx) => {
                        const isLast = idx === timelineEvents.length - 1;
                        const formattedDate = event.fecha_registro
                          ? new Date(event.fecha_registro).toLocaleString('es-DO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          : '—';

                        if (event.tipo_evento === 'INCIDENCIA') {
                          const incConfig = getIncidenciaTipoConfig(event.tipo_incidencia);
                          const IncIcon = incConfig.icon;
                          const extraCost = parseFloat(event.costo_adicional_repuesto || 0);
                          const incFotos = Array.isArray(event.fotos)
                            ? event.fotos.filter((f) => !f.incidencia_id || Number(f.incidencia_id) === Number(event.id))
                            : [];

                          return (
                            <div key={event._timelineKey || idx} className="relative group">
                              {/* Línea vertical conectora */}
                              {!isLast && (
                                <div className="absolute -left-[19px] top-3.5 -bottom-6 w-0.5 bg-neutral-200 dark:bg-neutral-800" />
                              )}

                              {/* Nodo circular para incidencia */}
                              <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-[#18181b] bg-amber-500 shrink-0 z-10" />

                              {/* Contenido a la derecha del nodo: Incidencia con estructura abierta idéntica al estado */}
                              <div className="space-y-1.5">
                                {/* Cabecera abierta: Badge tipo de incidencia, usuario y fecha */}
                                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant="minimal"
                                      color={incConfig.color}
                                      icon={IncIcon}
                                      size="sm"
                                      className="font-semibold text-xs"
                                    >
                                      {incConfig.label}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500 font-inter">
                                    {event.usuario_nombre && (
                                      <>
                                        <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300 font-medium">
                                          <User size={11} className="shrink-0 text-neutral-400 dark:text-neutral-500" />
                                          <span>{event.usuario_nombre}</span>
                                        </span>
                                        <span>·</span>
                                      </>
                                    )}
                                    <span className="tabular-nums">{formattedDate}</span>
                                  </div>
                                </div>

                                {/* Descripción en cápsula neutral como las notas de avance */}
                                {event.descripcion && (
                                  <p className="text-xs text-neutral-600 dark:text-neutral-300 font-inter leading-relaxed bg-neutral-50 dark:bg-neutral-800/40 rounded-xl p-2.5 border border-neutral-200/50 dark:border-neutral-800/60 whitespace-pre-wrap">
                                    {event.descripcion}
                                  </p>
                                )}

                                {/* Etiquetas de repuesto y costo adicional integradas discretamente */}
                                {(event.repuesto_requerido || extraCost > 0) && (
                                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-neutral-600 dark:text-neutral-400 font-inter pt-0.5">
                                    {event.repuesto_requerido && (
                                      <span className="inline-flex items-center gap-1.5">
                                        <Wrench size={11} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                                        <span>Repuesto:</span>
                                        <strong className="text-neutral-700 dark:text-neutral-300 font-semibold">{event.repuesto_requerido}</strong>
                                      </span>
                                    )}
                                    {event.repuesto_requerido && extraCost > 0 && (
                                      <span className="text-neutral-300 dark:text-neutral-700 select-none">·</span>
                                    )}
                                    {extraCost > 0 && (() => {
                                      const incIsAprobado = event.aprobado_por_cliente === true || event.estado_aprobacion === 'APROBADO';
                                      const incIsRechazado = event.rechazado_por_cliente === true || event.estado_aprobacion === 'RECHAZADO' || (!event.aprobado_por_cliente && !!event.fecha_aprobacion);

                                      if (incIsRechazado) {
                                        return (
                                          <>
                                            <span
                                              className="inline-flex items-center gap-1 text-neutral-400 dark:text-neutral-500 select-none"
                                              title="Descartado del total a cobrar"
                                            >
                                              <span>Costo Extra:</span>
                                              <strong className="line-through opacity-70">
                                                RD$ {extraCost.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </strong>
                                              <span className="text-[10px] text-rose-500 dark:text-rose-400 ml-0.5">
                                                (Descartado)
                                              </span>
                                            </span>
                                            <span className="text-neutral-300 dark:text-neutral-700 select-none">·</span>
                                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                                              <XCircle size={11} className="shrink-0" />
                                              <span>Rechazado {event.metodo_aprobacion ? `(${event.metodo_aprobacion})` : ''}</span>
                                            </span>
                                          </>
                                        );
                                      }

                                      if (incIsAprobado) {
                                        return (
                                          <>
                                            <span className="inline-flex items-center gap-1">
                                              <span>Costo Extra:</span>
                                              <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">
                                                RD$ {extraCost.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </strong>
                                            </span>
                                            <span className="text-neutral-300 dark:text-neutral-700 select-none">·</span>
                                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                              <CheckCircle2 size={11} className="shrink-0" />
                                              <span>Aprobado ({event.metodo_aprobacion || 'Cliente'})</span>
                                            </span>
                                          </>
                                        );
                                      }

                                      return (
                                        <>
                                          <span className="inline-flex items-center gap-1">
                                            <span>Costo Extra:</span>
                                            <strong className="text-rose-600 dark:text-rose-400 font-semibold">
                                              RD$ {extraCost.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </strong>
                                          </span>
                                          <span className="text-neutral-300 dark:text-neutral-700 select-none">·</span>
                                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                            <Clock size={11} className="shrink-0" />
                                            <span>Pendiente Aprobación</span>
                                          </span>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}

                                {/* Cuadrícula de fotos con misma apariencia homologada */}
                                {incFotos.length > 0 && (
                                  <div className="pt-2 space-y-2">
                                    <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <ImageIcon size={13} />
                                      <span>Evidencias Fotográficas ({incFotos.length})</span>
                                    </span>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                                      {incFotos.map((foto, fIdx) => (
                                        <div
                                          key={foto.id || fIdx}
                                          onClick={() => setActivePhoto(foto.url || foto.url_foto)}
                                          className="aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 cursor-pointer group/img relative bg-neutral-100 dark:bg-neutral-900 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
                                          title="Ver imagen en tamaño completo"
                                        >
                                          <img
                                            src={foto.url || foto.url_foto}
                                            alt={`Evidencia ${fIdx + 1}`}
                                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Hito de Cambio de Estado
                        const estadoObj =
                          (allEstados || []).find(
                            (e) => String(e.id) === String(event.estado_id) || e.codigo_estado === event.codigo_estado
                          ) || event;
                        const estadoColor = event.color_badge || estadoObj.color_badge || '#6B7280';
                        const estadoLabel = getEstadoLabel(estadoObj) || event.nombre_estado || event.estado || 'Estado Actualizado';
                        const EstadoIcon = getEstadoIcon(estadoObj);
                        const isInitialReception =
                          event.id === 'inicio' ||
                          Number(event.orden_flujo) === 1 ||
                          String(event.codigo_estado).toUpperCase().includes('RECIB');
                        const itemFotos =
                          Array.isArray(event.fotos) && event.fotos.length > 0
                            ? event.fotos.filter((f) => !f.incidencia_id && (f.tipo_evidencia === 'RECEPCION' || !f.tipo_evidencia || f.tipo_evidencia !== 'INCIDENCIA'))
                            : isInitialReception
                            ? fotosArray
                            : [];

                        return (
                          <div key={event._timelineKey || idx} className="relative group">
                            {/* Línea vertical conectora */}
                            {!isLast && (
                              <div className="absolute -left-[19px] top-3.5 -bottom-6 w-0.5 bg-neutral-200 dark:bg-neutral-800" />
                            )}

                            {/* Punto / Nodo circular con color del estado */}
                            <div
                              className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-[#18181b] shrink-0 z-10"
                              style={{ backgroundColor: estadoColor }}
                            />

                            {/* Contenido a la derecha del nodo: Estado */}
                            <div className="space-y-1.5">
                              {/* Fila superior: Estado, Fecha/Hora y Técnico responsable */}
                              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                <div className="flex items-center gap-1.5">
                                  <EstadoIcon size={13} className="shrink-0 stroke-[2.2]" style={{ color: estadoColor }} />
                                  <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
                                    {estadoLabel}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500 font-inter">
                                  {event.usuario_nombre && (
                                    <>
                                      <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300 font-medium">
                                        <User size={11} className="shrink-0 text-neutral-400" />
                                        <span>{event.usuario_nombre}</span>
                                      </span>
                                      <span>·</span>
                                    </>
                                  )}
                                  <span className="tabular-nums">{formattedDate}</span>
                                </div>
                              </div>

                              {/* Nota de avance / cambio */}
                              {event.nota_cambio && (
                                <p className="text-xs text-neutral-600 dark:text-neutral-300 font-inter leading-relaxed bg-neutral-50 dark:bg-neutral-800/40 rounded-xl p-2.5 border border-neutral-200/50 dark:border-neutral-800/60">
                                  {event.nota_cambio}
                                </p>
                              )}

                              {/* Evidencias fotográficas asociadas */}
                              {itemFotos.length > 0 && (
                                <div className="pt-2 space-y-2">
                                  <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <ImageIcon size={13} />
                                    <span>Evidencias Fotográficas ({itemFotos.length})</span>
                                  </span>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                                    {itemFotos.map((foto, fIdx) => (
                                      <div
                                        key={fIdx}
                                        onClick={() => setActivePhoto(foto.url || foto.url_foto)}
                                        className="aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 cursor-pointer group/img relative bg-neutral-100 dark:bg-neutral-900 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
                                        title="Ver imagen en tamaño completo"
                                      >
                                        <img
                                          src={foto.url || foto.url_foto}
                                          alt={`Evidencia ${fIdx + 1}`}
                                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
      </Modal>

      {/* Modal Lightbox de Foto */}
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
                alt="Evidencia completa"
                className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-xl"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default FichaTecnicaModal;
