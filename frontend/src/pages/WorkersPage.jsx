import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import WorkerModal from '../components/workers/WorkerModal';
import UsuarioDetalleModal from '../components/workers/UsuarioDetalleModal';
import ConfirmModal from '../components/common/ConfirmModal';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import ResetFiltersButton from '../components/common/ResetFiltersButton';
import AnimatedIconButton from '../components/common/AnimatedIconButton';
import Pagination from '../components/common/Pagination';
import { getWorkers, toggleWorkerStatus } from '../services/workers.service';
import { getRoles, getSucursales } from '../services/catalogs.service';
import { useAuth } from '../context/AuthContext';
import { sileo } from 'sileo';
import { RotateCcw } from 'lucide';
import {
  UserPlus,
  Search,
  Eye,
  Edit2,
  Power,
  Store,
  Phone,
  Mail,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Shield,
  ClipboardList,
  Wrench,
  User,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const getRoleConfig = (rolNombre) => {
  const normalized = (rolNombre || '').toLowerCase().replace(/[\s_-]/g, '');
  if (normalized.includes('superadmin')) {
    return {
      label: 'Super Admin',
      icon: ShieldCheck,
      color: 'danger'
    };
  }
  if (normalized.includes('admin')) {
    return {
      label: 'Admin Sucursal',
      icon: Shield,
      color: 'warning'
    };
  }
  if (normalized.includes('secretaria')) {
    return {
      label: 'Secretaria',
      icon: ClipboardList,
      color: 'purple'
    };
  }
  if (normalized.includes('tecnic')) {
    return {
      label: 'Técnico',
      icon: Wrench,
      color: 'info'
    };
  }
  return {
    label: rolNombre || 'Sin Rol',
    icon: User,
    color: 'neutral'
  };
};

const formatRoleName = (rolNombre) => getRoleConfig(rolNombre).label;

const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.sucursales)) return res.data.sucursales;
  if (Array.isArray(res?.sucursales)) return res.sucursales;
  if (Array.isArray(res?.data?.roles)) return res.data.roles;
  if (Array.isArray(res?.roles)) return res.roles;
  return [];
};

