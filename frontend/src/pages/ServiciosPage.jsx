import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import PostCreacionModal from '../components/servicios/PostCreacionModal';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import ResetFiltersButton from '../components/common/ResetFiltersButton';
import AnimatedIconButton from '../components/common/AnimatedIconButton';
import { useAuth } from '../context/AuthContext';
import { getServicios } from '../services/servicios.service';
import { getEstados, getSucursales } from '../services/catalogs.service';
import { getWorkers } from '../services/workers.service';
import { getCompanyProfile, getBranches } from '../services/configuracion.service';
import { sileo } from 'sileo';
import { RotateCcw } from 'lucide';
import {
  Plus,
  Search,
  RefreshCw,
  Ticket,
  Printer,
  User,
  Smartphone,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.sucursales)) return res.data.sucursales;
  if (Array.isArray(res?.sucursales)) return res.sucursales;
  return [];
};

const getPrioridadVariant = (prioridad) => {
  switch (prioridad?.toLowerCase()) {
    case 'urgente':
      return 'danger';
    case 'alta':
      return 'warning';
    case 'media':
      return 'info';
    case 'baja':
    default:
      return 'neutral';
  }
};

const FALLBACK_ESTADOS = [
  { id: 1, codigo_estado: 'RECIBIDO', nombre_estado: 'Recibido en Taller', color_badge: '#3B82F6', orden_flujo: 1 },
  { id: 2, codigo_estado: 'EN_DIAGNOSTICO', nombre_estado: 'En Diagnóstico', color_badge: '#F59E0B', orden_flujo: 2 },
  { id: 3, codigo_estado: 'EN_ESPERA_REPUESTO', nombre_estado: 'En Espera de Repuesto', color_badge: '#EC4899', orden_flujo: 3 },
  { id: 4, codigo_estado: 'EN_REPARACION', nombre_estado: 'En Proceso de Reparación', color_badge: '#8B5CF6', orden_flujo: 4 },
  { id: 5, codigo_estado: 'CONTROL_CALIDAD', nombre_estado: 'Control de Calidad / Pruebas', color_badge: '#06B6D4', orden_flujo: 5 },
  { id: 6, codigo_estado: 'LISTO_ENTREGA', nombre_estado: 'Listo para Entrega', color_badge: '#10B981', orden_flujo: 6 },
  { id: 7, codigo_estado: 'ENTREGADO', nombre_estado: 'Entregado al Cliente', color_badge: '#059669', orden_flujo: 7 },
  { id: 8, codigo_estado: 'CANCELADO', nombre_estado: 'Cancelado / No Reparado', color_badge: '#EF4444', orden_flujo: 8 }
];

