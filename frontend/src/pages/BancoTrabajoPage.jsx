import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import AnimatedTabs from '../components/common/AnimatedTabs';
import TallerCard from '../components/taller/TallerCard';
import FichaTecnicaModal from '../components/taller/FichaTecnicaModal';
import ResetFiltersButton from '../components/common/ResetFiltersButton';
import AnimatedIconButton from '../components/common/AnimatedIconButton';
import { useAuth } from '../context/AuthContext';
import {
  getServiciosTaller,
  updateServicioEstado,
  assignTecnicoServicio
} from '../services/servicios.service';
import { getEstados } from '../services/catalogs.service';
import { sileo } from 'sileo';
import { RotateCcw } from 'lucide';
import {
  LayoutGrid,
  List,
  Search,
  Wrench,
  Clock,
  Flame,
  User,
  Users,
  Layers,
  UserCheck,
  Inbox,
  Package,
  ClipboardCheck,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  X,
  Filter
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

const getEstadoIcon = (estado) => {
  const flujo = Number(estado.orden_flujo);
  const cod = (estado.codigo_estado || '').toUpperCase();
  const nom = (estado.nombre_estado || '').toLowerCase();

  if (flujo === 1 || cod.includes('RECIB') || nom.includes('recib')) return Package;
  if (flujo === 2 || cod.includes('DIAGN') || nom.includes('diagn')) return Search;
  if (flujo === 3 || cod.includes('ESPERA') || cod.includes('REPUESTO') || nom.includes('espera') || nom.includes('repuesto')) return Clock;
  if (flujo === 4 || cod.includes('REPARAC') || cod.includes('PROCESO') || nom.includes('reparac') || nom.includes('proceso')) return Wrench;
  if (flujo === 5 || cod.includes('CALIDAD') || cod.includes('CONTROL') || nom.includes('calidad') || nom.includes('control')) return ClipboardCheck;
  if (flujo === 6 || cod.includes('LISTO') || cod.includes('ENTREGA') || nom.includes('listo') || nom.includes('entrega')) return CheckCircle2;
  return Package;
};

const getColumnTitle = (estado) => {
  const flujo = Number(estado.orden_flujo);
  const cod = (estado.codigo_estado || '').toUpperCase();
  if (flujo === 1 || cod === 'RECIBIDO') return 'Recibido';
  if (flujo === 3 || cod.includes('ESPERA')) return 'Esperando Repuesto';
  if (flujo === 4 || cod.includes('REPARAC')) return 'En Reparación';
  if (flujo === 5 || cod.includes('CALIDAD') || cod.includes('CONTROL')) return 'Control de Calidad';
  return estado.nombre_estado;
};

export const BancoTrabajoPage = () => {
  const { user: currentUser } = useAuth();

  const [ordenes, setOrdenes] = useState([]);
  const [estados, setEstados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Vistas y Filtros
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'mine' | 'unassigned' | 'urgent'
  const [searchTerm, setSearchTerm] = useState('');

  // Ordenamiento interactivo para vista tabla
  const [sortConfig, setSortConfig] = useState({ key: 'prioridad', direction: 'desc' });

  // Modal de Ficha Técnica
  const [selectedOrdenId, setSelectedOrdenId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Carga inicial
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [estadosRes, tallerRes] = await Promise.all([
        getEstados().catch(() => ({ data: [] })),
        getServiciosTaller().catch(() => ({ data: [] }))
      ]);

      const rawEstados = estadosRes?.data || [];
      // Filtrar los 6 estados de taller (orden_flujo 1 a 6)
      const tallerEstados = rawEstados.filter((e) => e.orden_flujo >= 1 && e.orden_flujo <= 6);
      setEstados(tallerEstados);

      setOrdenes(tallerRes?.data || []);
    } catch (err) {
      console.error('Error al cargar datos del taller:', err);
      sileo.error({ title: 'Error', description: 'No se pudieron cargar las órdenes de taller.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
      setRefreshSuccess(true);
    } catch {
      // error handled in fetchData
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtrado de órdenes
  const filteredOrdenes = useMemo(() => {
    return ordenes.filter((o) => {
      // 1. Buscador rápido (ticket, cliente, equipo, falla)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const ticket = (o.codigo_ticket || '').toLowerCase();
        const client = (o.cliente || o.nombre_cliente || '').toLowerCase();
        const equipment = `${o.marca_equipo || ''} ${o.modelo_equipo || ''}`.toLowerCase();
        const fault = (o.falla_reportada || '').toLowerCase();

        if (
          !ticket.includes(term) &&
          !client.includes(term) &&
          !equipment.includes(term) &&
          !fault.includes(term)
        ) {
          return false;
        }
      }

      // 2. Segmented control
      if (quickFilter === 'mine') {
        const currentUserId = currentUser?.id;
        const currentUsername = (currentUser?.usuario || '').toLowerCase();
        const currentFullName = `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim().toLowerCase();

        const isMine =
          (Array.isArray(o.tecnicos) && o.tecnicos.some((t) =>
            t.id === currentUserId ||
            (t.usuario && t.usuario.toLowerCase() === currentUsername) ||
            (t.nombre_completo && t.nombre_completo.toLowerCase() === currentFullName)
          )) ||
          o.tecnico_id === currentUserId;

        if (!isMine) return false;
      } else if (quickFilter === 'unassigned') {
        const hasTecnicos = Array.isArray(o.tecnicos) && o.tecnicos.length > 0;
        const isUnassigned = !hasTecnicos || (!o.tecnico_id && o.tecnico_nombre === 'Sin asignar');
        if (!isUnassigned) return false;
      } else if (quickFilter === 'urgent') {
        if (String(o.prioridad).toLowerCase() !== 'urgente') return false;
      }

      return true;
    });
  }, [ordenes, searchTerm, quickFilter, currentUser?.id]);

  // Manejo de ordenamiento para la tabla
  const handleSort = (columnKey) => {
    setSortConfig((prev) => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const priorityWeight = { urgente: 3, alta: 2, media: 1, baja: 0 };

  const sortedOrdenes = useMemo(() => {
    const items = [...filteredOrdenes];
    if (!sortConfig.key) return items;

    return items.sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortConfig.key) {
        case 'ticket':
          valA = (a.codigo_ticket || '').toLowerCase();
          valB = (b.codigo_ticket || '').toLowerCase();
          break;
        case 'equipo':
          valA = `${a.marca_equipo || ''} ${a.modelo_equipo || ''}`.toLowerCase();
          valB = `${b.marca_equipo || ''} ${b.modelo_equipo || ''}`.toLowerCase();
          break;
        case 'falla':
          valA = (a.falla_reportada || '').toLowerCase();
          valB = (b.falla_reportada || '').toLowerCase();
          break;
        case 'estado':
          valA = a.orden_flujo ?? 0;
          valB = b.orden_flujo ?? 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        case 'prioridad': {
          const prioA = (a.prioridad || '').toLowerCase();
          const prioB = (b.prioridad || '').toLowerCase();
          valA = priorityWeight[prioA] ?? 0;
          valB = priorityWeight[prioB] ?? 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        case 'asignado':
          valA = (a.tecnico_nombre || '').toLowerCase();
          valB = (b.tecnico_nombre || '').toLowerCase();
          break;
        case 'tiempo':
        default:
          valA = new Date(a.created_at || 0).getTime();
          valB = new Date(b.created_at || 0).getTime();
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrdenes, sortConfig]);

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={13} strokeWidth={2.5} className="text-red-600 dark:text-red-400 shrink-0 transition-transform" />
    ) : (
      <ChevronDown size={13} strokeWidth={2.5} className="text-red-600 dark:text-red-400 shrink-0 transition-transform" />
    );
  };

  // Transición de estado (botón rápido o modal)
  const handleQuickAdvance = async (orden, nextEstado) => {
    try {
      const res = await updateServicioEstado(orden.id, {
        nuevo_estado_id: nextEstado.id,
        notas: `Avanzado a ${nextEstado.nombre_estado} desde el tablero de taller.`
      });

      if (res.ok && res.data) {
        sileo.success({
          title: 'Estado actualizado',
          description: `Orden #${orden.codigo_ticket} movida a "${nextEstado.nombre_estado}".`
        });
        // Actualizar en el estado local inmediato
        setOrdenes((prev) =>
          prev.map((o) => (o.id === orden.id ? { ...o, ...res.data } : o))
        );
      }
    } catch (err) {
      console.error('Error al avanzar orden:', err);
      sileo.error({
        title: 'Error',
        description: err.response?.data?.message || 'No se pudo actualizar el estado de la orden.'
      });
    }
  };

  const handleModalEstadoUpdated = async (ordenId, nuevoEstadoId, notas) => {
    const res = await updateServicioEstado(ordenId, {
      nuevo_estado_id: nuevoEstadoId,
      notas
    });

    if (res.ok && res.data) {
      sileo.success({
        title: 'Estado actualizado',
        description: res.message || 'La orden se actualizó correctamente.'
      });
      setOrdenes((prev) =>
        prev.map((o) => (o.id === ordenId ? { ...o, ...res.data } : o))
      );
    }
  };

  const openFicha = (orden) => {
    setSelectedOrdenId(orden.id);
    setIsModalOpen(true);
  };

  const hasActiveFilters = Boolean(searchTerm.trim() || quickFilter !== 'all');

  const handleClearFilters = () => {
    setSearchTerm('');
    setQuickFilter('all');
  };

  // Asignarse a sí mismo directamente desde la tarjeta
  const handleSelfAssign = async (ordenId) => {
    try {
      const res = await assignTecnicoServicio(ordenId, currentUser?.id);
      if (res.ok && res.data) {
        sileo.success({
          title: 'Asignación confirmada',
          description: 'Te has unido exitosamente como técnico de esta orden.'
        });
        setOrdenes((prev) =>
          prev.map((o) =>
            o.id === ordenId
              ? {
                  ...o,
                  tecnicos: res.data.tecnicos,
                  tecnico_nombre: res.data.tecnicos[0]?.nombre_completo || currentUser?.nombre
                }
              : o
          )
        );
      }
    } catch (err) {
      console.error('Error al unirse a la orden:', err);
      sileo.error({
        title: 'Error',
        description: err.response?.data?.message || 'No se pudo completar la asignación.'
      });
    }
  };

  const handleTecnicosUpdated = (ordenId, updatedTecnicos) => {
    setOrdenes((prev) =>
      prev.map((o) =>
        o.id === ordenId
          ? {
              ...o,
              tecnicos: updatedTecnicos,
              tecnico_nombre: updatedTecnicos[0]?.nombre_completo || 'Sin asignar'
            }
          : o
      )
    );
  };

  // Conteo para los segmented controls
  const counts = useMemo(() => {
    const currentUserId = currentUser?.id;
    const currentUsername = (currentUser?.usuario || '').toLowerCase();
    const currentFullName = `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim().toLowerCase();

    let mine = 0;
    let unassigned = 0;
    let urgent = 0;

    ordenes.forEach((o) => {
      const isMine =
        (Array.isArray(o.tecnicos) && o.tecnicos.some((t) =>
          t.id === currentUserId ||
          (t.usuario && t.usuario.toLowerCase() === currentUsername) ||
          (t.nombre_completo && t.nombre_completo.toLowerCase() === currentFullName)
        )) ||
        o.tecnico_id === currentUserId;

      if (isMine) {
        mine++;
      }

      const hasTecnicos = Array.isArray(o.tecnicos) && o.tecnicos.length > 0;
      const isUnassigned = !hasTecnicos || (!o.tecnico_id && o.tecnico_nombre === 'Sin asignar');
      if (isUnassigned) {
        unassigned++;
      }

      if (String(o.prioridad).toLowerCase() === 'urgente') {
        urgent++;
      }
    });

    return { all: ordenes.length, mine, unassigned, urgent };
  }, [ordenes, currentUser]);

  const viewTabs = useMemo(() => [
    { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { id: 'table', label: 'Tabla', icon: List }
  ], []);

  const filterTabs = useMemo(() => [
    { id: 'all', label: 'Todos', icon: Layers, count: counts.all },
    { id: 'mine', label: 'Mis Asignados', icon: UserCheck, count: counts.mine },
    { id: 'unassigned', label: 'Bolsa General', icon: Inbox, count: counts.unassigned },
    { id: 'urgent', label: 'Urgentes', icon: Flame, iconClassName: 'text-red-500', count: counts.urgent }
  ], [counts]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Contenedor Superior: Encabezado, Switch de Vistas y Filtros */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Fila Superior: Título, Switch de Vistas y Refrescar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-outfit">
                Banco de Trabajo Técnico
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
                Flujo operativo de diagnóstico, intervención y control de calidad en taller.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              {/* Switch Visual de Vistas (Kanban vs Tabla) */}
              <AnimatedTabs
                items={viewTabs}
                value={viewMode}
                onChange={setViewMode}
                size="sm"
              />

              {/* Botón Refrescar */}
              <AnimatedIconButton
                icon={RotateCcw}
                loading={isRefreshing}
                success={refreshSuccess}
                onSuccessEnd={() => setRefreshSuccess(false)}
                onClick={handleRefresh}
                title="Refrescar taller"
                ariaLabel="Refrescar taller"
              />
            </div>
          </div>

          {/* Fila Inferior: Buscador y Segmented Controls Rápidos */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Segmented Controls Rápidos */}
            <AnimatedTabs
              items={filterTabs}
              value={quickFilter}
              onChange={setQuickFilter}
              size="sm"
            />

            {/* Buscador Rápido y Reset */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar ticket, equipo, cliente..."
                  className="w-full pl-9 pr-8 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <ResetFiltersButton
                onClick={handleClearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>
        </div>

        {/* VISTA KANBAN */}
        {viewMode === 'kanban' && (
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-w-[1100px]">
              {estados.map((estado) => {
                const ordenesColumna = filteredOrdenes.filter(
                  (o) => o.estado_id === estado.id || o.codigo_estado === estado.codigo_estado
                );
                const EstadoIcon = getEstadoIcon(estado);

                return (
                  <div
                    key={estado.id}
                    className="flex flex-col rounded-2xl bg-neutral-100/60 dark:bg-[#121214] border border-neutral-200/70 dark:border-neutral-800/80 p-1.5 min-h-[500px] max-h-[700px]"
                  >
                    {/* Encabezado de Columna */}
                    <div className="flex items-center justify-between gap-2 px-1.5 py-1.5 mb-1.5 border-b border-neutral-200/60 dark:border-neutral-800/60 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <EstadoIcon
                          size={16}
                          className="shrink-0 stroke-[2.2]"
                          style={{ color: estado.color_badge || '#6B7280' }}
                        />
                        <h3 className="font-outfit font-medium text-xs text-neutral-700 dark:text-neutral-300 whitespace-normal leading-tight">
                          {getColumnTitle(estado)}
                        </h3>
                      </div>

                      <span className="font-bold text-sm text-neutral-900 dark:text-white shrink-0">
                        {ordenesColumna.length}
                      </span>
                    </div>

                    {/* Lista de Tarjetas */}
                    <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5 min-h-0">
                      {ordenesColumna.length === 0 ? (
                        <div className="py-12 text-center text-xs text-neutral-400 dark:text-neutral-500 font-inter">
                          Sin órdenes en este estado
                        </div>
                      ) : (
                        ordenesColumna.map((ord) => (
                          <TallerCard
                            key={ord.id}
                            orden={ord}
                            onSelect={openFicha}
                            onQuickAdvance={handleQuickAdvance}
                            onSelfAssign={handleSelfAssign}
                            currentUserId={currentUser?.id}
                            allEstados={estados}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VISTA TABLA (BANDEJA TÉCNICA) */}
        {viewMode === 'table' && (
          <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
            <div className="w-full overflow-x-auto overflow-y-auto h-[560px] relative">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-[#141416] shadow-xs">
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-inter">
                    <th
                      onClick={() => handleSort('ticket')}
                      className="py-3 px-3 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[12%] min-w-[110px] cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Ticket</span>
                        {renderSortIcon('ticket')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('equipo')}
                      className="py-3 px-3 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[18%] min-w-[150px] cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Equipo</span>
                        {renderSortIcon('equipo')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('falla')}
                      className="py-3 px-3 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[24%] min-w-[180px] cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Falla Reportada</span>
                        {renderSortIcon('falla')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('estado')}
                      className="py-3 px-3 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[16%] min-w-[140px] cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Estado</span>
                        {renderSortIcon('estado')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('prioridad')}
                      className="py-3 px-3 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[12%] min-w-[100px] cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Prioridad</span>
                        {renderSortIcon('prioridad')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('asignado')}
                      className="py-3 px-3 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[14%] min-w-[120px] cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Asignado A</span>
                        {renderSortIcon('asignado')}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('tiempo')}
                      className="py-3 px-3 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[80px] cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Tiempo</span>
                        {renderSortIcon('tiempo')}
                      </div>
                    </th>

                    <th className="py-3 px-3 text-right w-[60px] bg-neutral-50 dark:bg-[#141416] sticky top-0">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 font-inter text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-neutral-400">
                        Cargando bandeja técnica de taller...
                      </td>
                    </tr>
                  ) : sortedOrdenes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-neutral-400">
                        No hay órdenes activas con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    sortedOrdenes.map((ord) => {
                      const isSinAsignar = !ord.tecnico_id || ord.tecnico_nombre === 'Sin asignar';

                      return (
                        <tr
                          key={ord.id}
                          onClick={() => openFicha(ord)}
                          className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-all cursor-pointer"
                        >
                          {/* Ticket */}
                          <td className="py-3 px-3 align-middle font-mono font-bold text-neutral-900 dark:text-neutral-100">
                            <div>{ord.codigo_ticket}</div>
                            {ord.es_garantia && (
                              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 dark:text-red-400 leading-none mt-1">
                                <ShieldCheck size={11} className="stroke-[2.2] shrink-0" />
                                <span className="leading-none">GARANTÍA</span>
                              </div>
                            )}
                          </td>

                          {/* Equipo */}
                          <td className="py-3 px-3 align-middle">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                              {ord.marca_equipo} {ord.modelo_equipo}
                            </span>
                            <span className="text-[11px] text-neutral-400 truncate block">
                              {ord.cliente || ord.nombre_cliente}
                            </span>
                          </td>

                          {/* Falla */}
                          <td className="py-3 px-3 align-middle max-w-xs truncate text-neutral-600 dark:text-neutral-300">
                            {ord.falla_reportada}
                          </td>

                          {/* Estado */}
                          <td className="py-3 px-3 align-middle">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border"
                              style={{
                                backgroundColor: ord.estado_color ? `${ord.estado_color}15` : '#f3f4f6',
                                color: ord.estado_color || '#374151',
                                borderColor: ord.estado_color ? `${ord.estado_color}40` : '#e5e7eb'
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ord.estado_color }} />
                              {ord.estado}
                            </span>
                          </td>

                          {/* Prioridad */}
                          <td className="py-3 px-3 align-middle capitalize font-semibold text-neutral-700 dark:text-neutral-300">
                            {ord.prioridad}
                          </td>

                          {/* Asignado A */}
                          <td className="py-3 px-3 align-middle">
                            {Array.isArray(ord.tecnicos) && ord.tecnicos.length > 0 ? (
                              <div
                                className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex items-start gap-1 whitespace-normal break-words leading-tight"
                                title={ord.tecnicos.map((t) => t.nombre_completo || t.nombre).join(', ')}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                                <span>
                                  {ord.tecnicos.map((t) => t.nombre_completo || `${t.nombre} ${t.apellido || ''}`.trim()).join(', ')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                  Bolsa general
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Tiempo */}
                          <td className="py-3 px-3 align-middle text-neutral-400 font-mono text-[11px]">
                            {formatTimeAgo(ord.created_at)}
                          </td>

                          {/* Acción */}
                          <td className="py-3 px-3 text-right align-middle">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openFicha(ord);
                              }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="Ver ficha técnica"
                            >
                              <ChevronRight size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumen de conteo */}
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 p-3 border-t border-neutral-100 dark:border-neutral-800">
              <span>
                Mostrando <strong>{sortedOrdenes.length}</strong> de <strong>{ordenes.length}</strong> órdenes en taller
              </span>
            </div>
          </div>
        )}

        {/* Modal de Ficha Técnica */}
        <FichaTecnicaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          ordenId={selectedOrdenId}
          currentUserId={currentUser?.id}
          allEstados={estados}
          onEstadoUpdated={handleModalEstadoUpdated}
          onTecnicosUpdated={handleTecnicosUpdated}
        />
      </div>
    </DashboardLayout>
  );
};

export default BancoTrabajoPage;
