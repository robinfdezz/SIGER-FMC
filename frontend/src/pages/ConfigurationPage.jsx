import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import CompanyProfileTab from '../components/configuration/CompanyProfileTab';
import BranchesTab from '../components/configuration/BranchesTab';
import { getCompanyProfile, getBranches } from '../services/configuracion.service';
import { sileo } from 'sileo';
import {
  Building2,
  Store,
  Loader2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export const ConfigurationPage = () => {
  const [activeTab, setActiveTab] = useState('companhia'); // 'companhia' | 'sucursales'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [companyData, setCompanyData] = useState(null);
  const [branches, setBranches] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyRes, branchesRes] = await Promise.all([
        getCompanyProfile(),
        getBranches()
      ]);

      setCompanyData(companyRes.data || null);
      setBranches(branchesRes.data || []);
    } catch (err) {
      console.error('Error al cargar datos de configuración:', err);
      const msg = err.response?.data?.message || 'Error al conectar con el servidor para obtener la configuración.';
      setError(msg);
      sileo.error({
        title: 'Error de Carga',
        description: msg
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Cabecera Principal */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-outfit tracking-tight">
            Configuración del Sistema
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
            Parametrización institucional de la empresa matriz, identidad visual y sedes operativas.
          </p>
        </div>

        {/* Fila de Pestañas (Tabs) y Acción de Recarga */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Selector de Pestañas (Tabs) */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('companhia')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'companhia'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Building2 size={16} />
              <span>Perfil de la Empresa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sucursales')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'sucursales'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <Store size={16} />
              <span>Sucursales Físicas</span>
            </button>
          </div>

          {/* Botón de Recarga a la Derecha */}
          <button
            onClick={loadData}
            disabled={loading}
            title="Recargar configuración"
            className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer disabled:opacity-50 self-end sm:self-center"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Estado de Carga Inicial */}
        {loading && !companyData && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-neutral-900 dark:text-neutral-100" />
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium font-inter">
              Cargando parámetros de configuración...
            </p>
          </div>
        )}

        {/* Estado de Error */}
        {error && !loading && (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 font-outfit">
              Error al consultar la configuración
            </h3>
            <p className="text-xs text-red-500/90 max-w-md mx-auto font-inter">
              {error}
            </p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw size={14} /> Reintentar
            </button>
          </div>
        )}

        {/* Contenido de la Pestaña Activa */}
        {!loading && !error && (
          <div>
            {activeTab === 'companhia' && (
              <CompanyProfileTab
                companyData={companyData}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'sucursales' && (
              <BranchesTab
                branches={branches}
                onRefresh={loadData}
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConfigurationPage;
