import React from 'react';
import {
  History,
  Clock,
  Search,
  Wrench,
  Package,
  PackageCheck,
  CheckCircle2,
  X,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ClipboardCheck,
  User,
  Image as ImageIcon
} from 'lucide-react';
import Badge from '../common/Badge';

// Configuración de colores predeterminados por código de estado
const STATE_COLOR_MAP = {
  RECIBIDO: '#F59E0B',
  EN_DIAGNOSTICO: '#F97316',
  ESPERA_REPUESTO: '#EA580C',
  EN_REPARACION: '#EF4444',
  CONTROL_CALIDAD: '#DC2626',
  LISTO_ENTREGA: '#DC2626',
  ENTREGADO: '#B91C1C',
  CANCELADO_DEVUELTO: '#DC2626'
};

// Mensajes amigables para el cliente en el portal público
const PUBLIC_STATE_DESCRIPTIONS = {
  RECIBIDO: 'Dispositivo recibido e ingresado formalmente a nuestro taller para su revisión técnica.',
  EN_DIAGNOSTICO: 'El equipo se encuentra en fase de inspección y diagnóstico detallado de fallas.',
  ESPERA_REPUESTO: 'En espera de repuestos o piezas requeridas para continuar el servicio técnico.',
  EN_REPARACION: 'El dispositivo se encuentra en proceso de reparación e intervención especializada.',
  CONTROL_CALIDAD: 'Equipo en pruebas finales de funcionamiento y verificación de calidad.',
  LISTO_ENTREGA: '¡Reparación completada! El dispositivo está listo para ser retirado en sucursal.',
  ENTREGADO: 'Dispositivo entregado a conformidad del cliente. ¡Gracias por confiar en nosotros!',
  CANCELADO_DEVUELTO: 'El servicio ha sido cancelado y el equipo devuelto al cliente.'
};

const normalizeStateCode = (code = '', name = '', flujo = null) => {
  const cod = String(code).toUpperCase().trim();
  const nom = String(name).toUpperCase().trim();
  const f = Number(flujo);

  if (f === 1 || cod.includes('RECIB') || nom.includes('RECIB')) return 'RECIBIDO';
  if (f === 2 || cod.includes('DIAGN') || nom.includes('DIAGN')) return 'EN_DIAGNOSTICO';
  if (f === 3 || cod.includes('ESPERA') || cod.includes('REPUESTO') || nom.includes('ESPERA')) return 'ESPERA_REPUESTO';
  if (f === 4 || cod.includes('REPARAC') || cod.includes('PROCESO') || nom.includes('REPARAC')) return 'EN_REPARACION';
  if (f === 5 || cod.includes('CALIDAD') || cod.includes('CONTROL') || nom.includes('CALIDAD')) return 'CONTROL_CALIDAD';
  if (f === 6 || cod.includes('LISTO') || nom.includes('LISTO')) return 'LISTO_ENTREGA';
  if (f === 7 || cod.includes('ENTREG') || nom.includes('ENTREG')) return 'ENTREGADO';
  if (f === 8 || cod.includes('CANCEL') || nom.includes('CANCEL') || nom.includes('DEVUELT')) return 'CANCELADO_DEVUELTO';
  return cod || 'ESTADO';
};

const getStateIcon = (normCode) => {
  switch (normCode) {
    case 'RECIBIDO':
      return Clock;
    case 'EN_DIAGNOSTICO':
      return Search;
    case 'ESPERA_REPUESTO':
      return Package;
    case 'EN_REPARACION':
      return Wrench;
    case 'CONTROL_CALIDAD':
      return ClipboardCheck;
    case 'LISTO_ENTREGA':
      return PackageCheck;
    case 'ENTREGADO':
      return CheckCircle2;
    case 'CANCELADO_DEVUELTO':
      return X;
    default:
      return Clock;
  }
};

const getIncidenciaTipoConfig = (tipo = '') => {
  switch (String(tipo)) {
    case 'Imprevisto':
      return { label: 'Imprevisto', color: 'danger', icon: AlertTriangle, hex: '#EF4444' };
    case 'Pieza Extra':
      return { label: 'Pieza Extra', color: 'warning', icon: Wrench, hex: '#F59E0B' };
    case 'Aviso al Cliente':
      return { label: 'Aviso al Cliente', color: 'primary', icon: AlertCircle, hex: '#3B82F6' };
    case 'Hallazgo Tecnico':
    default:
      return { label: 'Hallazgo Técnico', color: 'info', icon: Search, hex: '#0EA5E9' };
  }
};

const formatEventDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Filtro de notas operativas de sistema internas
const isInternalSystemNote = (note = '') => {
  if (!note) return true;
  const n = note.toLowerCase().trim();
  return (
    n.startsWith('avanzado a') ||
    n.startsWith('transición automática') ||
    n.startsWith('transicion automatica') ||
    n.startsWith('cambio de estado a') ||
    n.startsWith('estado cambiado') ||
    n.includes('desde el tablero de taller') ||
    n.includes('creada en recepcion') ||
    n.includes('creada en recepción')
  );
};

/**
 * ServiceTimeline
 * Componente modularizado de línea de tiempo y bitácora técnica de órdenes.
 * Usado tanto en la Ficha Técnica (vista administrativa completa) como en el Portal Público (vista higienizada).
 */
export const ServiceTimeline = ({
  events = [],
  isPublic = false,
  onPhotoClick = null,
  title = null,
  showHeader = true,
  maxHeight = 'max-h-[480px]',
  className = ''
}) => {
  // En modo público, filtrar eventos internos si fuera necesario
  const visibleEvents = events.filter((ev) => {
    if (!isPublic) return true;
    // Si es incidencia en modo público, solo mostrar si es Aviso al Cliente o con resolución formal
    if (ev.tipo_evento === 'INCIDENCIA') {
      return (
        ev.tipo_incidencia === 'Aviso al Cliente' ||
        ev.aprobado_por_cliente === true ||
        ev.rechazado_por_cliente === true
      );
    }
    return true;
  });

  const headerTitle = title || (isPublic ? 'Historial de Avance' : 'Histórico en Taller');

  return (
    <div className={`rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 bg-white dark:bg-[#18181b] shadow-xs space-y-4 ${className}`}>
      {/* Cabecera del Timeline */}
      {showHeader && (
        <div className="flex items-center justify-between pb-1 border-b border-neutral-100 dark:border-neutral-800/80">
          <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-outfit">
            <History size={14} className="text-red-500 shrink-0" />
            <span>{headerTitle}</span>
            <strong className="text-neutral-700 dark:text-neutral-300 font-bold ml-1">
              {visibleEvents.length}
            </strong>
          </span>
        </div>
      )}

      {/* Lista de Eventos o Estado Vacío */}
      {visibleEvents.length === 0 ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-inter italic py-3 text-center">
          {isPublic
            ? 'El avance de este servicio se actualizará conforme avance en taller.'
            : 'No hay eventos registrados en la bitácora técnica.'}
        </p>
      ) : (
        <div className={`${maxHeight} overflow-y-auto overflow-x-hidden pr-2 pt-1 pb-2`}>
          <div className="relative pl-7 space-y-6">
            {visibleEvents.map((event, idx) => {
              const isLast = idx === visibleEvents.length - 1;
              const formattedDate = formatEventDate(event.fecha_registro || event.created_at);

              // ─────────────────────────────────────────────────────────────
              // CASO 1: EVENTO DE INCIDENCIA TÉCNICA
              // ─────────────────────────────────────────────────────────────
              if (event.tipo_evento === 'INCIDENCIA') {
                const incConfig = getIncidenciaTipoConfig(event.tipo_incidencia);
                const IncIcon = incConfig.icon;
                const extraCost = parseFloat(event.costo_adicional_repuesto || 0);
                const incFotos = Array.isArray(event.fotos)
                  ? event.fotos.filter((f) => !f.incidencia_id || Number(f.incidencia_id) === Number(event.id))
                  : [];

                return (
                  <div key={event._timelineKey || `inc-${event.id || idx}`} className="relative group">
                    {/* Línea vertical conectora punteada/discontinua */}
                    {!isLast && (
                      <div className="absolute -left-[19px] top-3 -bottom-6 w-0 border-l-2 border-dashed border-neutral-300 dark:border-neutral-700" />
                    )}

                    {/* Nodo anillado hueco para incidencia */}
                    <div
                      className="absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-[#18181b] shrink-0 z-10"
                      style={{ borderColor: incConfig.hex }}
                    />

                    {/* Contenido de Incidencia */}
                    <div className="space-y-1.5">
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
                          {!isPublic && event.usuario_nombre && (
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

                      {/* Descripción */}
                      {event.descripcion && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 font-inter leading-relaxed bg-neutral-50 dark:bg-neutral-800/40 rounded-xl p-2.5 border border-neutral-200/50 dark:border-neutral-800/60 whitespace-pre-wrap">
                          {event.descripcion}
                        </p>
                      )}

                      {/* Etiquetas de repuesto y costo adicional */}
                      {(event.repuesto_requerido || extraCost > 0) && (
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-neutral-600 dark:text-neutral-400 font-inter pt-0.5">
                          {event.repuesto_requerido && (
                            <span className="inline-flex items-center gap-1.5">
                              <Wrench size={11} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                              <span>Repuesto:</span>
                              <strong className="text-neutral-700 dark:text-neutral-300 font-semibold">
                                {event.repuesto_requerido}
                              </strong>
                            </span>
                          )}

                          {event.repuesto_requerido && extraCost > 0 && (
                            <span className="text-neutral-300 dark:text-neutral-700 select-none">·</span>
                          )}

                          {extraCost > 0 && (() => {
                            const incIsAprobado = event.aprobado_por_cliente === true || event.estado_aprobacion === 'APROBADO';
                            const incIsRechazado =
                              event.rechazado_por_cliente === true ||
                              event.estado_aprobacion === 'RECHAZADO' ||
                              (!event.aprobado_por_cliente && !!event.fecha_aprobacion);

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
                                    <span className="text-[10px] text-rose-500 dark:text-rose-400 ml-0.5">(Descartado)</span>
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

                      {/* Cuadrícula de fotos */}
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
                                onClick={() => onPhotoClick?.(foto.url || foto.url_foto)}
                                className={`aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 relative bg-neutral-100 dark:bg-neutral-900 shadow-2xs transition-all ${
                                  onPhotoClick ? 'cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700' : ''
                                }`}
                                title={onPhotoClick ? 'Ver imagen en tamaño completo' : undefined}
                              >
                                <img
                                  src={foto.url || foto.url_foto}
                                  alt={`Evidencia ${fIdx + 1}`}
                                  className="w-full h-full object-cover"
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

              // ─────────────────────────────────────────────────────────────
              // CASO 2: EVENTO DE CAMBIO DE ESTADO (BITÁCORA PRINCIPAL)
              // ─────────────────────────────────────────────────────────────
              const normCode = normalizeStateCode(
                event.codigo_estado,
                event.nombre_estado || event.estado,
                event.orden_flujo
              );
              const estadoColor = event.color_badge || STATE_COLOR_MAP[normCode] || '#EF4444';
              const EstadoIcon = getStateIcon(normCode);
              const estadoLabel = event.nombre_estado || event.estado || normCode.replace(/_/g, ' ');

              // Evaluación de notas para cliente vs notas internas
              const rawNote = event.nota_cambio;
              let displayNote = null;

              if (isPublic) {
                // En modo público: si hay nota que NO es del sistema, se muestra; si es del sistema o no hay, mensaje explicativo
                if (rawNote && !isInternalSystemNote(rawNote)) {
                  displayNote = rawNote;
                } else {
                  displayNote = PUBLIC_STATE_DESCRIPTIONS[normCode] || null;
                }
              } else {
                displayNote = rawNote;
              }

              const itemFotos = Array.isArray(event.fotos) ? event.fotos : [];

              return (
                <div key={event._timelineKey || `est-${event.id || idx}`} className="relative group">
                  {/* Línea vertical conectora punteada/discontinua */}
                  {!isLast && (
                    <div className="absolute -left-[19px] top-3 -bottom-6 w-0 border-l-2 border-dashed border-neutral-300 dark:border-neutral-700" />
                  )}

                  {/* Nodo anillado hueco con borde del color del estado */}
                  <div
                    className="absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-[#18181b] shrink-0 z-10"
                    style={{ borderColor: estadoColor }}
                  />

                  {/* Contenido del Estado */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="flex items-center gap-1.5">
                        <EstadoIcon size={14} className="shrink-0 stroke-[2.2]" style={{ color: estadoColor }} />
                        <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
                          {estadoLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500 font-inter">
                        {!isPublic && event.usuario_nombre && (
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

                    {/* Mensaje descriptivo o nota */}
                    {displayNote && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 font-inter leading-relaxed bg-neutral-50 dark:bg-neutral-800/40 rounded-xl p-2.5 border border-neutral-200/50 dark:border-neutral-800/60 whitespace-pre-wrap">
                        {displayNote}
                      </p>
                    )}

                    {/* Evidencias fotográficas del estado */}
                    {itemFotos.length > 0 && (
                      <div className="pt-2 space-y-2">
                        <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon size={13} />
                          <span>Evidencias Fotográficas ({itemFotos.length})</span>
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {itemFotos.map((foto, fIdx) => (
                            <div
                              key={foto.id || fIdx}
                              onClick={() => onPhotoClick?.(foto.url || foto.url_foto)}
                              className={`aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 relative bg-neutral-100 dark:bg-neutral-900 shadow-2xs transition-all ${
                                onPhotoClick ? 'cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700' : ''
                              }`}
                              title={onPhotoClick ? 'Ver imagen en tamaño completo' : undefined}
                            >
                              <img
                                src={foto.url || foto.url_foto}
                                alt={`Evidencia ${fIdx + 1}`}
                                className="w-full h-full object-cover"
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
  );
};

export default ServiceTimeline;