const WorkersPage = () => {
  const { user: currentUser } = useAuth();
  const isBranchAdmin = currentUser?.rol_nombre === 'Admin_Sucursal';
  const isSuperAdmin = currentUser?.rol_nombre === 'SuperAdmin';

  const [workers, setWorkers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isResetting, setIsResetting] = useState(false);

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1
  });

  // Debounce para el buscador textual
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Al cambiar cualquier filtro, reiniciar a la página 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedRole, selectedBranch, selectedStatus]);

  // Estado del Modal de Usuario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  // Estado del Modal de Detalle de Usuario
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedWorkerForView, setSelectedWorkerForView] = useState(null);

  // Estado del Modal de Confirmación
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [workerToToggle, setWorkerToToggle] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  // RBAC: Roles visibles en los filtros para Admin de Sucursal (solo Técnico y Secretaria)
  const filterRoles = useMemo(() => {
    if (isBranchAdmin) {
      return roles.filter((r) => ['Tecnico', 'Secretaria'].includes(r.nombre_rol || r.nombre));
    }
    return roles;
  }, [roles, isBranchAdmin]);

  // RBAC: Comprobar si el usuario en sesión tiene permisos para gestionar a un trabajador específico
  const canManageWorker = (targetWorker) => {
    if (!targetWorker) return false;
    if (isSuperAdmin) return true;
    if (isBranchAdmin) {
      // El Administrador de Sucursal solo puede editar o desactivar Técnicos y Secretarias
      const targetRole = targetWorker.rol_nombre || '';
      return ['Tecnico', 'Secretaria'].includes(targetRole);
    }
    return false;
  };

  const fetchCatalogs = async () => {
    try {
      const [rolesRes, branchesRes] = await Promise.all([
        getRoles().catch(() => ({ data: [] })),
        getSucursales().catch(() => ({ data: [] }))
      ]);
      setRoles(extractArray(rolesRes));
      setSucursales(extractArray(branchesRes));
    } catch (error) {
      console.error('Error al cargar catálogos:', error);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchWorkersData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const params = {
        page,
        limit,
        q: debouncedSearch.trim() || undefined,
        rol_id: selectedRole || undefined,
        sucursal_id: selectedBranch !== 'all' ? selectedBranch : undefined,
        activo: selectedStatus === 'all' ? undefined : selectedStatus === 'active' ? 'true' : 'false'
      };
      const res = await getWorkers(params);
      const data = extractArray(res);
      setWorkers(data);
      if (res?.pagination) {
        setPagination(res.pagination);
      } else {
        setPagination({
          total: data.length,
          page: 1,
          limit: data.length || 20,
          totalPages: 1
        });
      }
    } catch (error) {
      console.error('Error al cargar datos de usuarios:', error);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, selectedRole, selectedBranch, selectedStatus]);

  useEffect(() => {
    fetchWorkersData();
  }, [fetchWorkersData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchCatalogs(), fetchWorkersData(true)]);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2000);
    } catch {
      // error handled in fetchWorkersData
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingWorker(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (worker) => {
    if (!canManageWorker(worker)) {
      sileo.error({
        title: 'Acceso denegado',
        description: 'No tienes permisos para editar a este usuario.'
      });
      return;
    }
    setEditingWorker(worker);
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (worker) => {
    setSelectedWorkerForView(worker);
    setIsViewModalOpen(true);
  };

  // Abrir confirmación antes de alternar estado
  const handleRequestToggleStatus = (worker) => {
    if (currentUser && currentUser.id === worker.id) {
      sileo.warning({
        title: 'Acción no permitida',
        description: 'No puedes desactivar tu propia cuenta mientras tienes una sesión activa.'
      });
      return;
    }

    if (!canManageWorker(worker)) {
      sileo.error({
        title: 'Acceso denegado',
        description: 'No tienes permisos para modificar el estado de este usuario.'
      });
      return;
    }

    setWorkerToToggle(worker);
    setIsConfirmOpen(true);
  };

  // Ejecutar cambio de estado confirmado
  const handleConfirmToggleStatus = async () => {
    if (!workerToToggle) return;

    setIsToggling(true);
    try {
      const apiCall = toggleWorkerStatus(workerToToggle.id);
      await sileo.promise(apiCall, {
        loading: {
          title: workerToToggle.activo ? 'Desactivando usuario...' : 'Activando usuario...'
        },
        success: (res) => ({
          title: workerToToggle.activo ? 'Usuario desactivado' : 'Usuario activado',
          description: res.data?.message || res.message || 'Estado actualizado correctamente'
        }),
        error: (err) => ({
          title: 'Error al cambiar estado',
          description: err.response?.data?.message || 'No se pudo completar la acción'
        })
      });

      // Actualizar estado local inmediato
      setWorkers((prev) =>
        prev.map((w) => (w.id === workerToToggle.id ? { ...w, activo: !w.activo } : w))
      );

      setIsConfirmOpen(false);
      setWorkerToToggle(null);
    } catch (err) {
      console.error('Error al alternar estado:', err);
    } finally {
      setIsToggling(false);
    }
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() || selectedRole || selectedBranch !== 'all' || selectedStatus !== 'all'
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedRole('');
    setSelectedBranch('all');
    setSelectedStatus('all');
    setPage(1);
  };

  const filteredWorkers = workers;

  const [sortConfig, setSortConfig] = useState({ key: 'usuario', direction: 'asc' });

  const handleSort = (columnKey) => {
    setSortConfig((prev) => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedWorkers = useMemo(() => {
    const items = [...workers];
    if (!sortConfig.key) return items;

    // Jerarquía de roles: Super Admin > Admin Sucursal > Secretaria > Técnico
    const getRoleRank = (worker) => {
      const normalized = (worker.rol_nombre || '').toLowerCase().replace(/[\s_-]/g, '');
      if (normalized.includes('superadmin')) return 4;
      if (normalized.includes('admin')) return 3;
      if (normalized.includes('secretaria')) return 2;
      if (normalized.includes('tecnic')) return 1;
      return 0;
    };

    return items.sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortConfig.key) {
        case 'usuario':
          valA = `${a.nombre || ''} ${a.apellido || ''} ${a.usuario || ''}`.trim().toLowerCase();
          valB = `${b.nombre || ''} ${b.apellido || ''} ${b.usuario || ''}`.trim().toLowerCase();
          break;
        case 'contacto':
          valA = (a.cedula || a.correo || a.telefono || '').toLowerCase();
          valB = (b.cedula || b.correo || b.telefono || '').toLowerCase();
          break;
        case 'rol': {
          const rankA = getRoleRank(a);
          const rankB = getRoleRank(b);
          if (rankA !== rankB) {
            return sortConfig.direction === 'asc' ? rankA - rankB : rankB - rankA;
          }
          // Si tienen el mismo rol jerárquico, ordenar por sucursal / nombre
          valA = (a.sucursal_nombre || a.nombre || '').toLowerCase();
          valB = (b.sucursal_nombre || b.nombre || '').toLowerCase();
          break;
        }
        case 'estado':
          valA = a.activo ? 1 : 0;
          valB = b.activo ? 1 : 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        default:
          return 0;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredWorkers, sortConfig]);

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={13} strokeWidth={2.5} className="text-red-600 dark:text-red-400 shrink-0 transition-transform" />
    ) : (
      <ChevronDown size={13} strokeWidth={2.5} className="text-red-600 dark:text-red-400 shrink-0 transition-transform" />
    );
  };

  // Opciones formateadas para los componentes Select
  const roleOptions = useMemo(() => [
    { id: '', label: 'Todos los Roles' },
    ...filterRoles.map((r) => ({
      id: String(r.id),
      label: formatRoleName(r.nombre_rol || r.nombre)
    }))
  ], [filterRoles]);

  const branchOptions = useMemo(() => [
    { id: 'all', label: 'Todas las Sucursales' },
    { id: 'global', label: 'Global / Sin Asignar' },
    ...sucursales.map((s) => ({
      id: String(s.id),
      label: s.nombre_sucursal || s.nombre
    }))
  ], [sucursales]);

  const statusOptions = useMemo(() => [
    { id: 'all', label: 'Todos los Estados' },
    { id: 'active', label: 'Solo Activos' },
    { id: 'inactive', label: 'Solo Inactivos' }
  ], []);

  const getInitials = (nombre, apellido) => {
    const n = nombre ? nombre.charAt(0).toUpperCase() : '';
    const a = apellido ? apellido.charAt(0).toUpperCase() : '';
    return `${n}${a}` || 'US';
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Contenedor Superior Integrado (Encabezado + Filtros) */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Fila Superior: Título, subtítulo y botones de acción */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-outfit">
                Gestión de Usuarios
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
                Administración de accesos, roles y personal técnico de las sucursales.
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
                ariaLabel="Refrescar lista de usuarios"
              />
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl shadow-xs hover:shadow-md transition-all font-inter cursor-pointer"
              >
                <UserPlus size={17} />
                <span>Nuevo Usuario</span>
              </button>
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
                  placeholder="Buscar por nombre, usuario, cédula..."
                  className="w-full pl-9 pr-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                />
              </div>

              {/* Selectores Dinámicos y Botón Limpiar */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto flex-1 lg:flex-initial">
                {/* Selector Rol (Filtrado según RBAC) */}
                <div className="flex-1 sm:flex-initial min-w-[140px] sm:min-w-[160px]">
                  <Select
                    value={selectedRole}
                    onChange={(val) => setSelectedRole(val)}
                    items={roleOptions}
                    placeholder="Todos los Roles"
                  />
                </div>

                {/* Selector Sucursal (Visible únicamente para SuperAdmin) */}
                {isSuperAdmin && (
                  <div className="flex-1 sm:flex-initial min-w-[140px] sm:min-w-[180px]">
                    <Select
                      value={selectedBranch}
                      onChange={(val) => setSelectedBranch(val)}
                      items={branchOptions}
                      placeholder="Todas las Sucursales"
                    />
                  </div>
                )}

                {/* Selector Estado */}
                <div className="flex-1 sm:flex-initial min-w-[130px] sm:min-w-[150px]">
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

        {/* Tabla de Usuarios */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto overflow-y-auto h-[560px] relative">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-[#141416] shadow-xs">
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-inter">
                  <th
                    onClick={() => handleSort('usuario')}
                    className="py-3 px-3 sm:px-4.5 bg-neutral-50 dark:bg-[#141416] sticky top-0 w-[26%] cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Usuario</span>
                      {renderSortIcon('usuario')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('contacto')}
                    className="py-3 px-3 sm:px-4.5 bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cédula y Contacto</span>
                      {renderSortIcon('contacto')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('rol')}
                    className="py-3 px-3 sm:px-4.5 bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Rol y Sucursal</span>
                      {renderSortIcon('rol')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('estado')}
                    className="py-3 px-3 sm:px-4.5 text-center bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
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
                    <td colSpan={5} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="animate-spin text-red-500" size={28} />
                        <span className="text-sm">Cargando usuarios...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="text-neutral-300 dark:text-neutral-600" size={36} />
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          No se encontraron usuarios
                        </p>
                        <p className="text-xs text-neutral-400">
                          Prueba ajustando los filtros o registra un nuevo usuario.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedWorkers.map((worker) => (
                    <tr
                      key={worker.id}
                      onClick={() => handleOpenViewModal(worker)}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-all cursor-pointer ${worker.activo ? '' : 'opacity-50 hover:opacity-100'
                        }`}
                    >
                      {/* Columna 1: Trabajador / Usuario */}
                      <td className="py-3 px-3 sm:px-4.5">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar / Foto de Perfil / Iniciales */}
                          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs shrink-0 border border-red-200/60 dark:border-red-900/40 overflow-hidden relative">
                            {worker.foto_perfil_url ? (
                              <img
                                src={worker.foto_perfil_url}
                                alt={`${worker.nombre} ${worker.apellido}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <span className={`avatar-fallback ${worker.foto_perfil_url ? 'hidden' : ''}`}>
                              {getInitials(worker.nombre, worker.apellido)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {worker.nombre} {worker.apellido}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                              @{worker.usuario}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Columna 2: Cédula y Contacto */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="space-y-1">
                          <p className="text-xs font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                            {worker.cedula || 'Sin cédula'}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1">
                              <Phone size={12} className="text-neutral-400" />
                              {worker.telefono}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail size={12} className="text-neutral-400" />
                              {worker.correo}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Columna 3: Rol y Sucursal */}
                      <td className="py-3.5 px-4 sm:px-6">
                        {(() => {
                          const role = getRoleConfig(worker.rol_nombre);
                          const RoleIcon = role.icon;
                          return (
                            <div className="space-y-1">
                              <div>
                                <Badge
                                  variant="minimal"
                                  color={role.color}
                                  icon={RoleIcon}
                                  className="font-semibold text-xs"
                                >
                                  {role.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                <Store size={12} className="text-neutral-400 shrink-0" />
                                <span>{worker.sucursal_nombre || 'Todas las Sucursales (Global)'}</span>
                              </p>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Columna 4: Estado (Activo/Inactivo) */}
                      <td className="py-3.5 px-4 sm:px-6 text-center align-middle">
                        <Badge
                          variant="minimal"
                          color={worker.activo ? 'success' : 'neutral'}
                          icon={worker.activo ? CheckCircle2 : XCircle}
                          className="font-medium"
                        >
                          {worker.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>

                      {/* Columna 5: Acciones (Protegidas por RBAC) */}
                      <td className="py-3 px-2.5 sm:px-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          {/* Botón Ver Detalles */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenViewModal(worker);
                            }}
                            title="Ver detalles del usuario"
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Eye size={16} />
                          </button>

                          {canManageWorker(worker) ? (
                            <>
                              {/* Botón Editar */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(worker);
                                }}
                                title="Editar usuario"
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                <Edit2 size={15} />
                              </button>

                              {/* Botón Activar / Desactivar */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestToggleStatus(worker);
                                }}
                                title={worker.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                <Power size={15} />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-neutral-400 dark:text-neutral-600 font-inter italic px-2">
                              Solo lectura
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={(newPage) => setPage(newPage)}
            onItemsPerPageChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            isLoading={isLoading || isRefreshing}
          />
        </div>
      </div>

      {/* Modal de Detalle / Ficha del Usuario */}
      <UsuarioDetalleModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedWorkerForView(null);
        }}
        usuario={selectedWorkerForView}
        onEdit={canManageWorker(selectedWorkerForView) ? (w) => handleOpenEditModal(w) : null}
      />

      {/* Modal de Creación / Edición */}
      <WorkerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        worker={editingWorker}
        roles={roles}
        sucursales={sucursales}
        onSuccess={() => fetchWorkersData(true)}
      />

      {/* Modal de Confirmación de Estado */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isToggling) {
            setIsConfirmOpen(false);
            setWorkerToToggle(null);
          }
        }}
        onConfirm={handleConfirmToggleStatus}
        title={workerToToggle?.activo ? 'Desactivar Usuario' : 'Activar Usuario'}
        description={
          workerToToggle?.activo ? (
            <span>
              ¿Estás seguro de desactivar a{' '}
              <strong className="font-semibold text-neutral-900 dark:text-white">
                {workerToToggle?.nombre} {workerToToggle?.apellido}
              </strong>
              ? El usuario no podrá acceder al sistema.
            </span>
          ) : (
            <span>
              ¿Deseas activar la cuenta de{' '}
              <strong className="font-semibold text-neutral-900 dark:text-white">
                {workerToToggle?.nombre} {workerToToggle?.apellido}
              </strong>
              ?
            </span>
          )
        }
        confirmText={workerToToggle?.activo ? 'Desactivar' : 'Activar'}
        variant={workerToToggle?.activo ? 'danger' : 'success'}
        isLoading={isToggling}
      />
    </DashboardLayout>
  );
};

export default WorkersPage;
