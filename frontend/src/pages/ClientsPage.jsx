import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ClientModal from '../components/clients/ClientModal';
import ClienteDetalleModal from '../components/clients/ClienteDetalleModal';
import ConfirmModal from '../components/common/ConfirmModal';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import Pagination from '../components/common/Pagination';
import ResetFiltersButton from '../components/common/ResetFiltersButton';
import AnimatedIconButton from '../components/common/AnimatedIconButton';
import { useAuth } from '../context/AuthContext';
import { getClients, getClientById, toggleClientStatus } from '../services/clients.service';
import { sileo } from 'sileo';
import { RotateCcw } from 'lucide';
import {
  UserPlus,
  Search,
  Eye,
  Edit2,
  Power,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Users,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export const ClientsPage = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const userRole = currentUser?.rol_nombre;

  // Permisos RBAC
  const canCreateEdit = ['SuperAdmin', 'Admin_Sucursal', 'Secretaria'].includes(userRole);
  const canToggleStatus = ['SuperAdmin', 'Admin_Sucursal'].includes(userRole);
  const isReadOnlyRole = userRole === 'Tecnico';

  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Estados de modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedClienteView, setSelectedClienteView] = useState(null);

  // Estado de modal de confirmación para toggle de estado
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    client: null,
    isLoading: false
  });

  // Opciones formateadas para el selector de estado
  const statusOptions = useMemo(() => [
    { id: 'all', label: 'Todos los Estados' },
    { id: 'active', label: 'Solo Activos' },
    { id: 'inactive', label: 'Solo Inactivos' }
  ], []);

  // Debounce para búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Carga de datos con paginación
  const fetchClients = useCallback(async (targetPage = page, targetLimit = limit) => {
    try {
      setIsLoading(true);
      const params = {
        page: targetPage,
        limit: targetLimit,
        estado: selectedStatus
      };
      if (debouncedSearch.trim()) {
        params.q = debouncedSearch.trim();
      }

      const res = await getClients(params);

      // Normalizar la extracción de datos con fallbacks seguros
      const items = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.clientes)
            ? res.clientes
            : Array.isArray(res?.data?.clientes)
              ? res.data.clientes
              : Array.isArray(res?.data?.data)
                ? res.data.data
                : [];

      setClients(items);

      // Normalizar la paginación con valores seguros por defecto
      const pag = res?.pagination || res?.data?.pagination || {
        total: items.length,
        page: Number(targetPage) || 1,
        limit: Number(targetLimit) || 20,
        totalPages: Math.ceil(items.length / (Number(targetLimit) || 20)) || 1
      };

      const safeTotal = Number(pag.total) >= 0 ? Number(pag.total) : items.length;
      const safePage = Number(pag.page) || Number(targetPage) || 1;
      const safeLimit = Number(pag.limit) || Number(targetLimit) || 20;
      const safeTotalPages = Number(pag.totalPages) || Math.ceil(safeTotal / safeLimit) || 1;

      setPagination({
        total: safeTotal,
        page: safePage,
        limit: safeLimit,
        totalPages: safeTotalPages
      });
      setPage(safePage);
      setLimit(safeLimit);
      return true;
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      setClients([]);
      setPagination({ total: 0, page: 1, limit: 20, totalPages: 1 });
      sileo.error({
        title: 'Error de carga',
        description: 'No se pudo obtener el listado de clientes del servidor.'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedStatus, page, limit]);

  // Recarga reactiva al cambiar filtros (reinicia a página 1)
  useEffect(() => {
    setPage(1);
    fetchClients(1, limit);
  }, [debouncedSearch, selectedStatus]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchClients(newPage, limit);
  };

  const handleItemsPerPageChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    fetchClients(1, newLimit);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedStatus('all');
    setPage(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const success = await fetchClients(page, limit);
    setIsRefreshing(false);
    if (success) {
      setRefreshSuccess(true);
    }
  };

  const [sortConfig, setSortConfig] = useState({ key: 'registro', direction: 'desc' });

  const handleSort = (columnKey) => {
    setSortConfig((prev) => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedClients = useMemo(() => {
    const items = Array.isArray(clients) ? [...clients] : [];
    if (!sortConfig.key) return items;

    return items.sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortConfig.key) {
        case 'cliente':
          valA = `${a.nombre || ''} ${a.apellido || ''}`.trim().toLowerCase();
          valB = `${b.nombre || ''} ${b.apellido || ''}`.trim().toLowerCase();
          break;
        case 'contacto':
          valA = (a.cedula_rnc || a.telefono || a.correo || '').toLowerCase();
          valB = (b.cedula_rnc || b.telefono || b.correo || '').toLowerCase();
          break;
        case 'direccion':
          valA = (a.direccion || '').toLowerCase();
          valB = (b.direccion || '').toLowerCase();
          break;
        case 'estado':
          valA = a.activo ? 1 : 0;
          valB = b.activo ? 1 : 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        case 'registro':
        default:
          valA = new Date(a.created_at || 0).getTime();
          valB = new Date(b.created_at || 0).getTime();
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clients, sortConfig]);

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={13} strokeWidth={2.5} className="text-red-600 dark:text-red-400 shrink-0 transition-transform" />
    ) : (
      <ChevronDown size={13} strokeWidth={2.5} className="text-red-600 dark:text-red-400 shrink-0 transition-transform" />
    );
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    selectedStatus !== 'all'
  );

  const getInitials = (nombre, apellido) => {
    const n = nombre ? nombre.charAt(0).toUpperCase() : '';
    const a = apellido ? apellido.charAt(0).toUpperCase() : '';
    return `${n}${a}` || 'CL';
  };

  const handleOpenCreateModal = () => {
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (client) => {
    setSelectedClienteView(client);
    setIsViewModalOpen(true);
  };

  // Deep-link desde búsqueda global: /clientes?clienteId=
  useEffect(() => {
    const clienteId = searchParams.get('clienteId');
    if (!clienteId) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const res = await getClientById(clienteId);
        const client = res?.data || res?.cliente || res;
        if (!cancelled && client?.id) {
          setSelectedClienteView(client);
          setIsViewModalOpen(true);
        }
      } catch (err) {
        console.warn('No se pudo abrir el cliente desde la URL:', err?.message);
      } finally {
        if (!cancelled) {
          const next = new URLSearchParams(searchParams);
          next.delete('clienteId');
          setSearchParams(next, { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  // Manejo de alternado de estado lógico
  const handleOpenConfirmToggle = (client) => {
    setConfirmModalState({
      isOpen: true,
      client,
      isLoading: false
    });
  };

  const handleConfirmToggle = async () => {
    const client = confirmModalState.client;
    if (!client) return;

    setConfirmModalState((prev) => ({ ...prev, isLoading: true }));

    try {
      const res = await toggleClientStatus(client.id);
      if (res.success) {
        setClients((prev) =>
          prev.map((c) => (c.id === client.id ? { ...c, activo: res.data.activo } : c))
        );
        sileo.success({
          title: client.activo ? 'Cliente desactivado' : 'Cliente activado',
          description: res.message
        });
      }
    } catch (error) {
      console.error('Error al cambiar estado del cliente:', error);
      sileo.error({
        title: 'Error al cambiar estado',
        description: error.response?.data?.message || 'No se pudo actualizar el estado del cliente.'
      });
    } finally {
      setConfirmModalState({
        isOpen: false,
        client: null,
        isLoading: false
      });
    }
  };

  const handleModalSuccess = (savedClient) => {
    fetchClients(page, limit);
  };

  const activeCount = useMemo(() => clients.filter((c) => c.activo).length, [clients]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Contenedor Superior Integrado (Encabezado + Filtros) */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Fila Superior: Título, subtítulo y botones de acción */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-outfit">
                Gestión de Clientes
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
                Directorio y cartera de clientes para órdenes de servicio técnico y reparaciones.
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
                ariaLabel="Refrescar lista de clientes"
              />
              {canCreateEdit && (
                <button
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl shadow-xs hover:shadow-md transition-all font-inter cursor-pointer"
                >
                  <UserPlus size={17} />
                  <span>Nuevo Cliente</span>
                </button>
              )}
            </div>
          </div>

          {/* Fila Inferior: Buscador y Filtros */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 w-full">
              {/* Buscador Prominente Dinámico */}
              <div className="relative flex-1 min-w-[240px] sm:min-w-[280px] w-full">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, cédula/RNC, teléfono, correo..."
                  className="w-full pl-9 pr-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>

              {/* Selectores Dinámicos y Botón Limpiar */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto flex-1 lg:flex-initial">
                {/* Selector Estado */}
                <div className="flex-1 sm:flex-initial min-w-[140px] sm:min-w-[160px]">
                  <Select
                    value={selectedStatus}
                    onChange={(val) => setSelectedStatus(val)}
                    items={statusOptions}
                    placeholder="Todos los Estados"
                  />
                </div>

                {/* Botón Acción Limpiar Filtros con MorphIcon */}
                <ResetFiltersButton
                  onClick={handleClearFilters}
                  hasActiveFilters={hasActiveFilters}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Clientes */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto overflow-y-auto h-[560px] relative">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-[#141416] shadow-xs">
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-inter">
                  <th
                    onClick={() => handleSort('cliente')}
                    className="py-3 px-3 sm:px-4.5 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[19%] min-w-[150px] cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cliente</span>
                      {renderSortIcon('cliente')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('contacto')}
                    className="py-3 px-3 sm:px-4.5 bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Contacto</span>
                      {renderSortIcon('contacto')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('direccion')}
                    className="py-3 px-3 sm:px-4.5 bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Dirección</span>
                      {renderSortIcon('direccion')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('registro')}
                    className="py-3 px-3 sm:px-4.5 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[145px] min-w-[135px] whitespace-nowrap cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Registro</span>
                      {renderSortIcon('registro')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('estado')}
                    className="py-3 px-3 sm:px-4.5 text-center bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[110px] cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Estado</span>
                      {renderSortIcon('estado')}
                    </div>
                  </th>
                  <th className="py-3 px-2.5 sm:px-3 text-center w-[80px] bg-neutral-50 dark:bg-[#141416] sticky top-0">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 font-inter text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="animate-spin text-red-500" size={28} />
                        <span className="text-sm">Cargando cartera de clientes...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="text-neutral-300 dark:text-neutral-600" size={36} />
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          No se encontraron clientes
                        </p>
                        <p className="text-xs text-neutral-400">
                          {hasActiveFilters
                            ? 'Prueba ajustando los filtros de búsqueda.'
                            : 'Aún no hay clientes registrados en el sistema.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (sortedClients || []).map((client) => {
                    const fullName = `${client.nombre} ${client.apellido || ''}`.trim();
                    const initials = getInitials(client.nombre, client.apellido);
                    const formattedDate = client.created_at
                      ? new Date(client.created_at).toLocaleDateString('es-DO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'N/A';

                    return (
                      <tr
                        key={client.id}
                        onClick={() => handleOpenViewModal(client)}
                        className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-all cursor-pointer ${
                          client.activo ? '' : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        {/* Columna 1: Cliente (Avatar + Nombre + Cédula) */}
                        <td className="py-3 px-3 sm:px-4.5 align-middle">
                          <div
                            className="flex items-center gap-2.5 group"
                            title="Ver detalles del cliente"
                          >
                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 group-hover:scale-105 group-hover:bg-red-200 dark:group-hover:bg-red-900/80 flex items-center justify-center font-bold text-xs shrink-0 border border-red-200/60 dark:border-red-900/40 overflow-hidden relative font-outfit transition-all">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm whitespace-normal break-words leading-snug group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                {fullName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-400">
                                <CreditCard size={11} className="shrink-0" />
                                <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                                  {client.cedula_rnc || 'Sin documento'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Columna 2: Contacto (Teléfonos + Correo) */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 font-mono font-medium">
                              <Phone size={12} className="text-neutral-400 shrink-0" />
                              <span>{client.telefono}</span>
                              {client.telefono_adicional && (
                                <span className="text-neutral-400">
                                  / {client.telefono_adicional}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                              <Mail size={12} className="text-neutral-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{client.correo || 'Sin correo'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Columna 3: Dirección (Multilínea con ajuste de texto) */}
                        <td className="py-3.5 px-4 sm:px-6 max-w-xs">
                          {client.direccion ? (
                            <div className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-300 break-words leading-relaxed whitespace-normal">
                              <MapPin size={13} className="text-neutral-400 shrink-0 mt-0.5" />
                              <span>{client.direccion}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400 italic">No especificada</span>
                          )}
                        </td>

                        {/* Columna 4: Fecha de Registro */}
                        <td className="py-3.5 px-3 sm:px-4.5 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                            <Calendar size={12} className="text-neutral-400 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Columna 5: Estado */}
                        <td className="py-3.5 px-4 sm:px-6 text-center align-middle">
                          <Badge
                            variant="minimal"
                            color={client.activo ? 'success' : 'neutral'}
                            icon={client.activo ? CheckCircle2 : XCircle}
                            className="font-medium"
                          >
                            {client.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>

                        {/* Columna 6: Acciones */}
                        <td className="py-3 px-2.5 sm:px-3 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenViewModal(client);
                              }}
                              title="Ver detalles del cliente"
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                              <Eye size={16} />
                            </button>
                            {canCreateEdit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(client);
                                }}
                                title="Editar cliente"
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            {canToggleStatus && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenConfirmToggle(client);
                                }}
                                title={client.activo ? 'Desactivar cliente' : 'Activar cliente'}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                <Power size={15} />
                              </button>
                            )}
                            {isReadOnlyRole && (
                              <span className="text-xs text-neutral-400 dark:text-neutral-600 font-inter italic px-2">
                                Solo lectura
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación Reutilizable */}
          <Pagination
            currentPage={Number(pagination?.page) || Number(page) || 1}
            totalPages={Number(pagination?.totalPages) || 1}
            totalItems={Number(pagination?.total) >= 0 ? Number(pagination.total) : 0}
            itemsPerPage={Number(pagination?.limit) || Number(limit) || 20}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            pageSizeOptions={[10, 20, 50, 100]}
            isLoading={isLoading || isRefreshing}
          />
        </div>
      </div>

      {/* Modal de Detalle / Ficha del Cliente */}
      <ClienteDetalleModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedClienteView(null);
        }}
        cliente={selectedClienteView}
        onEdit={canCreateEdit ? (c) => handleOpenEditModal(c) : null}
      />

      {/* Modal de Creación / Edición */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        client={selectedClient}
      />

      {/* Modal de Confirmación para Alternar Estado */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() =>
          setConfirmModalState({ isOpen: false, client: null, isLoading: false })
        }
        onConfirm={handleConfirmToggle}
        isLoading={confirmModalState.isLoading}
        title={
          confirmModalState.client?.activo
            ? '¿Desactivar este cliente?'
            : '¿Activar este cliente?'
        }
        description={
          confirmModalState.client?.activo
            ? `El cliente "${confirmModalState.client?.nombre} ${confirmModalState.client?.apellido || ''}". El registro se mantendrá en el historial pero no estará activo por defecto.`
            : `El cliente "${confirmModalState.client?.nombre} ${confirmModalState.client?.apellido || ''}" volverá a estar disponible para asociarlo a nuevas órdenes de servicio técnico.`
        }
        confirmText={
          confirmModalState.client?.activo ? 'Sí, desactivar' : 'Sí, activar'
        }
        cancelText="Cancelar"
        variant={confirmModalState.client?.activo ? 'danger' : 'info'}
      />
    </DashboardLayout>
  );
};

export default ClientsPage;
