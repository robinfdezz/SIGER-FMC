import React from 'react';
import {
  Flame,
  ChevronsUp,
  Equal,
  ChevronsDown,
  Clock,
  User,
  Users,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Laptop,
  Tablet,
  Gamepad2,
  Watch,
  Package,
  Inbox
} from 'lucide-react';

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Reciente';
  const now = new Date();
  const past = new Date(dateString);
  const diffMinutes = Math.floor((now - past) / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 5) return 'Hace un momento';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  if (diffHours === 1) return 'Hace 1 hora';
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays === 1) return 'Hace 1 día';
  return `Hace ${diffDays} días`;
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

const getPriorityBadge = (prioridad = '') => {
  const p = String(prioridad).toLowerCase();
  switch (p) {
    case 'urgente':
      return {
        label: 'Urgente',
        icon: Flame,
        color: 'text-red-500 dark:text-red-400'
      };
    case 'alta':
      return {
        label: 'Alta',
        icon: ChevronsUp,
        color: 'text-amber-500 dark:text-amber-400'
      };
    case 'media':
      return {
        label: 'Media',
        icon: Equal,
        color: 'text-blue-500 dark:text-blue-400'
      };
    case 'baja':
    default:
      return {
        label: 'Baja',
        icon: ChevronsDown,
        color: 'text-neutral-400 dark:text-neutral-500'
      };
  }
};

const getNextAction = (ordenFlujo) => {
  switch (ordenFlujo) {
    case 1:
      return { label: 'Iniciar Diagnóstico', nextOrden: 2 };
    case 2:
      return { label: 'A Reparación', nextOrden: 4 };
    case 3:
      return { label: 'Reanudar Reparación', nextOrden: 4 };
    case 4:
      return { label: 'A Control Calidad', nextOrden: 5 };
    case 5:
      return { label: 'Marcar Listo', nextOrden: 6 };
    default:
      return null;
  }
};

export const TallerCard = ({
  orden,
  onSelect,
  onQuickAdvance,
  onSelfAssign,
  currentUserId,
  allEstados = []
}) => {
  const priorityInfo = getPriorityBadge(orden.prioridad);
  const PriorityIcon = priorityInfo.icon;
  const CategoryIcon = getCategoryIcon(orden.categoria);
  const timeAgo = formatTimeAgo(orden.created_at);
  const nextAction = getNextAction(orden.orden_flujo);

  const nextEstadoObj = nextAction
    ? allEstados.find((e) => e.orden_flujo === nextAction.nextOrden)
    : null;

  const handleAdvance = (e) => {
    e.stopPropagation();
    if (nextEstadoObj && onQuickAdvance) {
      onQuickAdvance(orden, nextEstadoObj);
    }
  };

  const handleJoin = (e) => {
    e.stopPropagation();
    if (onSelfAssign) {
      onSelfAssign(orden.id);
    }
  };

  const tecnicosList = Array.isArray(orden.tecnicos) ? orden.tecnicos : [];
  const hasTecnicos = tecnicosList.length > 0;
  const isAlreadyAssigned = hasTecnicos && tecnicosList.some((t) => t.id === currentUserId);

  return (
    <div
      onClick={() => onSelect && onSelect(orden)}
      className="group relative bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-2xl p-4 shadow-xs transition-colors duration-200 cursor-pointer flex flex-col justify-between gap-3 select-none"
    >
      <div>
        {/* Cabecera de la tarjeta: Ticket a la izquierda, Garantía + Prioridad a la derecha */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 tracking-wider">
            {orden.codigo_ticket}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {orden.es_garantia && (
              <span
                title="Orden bajo cobertura de garantía"
                className="text-red-500 dark:text-red-400 hover:text-red-600 transition-colors inline-flex items-center"
              >
                <ShieldCheck size={14} className="stroke-[2.2]" />
              </span>
            )}

            <span
              title={`Prioridad: ${priorityInfo.label}`}
              className={`${priorityInfo.color} inline-flex items-center`}
            >
              <PriorityIcon
                size={14}
                className={priorityInfo.label === 'Urgente' ? 'fill-current shrink-0' : 'shrink-0'}
              />
            </span>
          </div>
        </div>

        {/* Indicador de Tiempo Relativo */}
        <div className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500 mb-2 font-inter">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{timeAgo}</span>
        </div>

        {/* Dispositivo y Cliente */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-neutral-900 dark:text-neutral-100 leading-tight">
            <CategoryIcon size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
            <span className="font-semibold truncate">
              {orden.marca_equipo} {orden.modelo_equipo}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            <User size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
            <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
              {orden.cliente || orden.nombre_cliente}
            </span>
          </div>

          {/* Falla Reportada */}
          <div className="pt-1">
            <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed bg-neutral-50 dark:bg-neutral-900/60 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800/60 font-inter">
              {orden.falla_reportada || 'Revisión técnica en taller'}
            </p>
          </div>
        </div>
      </div>

      {/* Pie de Tarjeta: Sección Multitécnico y Acciones */}
      <div className="space-y-2">
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2">
          {hasTecnicos ? (
            <div className="flex items-start gap-1.5 min-w-0" title={tecnicosList.map((t) => t.nombre_completo || t.nombre).join(', ')}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
              <div className="flex items-start gap-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 min-w-0">
                <Users size={12} className="text-neutral-400 shrink-0 mt-0.5" />
                <span className="leading-snug whitespace-normal break-words">
                  {tecnicosList.map((t) => t.nombre_completo || `${t.nombre} ${t.apellido || ''}`.trim()).join(', ')}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <Inbox className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 truncate">
                En bolsa general
              </span>
            </div>
          )}

          {/* Botón rápido "Unirme como técnico" si no está asignado */}
          {!isAlreadyAssigned && onSelfAssign && (
            <button
              type="button"
              onClick={handleJoin}
              className="w-full py-1 px-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-1 transition-colors"
            >
              <UserPlus size={11} className="text-red-500" />
              <span>Unirme a ésta orden</span>
            </button>
          )}
        </div>

        {/* Botón de acción rápida si tiene siguiente paso operativo */}
        {nextEstadoObj && (
          <button
            type="button"
            onClick={handleAdvance}
            className="w-full mt-0.5 py-1.5 px-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all group-hover:border-neutral-300 dark:group-hover:border-neutral-600"
          >
            <span>{nextAction.label}</span>
            <ArrowRight size={13} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TallerCard;
