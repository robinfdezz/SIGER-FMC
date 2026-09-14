import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
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
  ArrowRight,
  Loader2,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { UnlockMethodView } from '../common/PatternLock';
import {
  getServicioById,
  assignTecnicoServicio,
  removeTecnicoServicio
} from '../../services/servicios.service';
import { getWorkers } from '../../services/workers.service';
import { sileo } from 'sileo';

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

  const checklistObj = orden?.checklist_entrada || orden?.checklist_recepcion || {};
  const fotosArray = orden?.fotos || [];
  const tecnicosList = Array.isArray(orden?.tecnicos) ? orden.tecnicos : [];
  const isCurrentUserAssigned = tecnicosList.some((t) => t.id === currentUserId);

  // Técnicos disponibles para agregar que no estén ya asignados
  const availableWorkersToAdd = allWorkers.filter(
    (w) => w.activo && !tecnicosList.some((t) => t.id === w.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#141416] border border-neutral-200 dark:border-neutral-800 w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-inter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm shrink-0 border border-red-200/50 dark:border-red-900/40">
              <Smartphone size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-outfit text-neutral-900 dark:text-neutral-100 leading-tight">
                  Ficha Técnica #{orden?.codigo_ticket || '...'}
                </h2>
                {orden?.es_garantia && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300/40 dark:border-amber-800/40 uppercase">
                    Garantía
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {orden ? `${orden.marca_equipo} ${orden.modelo_equipo} · Cliente: ${orden.cliente || orden.nombre_cliente}` : 'Cargando información...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
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
                <div className="sm:col-span-2 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Datos del Dispositivo
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Marca / Modelo</span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {orden.marca_equipo} {orden.modelo_equipo}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">IMEI / N° de Serie</span>
                      <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                        {orden.num_serie_imei || 'No especificado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Prioridad</span>
                      <span className="font-semibold capitalize text-neutral-800 dark:text-neutral-200">
                        {orden.prioridad || 'Media'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Fecha de Ingreso</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        {orden.created_at ? new Date(orden.created_at).toLocaleDateString('es-DO') : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Seguridad (PIN / Patrón de desbloqueo) */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 flex flex-col items-center justify-center text-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Acceso al Equipo
                  </span>
                  <div className="my-auto py-1">
                    <UnlockMethodView datosAcceso={orden.datos_acceso_equipo} />
                  </div>
                </div>
              </div>

              {/* Sección de Asignación Multitécnico */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-red-500" />
                    <span className="text-xs font-bold font-outfit uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                      Técnicos Asignados a la Orden ({tecnicosList.length})
                    </span>
                  </div>

                  {/* Botón rápido "Unirme como técnico" si el usuario logueado no está en la orden */}
                  {!isCurrentUserAssigned && (
                    <button
                      type="button"
                      disabled={isManagingTecnicos}
                      onClick={() => handleAddTecnico(currentUserId)}
                      className="px-3 py-1 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-2xs flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                    >
                      <UserPlus size={13} />
                      <span>Unirme como colaborador</span>
                    </button>
                  )}
                </div>

                {/* Lista de Badges de Técnicos */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {tecnicosList.length === 0 ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium italic">
                      Sin técnicos asignados (Bolsa general de taller)
                    </span>
                  ) : (
                    tecnicosList.map((tec) => (
                      <div
                        key={tec.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium shadow-2xs"
                      >
                        <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-[10px]">
                          {(tec.nombre || tec.nombre_completo || 'U').charAt(0)}
                        </div>
                        <span className="text-neutral-800 dark:text-neutral-200">
                          {tec.nombre_completo || `${tec.nombre} ${tec.apellido || ''}`.trim()}
                        </span>
                        <button
                          type="button"
                          disabled={isManagingTecnicos}
                          onClick={() => handleRemoveTecnico(tec.id)}
                          title="Remover de la orden"
                          className="text-neutral-400 hover:text-red-500 transition-colors ml-0.5 p-0.5 rounded cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Selector para agregar colaborador adicional */}
                {availableWorkersToAdd.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                    <select
                      value={selectedColabId}
                      onChange={(e) => setSelectedColabId(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden"
                    >
                      <option value="">Seleccionar colaborador para agregar...</option>
                      {availableWorkersToAdd.map((w) => (
                        <option key={w.id} value={String(w.id)}>
                          {w.nombre} {w.apellido} ({w.rol_nombre || 'Trabajador'})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isManagingTecnicos || !selectedColabId}
                      onClick={() => handleAddTecnico(parseInt(selectedColabId))}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Agregar
                    </button>
                  </div>
                )}
              </div>

              {/* Falla Reportada y Observaciones */}
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    Falla Declarada por el Cliente
                  </span>
                  <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                    {orden.falla_reportada || 'Revisión general'}
                  </p>
                </div>

                {orden.observaciones_recepcion && (
                  <div className="p-3.5 rounded-xl bg-neutral-50/70 dark:bg-neutral-900/30 border border-neutral-200/60 dark:border-neutral-800/60 text-xs text-neutral-600 dark:text-neutral-400">
                    <span className="font-semibold block mb-0.5 text-neutral-700 dark:text-neutral-300">
                      Observaciones de Recepción:
                    </span>
                    {orden.observaciones_recepcion}
                  </div>
                )}
              </div>

              {/* Checklist de Recepción */}
              {checklistObj && Object.keys(checklistObj).length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold font-outfit uppercase tracking-wider text-neutral-500">
                    Checklist de Recepción
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800/60 text-xs">
                    {Object.entries(checklistObj).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                        {val ? (
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        ) : (
                          <AlertCircle size={13} className="text-neutral-400 shrink-0" />
                        )}
                        <span className="truncate capitalize">{key.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fotos de Evidencia */}
              {fotosArray.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold font-outfit uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    <span>Fotos de Recepción ({fotosArray.length})</span>
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

              {/* Formulario de Transición de Estado */}
              <form
                onSubmit={handleUpdateEstado}
                className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-outfit uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-red-500" />
                    <span>Actualizar Estado Técnico</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border"
                    style={{
                      backgroundColor: orden.estado_color ? `${orden.estado_color}15` : '#f3f4f6',
                      color: orden.estado_color || '#374151',
                      borderColor: orden.estado_color ? `${orden.estado_color}40` : '#e5e7eb'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: orden.estado_color }} />
                    {orden.estado}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Nuevo Estado
                    </label>
                    <select
                      value={selectedEstadoId}
                      onChange={(e) => setSelectedEstadoId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
                    >
                      {allEstados.map((est) => (
                        <option key={est.id} value={String(est.id)}>
                          {est.nombre_estado} ({est.codigo_estado})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                      Nota de Avance / Diagnóstico (Opcional)
                    </label>
                    <input
                      type="text"
                      value={notaCambio}
                      onChange={(e) => setNotaCambio(e.target.value)}
                      placeholder="Ej: Se reemplazó conector de carga..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating || String(selectedEstadoId) === String(orden.estado_actual_id)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                    <span>Guardar Cambio</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

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
    </div>
  );
};

export default FichaTecnicaModal;
