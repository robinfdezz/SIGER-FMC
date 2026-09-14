import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Select from '../common/Select';
import Badge from '../common/Badge';
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
  ClipboardCheck
} from 'lucide-react';
import { UnlockMethodView } from '../common/PatternLock';
import {
  getServicioById,
  assignTecnicoServicio,
  removeTecnicoServicio
} from '../../services/servicios.service';
import { getWorkers } from '../../services/workers.service';
import { sileo } from 'sileo';

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
  allEstados = [],
  onEstadoUpdated,
  onTecnicosUpdated
}) => {
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEstadoId, setSelectedEstadoId] = useState('');
  const [notaCambio, setNotaCambio] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);

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
            setSelectedEstadoId(String(resOrden.data.estado_actual_id || resOrden.data.estado_id || ''));
            setNotaCambio('');
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
      setActivePhoto(null);
    }
  }, [isOpen, ordenId]);

  if (!isOpen) return null;

  const handleUpdateEstado = async (e) => {
    e.preventDefault();
    if (!selectedEstadoId) return;

    if (String(selectedEstadoId) === String(orden.estado_actual_id)) {
      sileo.info({ title: 'Mismo estado', description: 'La orden ya se encuentra en este estado.' });
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
  const fotosArray = orden?.fotos || [];
  const tecnicosList = Array.isArray(orden?.tecnicos) ? orden.tecnicos : [];
  const isCurrentUserAssigned = tecnicosList.some((t) => t.id === currentUserId);

  // Técnicos disponibles para agregar que no estén ya asignados
  const availableWorkersToAdd = allWorkers.filter(
    (w) => w.activo && !tecnicosList.some((t) => t.id === w.id)
  );

  const workerSelectItems = availableWorkersToAdd.map((w) => ({
    id: String(w.id),
    value: String(w.id),
    label: `${w.nombre} ${w.apellido}`,
    supportingText: formatRoleName(w.rol_nombre || w.nombre_rol || w.rol),
    avatarUrl: w.foto_perfil_url || undefined
  }));

  const estadoSelectItems = allEstados.map((est) => ({
    id: String(est.id),
    value: String(est.id),
    label: getEstadoLabel(est),
    icon: est.color_badge ? (
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: est.color_badge }}
      />
    ) : null
  }));

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
              disabled={isUpdating || !orden || String(selectedEstadoId) === String(orden?.estado_actual_id)}
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
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 flex flex-col items-center justify-center text-center gap-1.5">
                  <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                    Acceso al Equipo
                  </span>
                  <div className="my-auto py-1">
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
                  </div>

                  <div>
                    <label className="block text-xs font-medium font-inter text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Nota de Avance / Diagnóstico <span className="text-neutral-400 font-normal font-inter">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={notaCambio}
                      onChange={(e) => setNotaCambio(e.target.value)}
                      placeholder="Ej: Se reemplazó conector de carga..."
                      className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-red-500 focus:ring-red-500/20 transition-colors"
                    />
                  </div>
                </div>
              </form>

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
                {(availableWorkersToAdd.length > 0 || !isCurrentUserAssigned) && (
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

                    {!isCurrentUserAssigned && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={isManagingTecnicos}
                        icon={UserPlus}
                        onClick={() => handleAddTecnico(currentUserId)}
                        className="h-[38px] px-3.5 text-xs font-semibold shrink-0"
                      >
                        Unirme
                      </Button>
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

              {/* Fotos de Evidencia */}
              {fotosArray.length > 0 && (
                <div className="space-y-2">
                  <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    <span>Fotos de Recepción <strong className="text-neutral-700 dark:text-neutral-300 font-bold ml-1">{fotosArray.length}</strong></span>
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {fotosArray.map((foto, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActivePhoto(foto.url || foto.url_foto)}
                        className="aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 cursor-pointer group relative bg-neutral-100 dark:bg-neutral-900"
                      >
                        <img
                          src={foto.url || foto.url_foto}
                          alt={`Evidencia ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
      </Modal>

      {/* Modal Lightbox de Foto */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden">
            <img src={activePhoto} alt="Evidencia completa" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </>
  );
};

export default FichaTecnicaModal;
