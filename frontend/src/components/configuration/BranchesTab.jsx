import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BranchModal from './BranchModal';
import Tooltip from '../common/Tooltip';
import {
  Store,
  MapPin,
  Phone,
  Edit2,
  Lock,
  Calendar,
  Building2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const BranchesTab = ({ branches = [], onRefresh }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.rol_nombre === 'SuperAdmin';
  const userBranchId = user?.sucursal_id;

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (branch) => {
    setSelectedBranch(branch);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedBranch(null);
  };

  const handleModalSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Informativa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <Store size={18} />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
              Sedes Físicas y Sucursales
            </h3>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
            Gestión de las sucursales operativas de la empresa donde se reciben equipos y atienden clientes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 px-3.5 py-1.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 self-start sm:self-center">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{branches.length}</span>
          <span>{branches.length === 1 ? 'sucursal registrada' : 'sucursales registradas'}</span>
        </div>
      </div>

      {/* Grid de Tarjetas de Sucursales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches.map((branch) => {
          const canEditThisBranch = isSuperAdmin || (user?.rol_nombre === 'Admin_Sucursal' && branch.id === userBranchId);
          const isUserOwnBranch = branch.id === userBranchId;

          return (
            <div
              key={branch.id}
              className={`relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border transition-all ${
                isUserOwnBranch
                  ? 'border-neutral-900/40 dark:border-neutral-400/40 shadow-sm ring-1 ring-neutral-900/10 dark:ring-neutral-100/10'
                  : 'border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              {/* Header de la tarjeta */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700/80 tracking-wide">
                      {branch.codigo_sucursal}
                    </span>

                    {/* Badge de Sede Asignada al usuario */}
                    {isUserOwnBranch && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Sparkles size={11} /> Mi Sucursal
                      </span>
                    )}
                  </div>

                  {/* Estado Activo Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Activa
                  </span>
                </div>

                <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 font-outfit mb-3">
                  {branch.nombre_sucursal}
                </h4>

                {/* Detalles de contacto y ubicación */}
                <div className="space-y-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-inter">
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-neutral-400 shrink-0" />
                    <span>{branch.telefono || 'Sin teléfono registrado'}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-neutral-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{branch.direccion || 'Sin dirección registrada'}</span>
                  </div>
                </div>
              </div>

              {/* Footer de la tarjeta con acción de edición */}
              <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <Calendar size={13} />
                  <span>
                    Actualizada:{' '}
                    {branch.updated_at
                      ? new Date(branch.updated_at).toLocaleDateString('es-DO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'N/A'}
                  </span>
                </div>

                {canEditThisBranch ? (
                  <button
                    type="button"
                    onClick={() => handleEdit(branch)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Editar Sucursal</span>
                  </button>
                ) : (
                  <Tooltip
                    content="Solo editable por el Administrador de esta sede o Super Admin"
                    position="left"
                  >
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-neutral-100/50 dark:bg-neutral-800/30 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border border-dashed border-neutral-200 dark:border-neutral-800"
                    >
                      <Lock size={12} />
                      <span>Solo Lectura</span>
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Edición */}
      <BranchModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        branch={selectedBranch}
      />
    </div>
  );
};

export default BranchesTab;
