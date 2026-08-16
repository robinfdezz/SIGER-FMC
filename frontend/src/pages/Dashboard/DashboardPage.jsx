import React from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { 
  User, 
  Building2, 
  Shield, 
  Activity, 
  Clock 
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();

  const formattedLoginTime = user?.ultimo_login 
    ? new Date(user.ultimo_login).toLocaleString('es-DO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Primer acceso registrado';

  return (
    <DashboardLayout>
      {/* Banner de Bienvenida */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6 sm:p-8 shadow-xl border border-zinc-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-zinc-300 border border-white/10">
              <Building2 className="w-3.5 h-3.5 text-brand-400" />
              <span>{user?.sucursal_nombre || 'Franyer Mobile Center - SFM'}</span>
              <span className="text-zinc-500">&bull;</span>
              <span className="font-mono text-[11px] text-zinc-400">{user?.sucursal_codigo || 'SUC-01'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ¡Bienvenido de nuevo, {user?.nombre || 'Usuario'}!
            </h2>
            <p className="text-sm text-zinc-300 max-w-2xl">
              La sesión se encuentra activa y autenticada con éxito en la plataforma de servicios técnicos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/80 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                <span>Último acceso:</span>
              </div>
              <p className="text-xs font-semibold text-zinc-200 mt-0.5">
                {formattedLoginTime}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ficha de Detalles de Sesión */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Trabajador Activo</p>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.nombre} {user?.apellido}</h3>
            </div>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            {user?.usuario || user?.correo}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Nivel de Permisos</p>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user?.rol_nombre}</h3>
            </div>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Rol ID: #{user?.rol_id} con acceso autorizado
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Estado del Sistema</p>
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                Conectado &bull; Online
              </h3>
            </div>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Tokens JWT sincronizados con API Express
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
