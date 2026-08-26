import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import WorkerModal from '../components/workers/WorkerModal';
import ConfirmModal from '../components/common/ConfirmModal';
import { getWorkers, toggleWorkerStatus } from '../services/workers.service';
import { getRoles, getSucursales } from '../services/catalogs.service';
import { useAuth } from '../context/AuthContext';
import { sileo } from 'sileo';
import { MorphIcon } from 'morphicons/react';
import { X, Check } from 'lucide';
import {
  UserPlus,
  Search,
  Edit2,
  Power,
  Store,
  Phone,
  Mail,
  RefreshCw,
  Users
} from 'lucide-react';

const formatRoleName = (rolNombre) => {
  switch (rolNombre) {
    case 'SuperAdmin':
      return 'Super Admin';
    case 'Admin_Sucursal':
      return 'Admin Sucursal';
    case 'Secretaria':
      return 'Secretaria';
    case 'Tecnico':
      return 'Técnico';
    default:
      return rolNombre || 'Sin Rol';
  }
};

const getRoleBadgeStyle = (rolNombre) => {
  switch (rolNombre) {
    case 'SuperAdmin':
      return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200/80 dark:border-red-800/60';
    case 'Admin_Sucursal':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/60';
    case 'Tecnico':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60';
    case 'Secretaria':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/60';
    default:
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700';
  }
};

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

  const [workers, setWorkers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isResetting, setIsResetting] = useState(false);

  // Estado del Modal de Usuario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  // Estado del Modal de Confirmación
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [workerToToggle, setWorkerToToggle] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [workersRes, rolesRes, branchesRes] = await Promise.all([
        getWorkers().catch(() => ({ data: [] })),
        getRoles().catch(() => ({ data: [] })),
        getSucursales().catch(() => ({ data: [] }))
      ]);
      setWorkers(extractArray(workersRes));
      setRoles(extractArray(rolesRes));
      setSucursales(extractArray(branchesRes));
    } catch (error) {
      console.error('Error al cargar datos de usuarios:', error);
      sileo.error({
        title: 'Error de carga',
        description: 'No se pudieron consultar los usuarios desde el servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingWorker(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (worker) => {
    setEditingWorker(worker);
    setIsModalOpen(true);
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
    if (!hasActiveFilters || isResetting) return;
    setSearchTerm('');
    setSelectedRole('');
    setSelectedBranch('all');
    setSelectedStatus('all');
    setIsResetting(true);
    setTimeout(() => {
      setIsResetting(false);
    }, 1200);
  };

  // Filtrado de usuarios
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      // 1. Filtro por término de búsqueda (nombre, apellido, usuario, cedula, correo)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const fullName = `${w.nombre} ${w.apellido}`.toLowerCase();
        const username = (w.usuario || '').toLowerCase();
        const cedula = (w.cedula || '').toLowerCase();
        const email = (w.correo || '').toLowerCase();

        if (
          !fullName.includes(term) &&
          !username.includes(term) &&
          !cedula.includes(term) &&
          !email.includes(term)
        ) {
          return false;
        }
      }

      // 2. Filtro por Rol
      if (selectedRole && String(w.rol_id) !== String(selectedRole)) {
        return false;
      }

      // 3. Filtro por Sucursal
      if (selectedBranch && selectedBranch !== 'all') {
        if (selectedBranch === 'global') {
          if (w.sucursal_id !== null && w.sucursal_id !== undefined) return false;
        } else if (String(w.sucursal_id) !== String(selectedBranch)) {
          return false;
        }
      }

      // 4. Filtro por Estado
      if (selectedStatus === 'active' && !w.activo) return false;
      if (selectedStatus === 'inactive' && w.activo) return false;

      return true;
    });
  }, [workers, searchTerm, selectedRole, selectedBranch, selectedStatus]);

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
              <button
                onClick={fetchInitialData}
                disabled={isLoading}
                title="Refrescar lista"
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
              </button>
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
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Buscador Prominente */}
              <div className="relative flex-1 w-full">
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

              {/* Selectores Compactos y Botón Limpiar */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto shrink-0">
                {/* Selector Rol */}
                <div className="w-full sm:w-auto min-w-[145px]">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="">Todos los Roles</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatRoleName(r.nombre_rol)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector Sucursal */}
                <div className="w-full sm:w-auto min-w-[145px]">
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="all">Todas las Sucursales</option>
                    <option value="global">Global / Sin Asignar</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.nombre_sucursal}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector Estado */}
                <div className="w-full sm:w-auto min-w-[135px]">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="active">Solo Activos</option>
                    <option value="inactive">Solo Inactivos</option>
                  </select>
                </div>

                {/* Botón Acción Limpiar Filtros con MorphIcon */}
                <button
                  type="button"
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters && !isResetting}
                  aria-label="Limpiar filtros"
                  title="Limpiar filtros"
                  className={`p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 transition-all flex items-center justify-center shrink-0 ${isResetting
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                    : hasActiveFilters
                      ? 'bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-red-500 dark:hover:text-red-400 cursor-pointer shadow-xs'
                      : 'bg-neutral-50/50 dark:bg-neutral-900/30 text-neutral-300 dark:text-neutral-600 opacity-40 cursor-not-allowed pointer-events-none'
                    }`}
                >
                  <MorphIcon
                    icon={isResetting ? Check : X}
                    size={16}
                    spring="smooth"
                  />
                </button>
              </div>
            </div>

            {/* Resumen de conteo */}
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-1">
              <span>
                Mostrando <strong>{filteredWorkers.length}</strong> de <strong>{workers.length}</strong> usuarios registrados
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-inter">
                  <th className="py-3.5 px-4 sm:px-6">Usuario</th>
                  <th className="py-3.5 px-4 sm:px-6">Cédula y Contacto</th>
                  <th className="py-3.5 px-4 sm:px-6">Rol y Sucursal</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Estado</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
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
                ) : filteredWorkers.length === 0 ? (
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
                  filteredWorkers.map((worker) => (
                    <tr
                      key={worker.id}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-all ${worker.activo ? '' : 'opacity-50 hover:opacity-100'
                        }`}
                    >
                      {/* Columna 1: Trabajador / Usuario */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          {/* Avatar / Iniciales */}
                          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm shrink-0 border border-red-200/60 dark:border-red-900/40">
                            {getInitials(worker.nombre, worker.apellido)}
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
                        <div className="space-y-1.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getRoleBadgeStyle(
                              worker.rol_nombre
                            )}`}
                          >
                            {formatRoleName(worker.rol_nombre)}
                          </span>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                            <Store size={12} className="text-neutral-400" />
                            {worker.sucursal_nombre || 'Todas las Sucursales (Global)'}
                          </p>
                        </div>
                      </td>

                      {/* Columna 4: Estado (Activo/Inactivo) */}
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${worker.activo
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${worker.activo ? 'bg-emerald-500' : 'bg-neutral-400'
                              }`}
                          />
                          {worker.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Columna 5: Acciones */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Editar */}
                          <button
                            onClick={() => handleOpenEditModal(worker)}
                            title="Editar usuario"
                            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>

                          {/* Botón Activar / Desactivar */}
                          <button
                            onClick={() => handleRequestToggleStatus(worker)}
                            title={worker.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Creación / Edición */}
      <WorkerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        worker={editingWorker}
        roles={roles}
        sucursales={sucursales}
        onSuccess={fetchInitialData}
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
