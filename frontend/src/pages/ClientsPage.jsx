import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import ClientModal from '../components/clients/ClientModal';
import ConfirmModal from '../components/common/ConfirmModal';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import ResetFiltersButton from '../components/common/ResetFiltersButton';
import { useAuth } from '../context/AuthContext';
import { getClients, toggleClientStatus } from '../services/clients.service';
import { sileo } from 'sileo';
import {
  UserPlus,
  Search,
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
  XCircle
} from 'lucide-react';

export const ClientsPage = () => {
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.rol_nombre;

  // Permisos RBAC
  const canCreateEdit = ['SuperAdmin', 'Admin_Sucursal', 'Secretaria'].includes(userRole);
  const canToggleStatus = ['SuperAdmin', 'Admin_Sucursal'].includes(userRole);
  const isReadOnlyRole = userRole === 'Tecnico';

  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Estados de modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

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

  // Carga de datos
  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const res = await getClients({ limit: 100 });
      if (res.success) {
        setClients(res.data || []);
      }
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      sileo.error({
        title: 'Error de carga',
        description: 'No se pudo obtener el listado de clientes del servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Filtrado de clientes en cliente para búsqueda reactiva
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // 1. Filtro por término de búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const fullName = `${c.nombre} ${c.apellido || ''}`.toLowerCase();
        const cedula = (c.cedula_rnc || '').toLowerCase();
        const telefono = (c.telefono || '').toLowerCase();
        const telefonoExtra = (c.telefono_adicional || '').toLowerCase();
        const email = (c.correo || '').toLowerCase();
        const direccion = (c.direccion || '').toLowerCase();

        if (
          !fullName.includes(term) &&
          !cedula.includes(term) &&
          !telefono.includes(term) &&
          !telefonoExtra.includes(term) &&
          !email.includes(term) &&
          !direccion.includes(term)
        ) {
          return false;
        }
      }

      // 2. Filtro por Estado
      if (selectedStatus === 'active' && !c.activo) return false;
      if (selectedStatus === 'inactive' && c.activo) return false;

      return true;
    });
  }, [clients, searchTerm, selectedStatus]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    selectedStatus !== 'all'
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
  };

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
    setClients((prev) => {
      const exists = prev.some((c) => c.id === savedClient.id);
      if (exists) {
        return prev.map((c) => (c.id === savedClient.id ? savedClient : c));
      }
      return [savedClient, ...prev];
    });
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
              <button
                onClick={fetchClients}
                disabled={isLoading}
                title="Refrescar lista"
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
              </button>
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

            {/* Resumen de conteo */}
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-1">
              <span>
                Mostrando <strong>{filteredClients.length}</strong> de <strong>{clients.length}</strong> clientes registrados
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de Clientes */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-inter">
                  <th className="py-3.5 px-4 sm:px-6">Cliente</th>
                  <th className="py-3.5 px-4 sm:px-6">Contacto</th>
                  <th className="py-3.5 px-4 sm:px-6">Dirección</th>
                  <th className="py-3.5 px-4 sm:px-6">Registro</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Estado</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
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
                ) : filteredClients.length === 0 ? (
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
                  filteredClients.map((client) => {
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
                        className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-all ${
                          client.activo ? '' : 'opacity-50 hover:opacity-100'
                        }`}
                      >
                        {/* Columna 1: Cliente (Avatar + Nombre + Cédula) */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm shrink-0 border border-red-200/60 dark:border-red-900/40 overflow-hidden relative font-outfit">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                                {fullName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-400">
                                <CreditCard size={12} className="shrink-0" />
                                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                  {client.cedula_rnc}
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
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                            <Calendar size={12} className="text-neutral-400 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Columna 5: Estado */}
                        <td className="py-3.5 px-4 sm:px-6 text-center">
                          <Badge
                            variant={client.activo ? 'success' : 'neutral'}
                            icon={client.activo ? CheckCircle2 : XCircle}
                          >
                            {client.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>

                        {/* Columna 6: Acciones (Homologadas con WorkersPage.jsx) */}
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canCreateEdit && (
                              <button
                                onClick={() => handleOpenEditModal(client)}
                                title="Editar cliente"
                                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {canToggleStatus && (
                              <button
                                onClick={() => handleOpenConfirmToggle(client)}
                                title={client.activo ? 'Desactivar cliente' : 'Activar cliente'}
                                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                <Power size={16} />
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
        </div>
      </div>

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