export const ServiciosPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.rol_nombre === 'SuperAdmin';

  // Datos de empresa y sucursal para reimpresión
  const [companyData, setCompanyData] = useState(null);
  const [branchData, setBranchData]   = useState(null);

  // Catálogos para filtros
  const [estados, setEstados]         = useState([]);
  const [sucursales, setSucursales]   = useState([]);
  const [tecnicos, setTecnicos]       = useState([]);

  // Estado de la tabla y paginación
  const [ordenes, setOrdenes]         = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [pagination, setPagination]   = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Filtros interactivos
  const [searchTerm, setSearchTerm]             = useState('');
  const [debouncedSearch, setDebouncedSearch]   = useState('');
  const [selectedEstado, setSelectedEstado]     = useState('');
  const [selectedPrioridad, setSelectedPrioridad] = useState('all');
  const [selectedBranch, setSelectedBranch]     = useState('all');
  const [selectedTecnico, setSelectedTecnico]   = useState('all');

  // Modal de reimpresión
  const [ordenAImprimir, setOrdenAImprimir] = useState(null);
  const [showPostCreacion, setShowPostCreacion] = useState(false);

  // Debounce de búsqueda (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Carga de catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [estadosRes, sucursalesRes, workersRes] = await Promise.all([
          getEstados().catch(() => ({ data: [] })),
          getSucursales().catch(() => ({ data: [] })),
          getWorkers({ activo: true }).catch(() => ({ data: [] }))
        ]);

        const estadosArr = extractArray(estadosRes);
        setEstados(estadosArr.length > 0 ? estadosArr : FALLBACK_ESTADOS);
        setSucursales(extractArray(sucursalesRes));

        const allWorkers = extractArray(workersRes);
        const tecnicosList = allWorkers.filter((w) => {
          const rol = (w.rol_nombre || w.nombre_rol || '').toLowerCase();
          return rol.includes('tecnico') || rol.includes('admin') || w.rol_id === 4;
        });
        setTecnicos(tecnicosList.length > 0 ? tecnicosList : allWorkers);
      } catch (err) {
        console.error('Error al cargar catálogos en ServiciosPage:', err);
      }
    };

    loadCatalogs();
  }, []);

  // Carga de datos de empresa y sucursal del usuario
  useEffect(() => {
    getCompanyProfile().then((r) => r.ok && setCompanyData(r.data)).catch(() => {});
    getBranches().then((r) => {
      if (!r.ok) return;
      const branches = r.data || [];
      const userBranch = branches.find((b) => b.id === currentUser?.sucursal_id) || branches[0];
      setBranchData(userBranch || null);
    }).catch(() => {});
  }, [currentUser?.sucursal_id]);

  // Consulta de órdenes con filtros activos
  const fetchOrdenes = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = { page, limit: pagination.limit };
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      if (selectedEstado !== 'all') params.estado_id = selectedEstado;
      if (selectedPrioridad !== 'all') params.prioridad = selectedPrioridad;
      if (selectedBranch !== 'all') params.sucursal_id = selectedBranch;
      if (selectedTecnico !== 'all') params.tecnico_id = selectedTecnico;

      const res = await getServicios(params);
      if (res.ok) {
        setOrdenes(res.data || []);
        setPagination(res.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
        return true;
      }
      return false;
    } catch {
      sileo.error({ title: 'Error', description: 'No se pudo cargar el listado de órdenes.' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedEstado, selectedPrioridad, selectedBranch, selectedTecnico, pagination.limit]);

  // Recarga reactiva al cambiar filtros
  useEffect(() => {
    fetchOrdenes(1);
  }, [debouncedSearch, selectedEstado, selectedPrioridad, selectedBranch, selectedTecnico]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    (selectedEstado && selectedEstado !== 'all') ||
    selectedPrioridad !== 'all' ||
    selectedBranch !== 'all' ||
    selectedTecnico !== 'all'
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedEstado('');
    setSelectedPrioridad('all');
    setSelectedBranch('all');
    setSelectedTecnico('all');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const success = await fetchOrdenes(pagination.page || 1);
    setIsRefreshing(false);
    if (success) {
      setRefreshSuccess(true);
    }
  };

  const handlePostCreacionClose = () => {
    setShowPostCreacion(false);
    setOrdenAImprimir(null);
  };

  // Opciones para los componentes Select
  const estadoOptions = useMemo(() => [
    { id: '', value: '', label: 'Todos los Estados' },
    ...estados.map((e) => ({
      id: String(e.id),
      value: String(e.id),
      label: e.nombre_estado || e.codigo_estado
    }))
  ], [estados]);

  const prioridadOptions = useMemo(() => [
    { id: 'all', label: 'Todas las Prioridades' },
    { id: 'baja', label: 'Baja' },
    { id: 'media', label: 'Media' },
    { id: 'alta', label: 'Alta' },
    { id: 'urgente', label: 'Urgente' }
  ], []);

  const branchOptions = useMemo(() => [
    { id: 'all', label: 'Todas las Sucursales' },
    ...sucursales.map((s) => ({
      id: String(s.id),
      label: s.nombre_sucursal || s.nombre
    }))
  ], [sucursales]);

  const tecnicoOptions = useMemo(() => [
    { id: 'all', label: 'Todos los Técnicos' },
    ...tecnicos.map((t) => ({
      id: String(t.id),
      label: `${t.nombre} ${t.apellido || ''}`.trim()
    }))
  ], [tecnicos]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Contenedor Superior Integrado (Encabezado + Filtros) */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Fila Superior: Título, subtítulo y botones de acción */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-outfit">
                Órdenes de Servicio
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
                Recepción, seguimiento y control de equipos en taller.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <AnimatedIconButton
                icon={RotateCcw}
                loading={isRefreshing}
                success={refreshSuccess}
                onSuccessEnd={() => setRefreshSuccess(false)}
                onClick={handleRefresh}
                title="Refrescar lista"
                ariaLabel="Refrescar lista de órdenes"
              />
              <button
                type="button"
                onClick={() => navigate('/tickets/nueva')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl shadow-xs hover:shadow-md transition-all font-inter cursor-pointer"
              >
                <Plus size={17} />
                <span>Nueva Orden</span>
              </button>
            </div>
          </div>

          {/* Fila Inferior: Buscador Dinámico y Filtros */}
          <div className="space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Buscador Prominente Dinámico */}
              <div className="relative flex-1 max-w-md lg:max-w-lg w-full">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código, cliente, equipo, marca..."
                  className="w-full pl-9 pr-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors font-inter"
                />
              </div>

              {/* Selectores Dinámicos y Botón Limpiar */}
              <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
                {/* Selector Estado */}
                <div className="w-[185px] sm:w-[205px]">
                  <Select
                    value={selectedEstado}
                    onChange={(val) => setSelectedEstado(val)}
                    items={estadoOptions}
                    placeholder="Todos los Estados"
                  />
                </div>

                {/* Selector Prioridad */}
                <div className="w-[140px] sm:w-[155px]">
                  <Select
                    value={selectedPrioridad}
                    onChange={(val) => setSelectedPrioridad(val)}
                    items={prioridadOptions}
                    placeholder="Todas las Prioridades"
                  />
                </div>

                {/* Selector Sucursal (Visible si es SuperAdmin) */}
                {isSuperAdmin && (
                  <div className="w-[145px] sm:w-[165px]">
                    <Select
                      value={selectedBranch}
                      onChange={(val) => setSelectedBranch(val)}
                      items={branchOptions}
                      placeholder="Todas las Sucursales"
                    />
                  </div>
                )}

                {/* Selector Técnico */}
                <div className="w-[140px] sm:w-[160px]">
                  <Select
                    value={selectedTecnico}
                    onChange={(val) => setSelectedTecnico(val)}
                    items={tecnicoOptions}
                    placeholder="Todos los Técnicos"
                  />
                </div>

                {/* Botón Acción Limpiar Filtros con MorphIcon */}
                <ResetFiltersButton
                  onClick={handleClearFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              </div>
            </div>

            {/* Resumen de conteo */}
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-1">
              <span>
                Mostrando <strong>{ordenes.length}</strong> de <strong>{pagination.total}</strong> órdenes registradas
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de Órdenes de Servicio */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-inter">
                  <th className="py-3.5 px-4 sm:px-6">Ticket</th>
                  <th className="py-3.5 px-4 sm:px-6">Cliente</th>
                  <th className="py-3.5 px-4 sm:px-6 hidden md:table-cell">Equipo</th>
                  <th className="py-3.5 px-4 sm:px-6 hidden sm:table-cell">Estado</th>
                  <th className="py-3.5 px-4 sm:px-6 hidden lg:table-cell">Prioridad</th>
                  <th className="py-3.5 px-4 sm:px-6 hidden xl:table-cell">Fecha</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 font-inter text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="animate-spin text-red-500" size={28} />
                        <span className="text-sm">Cargando órdenes...</span>
                      </div>
                    </td>
                  </tr>
                ) : ordenes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Ticket className="text-neutral-300 dark:text-neutral-600" size={36} />
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 font-outfit">
                          No se encontraron órdenes de servicio
                        </p>
                        <p className="text-xs text-neutral-400 font-inter">
                          Prueba ajustando los filtros o registra una nueva orden.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  ordenes.map((orden) => (
                    <tr
                      key={orden.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-all"
                    >
                      {/* Columna 1: Ticket */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="font-mono font-bold text-neutral-900 dark:text-neutral-100 tracking-wider text-sm">
                          {orden.codigo_ticket}
                        </div>
                        {orden.es_garantia && (
                          <span className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold font-inter">
                            GARANTÍA
                          </span>
                        )}
                      </td>

                      {/* Columna 2: Cliente */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-neutral-400 shrink-0" />
                          <span className="text-neutral-800 dark:text-neutral-200 font-medium truncate max-w-[150px]">
                            {orden.nombre_cliente || '—'}
                          </span>
                        </div>
                        {orden.telefono_cliente && (
                          <p className="text-[11px] text-neutral-400 font-inter ml-5.5">
                            {orden.telefono_cliente}
                          </p>
                        )}
                      </td>

                      {/* Columna 3: Equipo */}
                      <td className="py-3.5 px-4 sm:px-6 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Smartphone size={14} className="text-neutral-400 shrink-0" />
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium truncate max-w-[160px]">
                            {orden.marca_equipo} {orden.modelo_equipo}
                          </span>
                        </div>
                        {Array.isArray(orden.tecnicos) && orden.tecnicos.length > 0 ? (
                          <p
                            className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter truncate mt-0.5 flex items-center gap-1"
                            title={orden.tecnicos.map((t) => t.nombre_completo).join(', ')}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {orden.tecnicos.map((t) => t.nombre_completo).join(', ')}
                          </p>
                        ) : (
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-inter truncate mt-0.5">
                            Bolsa general
                          </p>
                        )}
                      </td>

                      {/* Columna 4: Estado con Badge oficial */}
                      <td className="py-3.5 px-4 sm:px-6 hidden sm:table-cell">
                        {orden.estado ? (
                          <Badge
                            size="sm"
                            showDot={false}
                            icon={
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: orden.estado_color || '#6B7280' }}
                              />
                            }
                            className="font-medium"
                            style={{
                              backgroundColor: `${orden.estado_color || '#6B7280'}18`,
                              color: orden.estado_color || '#6B7280',
                              borderColor: `${orden.estado_color || '#6B7280'}35`
                            }}
                          >
                            {orden.estado}
                          </Badge>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </td>

                      {/* Columna 5: Prioridad con Badge institucional */}
                      <td className="py-3.5 px-4 sm:px-6 hidden lg:table-cell">
                        {orden.prioridad ? (
                          <Badge
                            variant={getPrioridadVariant(orden.prioridad)}
                            size="sm"
                            className="capitalize font-medium"
                          >
                            {orden.prioridad}
                          </Badge>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </td>

                      {/* Columna 6: Fecha */}
                      <td className="py-3.5 px-4 sm:px-6 hidden xl:table-cell">
                        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <Calendar size={13} className="shrink-0" />
                          <span className="text-xs font-inter">
                            {orden.created_at
                              ? new Date(orden.created_at).toLocaleDateString('es-DO', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Columna 7: Acciones */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setOrdenAImprimir(orden);
                              setShowPostCreacion(true);
                            }}
                            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                            title="Imprimir comprobante o etiqueta"
                          >
                            <Printer size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-inter">
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} órdenes)
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => fetchOrdenes(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isLoading}
                  className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => fetchOrdenes(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Impresión */}
      <PostCreacionModal
        isOpen={showPostCreacion}
        onClose={handlePostCreacionClose}
        orden={ordenAImprimir}
        companyData={companyData}
        branchData={branchData}
      />
    </DashboardLayout>
  );
};

export default ServiciosPage;