import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import AnimatedTabs from '../components/common/AnimatedTabs';
import CompanyProfileTab from '../components/configuration/CompanyProfileTab';
import BranchesTab from '../components/configuration/BranchesTab';
import PrintingTab from '../components/configuration/PrintingTab';
import { getCompanyProfile, getBranches } from '../services/configuracion.service';
import { sileo } from 'sileo';
import Skeleton from '../components/common/Skeleton';
import AnimatedIconButton from '../components/common/AnimatedIconButton';
import {
  Building2,
  Store,
  Printer,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const TABS = [
  { id: 'perfil', label: 'Perfil de la Empresa', icon: Building2 },
  { id: 'sucursales', label: 'Sucursales Físicas', icon: Store },
  { id: 'impresion', label: 'Impresión y Comprobantes', icon: Printer },
];

const ConfigurationSkeleton = ({ activeTab = 'perfil' }) => {
  if (activeTab === 'sucursales') {
    return (
      <div className="space-y-6">
        {/* Cabecera Informativa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="h-5 w-44 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-72 sm:w-96 rounded-md" />
          </div>
          <Skeleton className="h-8 w-36 rounded-xl self-start sm:self-center" />
        </div>

        {/* Grid de Tarjetas de Sucursales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-48 rounded-md" />
                <Skeleton className="h-3.5 w-64 rounded-md" />
                <Skeleton className="h-3.5 w-40 rounded-md" />
              </div>
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-between items-center">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'impresion') {
    return (
      <div className="space-y-6">
        {/* Cabecera / Selector de Sucursal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-lg" />
              <Skeleton className="h-5 w-48 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-72 sm:w-96 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full sm:w-64 rounded-xl self-start sm:self-center" />
        </div>

        {/* Contenedor en 2 Columnas: Formulario de Configuración y Previsualización */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5">
              <div className="space-y-2 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
                <Skeleton className="h-5 w-44 rounded-md" />
                <Skeleton className="h-3.5 w-64 rounded-md" />
              </div>

              {/* Presets de tamaño */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-36 rounded-md" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[1, 2, 3, 4].map((n) => (
                    <Skeleton key={n} className="h-10 rounded-xl" />
                  ))}
                </div>
              </div>

              {/* Toggles y switches con etiquetas */}
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800/60 last:border-0"
                  >
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-44 rounded-md" />
                      <Skeleton className="h-3 w-56 rounded-md" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                ))}
              </div>

              {/* Botón de guardado */}
              <div className="pt-2 flex justify-end">
                <Skeleton className="h-10 w-36 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Previsualización */}
          <div className="lg:col-span-5">
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-xl" />
              </div>
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Por defecto: 'perfil' (Perfil de la Empresa)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Logotipo Oficial */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex-1 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="h-5 w-32 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-full max-w-xs mb-4 rounded-md" />
              <Skeleton className="w-full h-56 sm:h-64 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Formulario de Datos Fiscales y Contacto */}
        <div className="lg:col-span-8">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5">
            <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-3.5 w-64 rounded-md mt-1.5" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Razón Social */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>

              {/* RNC */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>

              {/* Correo */}
              <div className="space-y-2 sm:col-span-2">
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>

            {/* Dirección Fiscal */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-36 rounded-md" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>

            {/* Botón de Guardado */}
            <div className="pt-2 flex items-center justify-end">
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConfigurationPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [companyData, setCompanyData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Determina la pestaña activa validando los parámetros de la URL (?tab=perfil|sucursales|impresion)
  const tabParam = searchParams.get('tab');
  const activeTab = useMemo(() => {
    if (tabParam === 'sucursales') return 'sucursales';
    if (tabParam === 'impresion') return 'impresion';
    return 'perfil'; // Valor por defecto
  }, [tabParam]);

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      setRefreshSuccess(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Cabecera Principal */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-outfit tracking-tight">
            Configuración del Sistema
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
            Parametrización institucional de la empresa matriz, identidad visual, sedes operativas y formatos de impresión.
          </p>
        </div>

        {/* Fila de Pestañas (Tabs) y Acción de Recarga */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Selector de Pestañas (Tabs) con Pastilla Deslizante */}
          <AnimatedTabs
            items={TABS}
            value={activeTab}
            onChange={handleTabChange}
            className="w-full sm:w-fit"
          />

          {/* Botón de Recarga a la Derecha */}
          <AnimatedIconButton
            loading={isRefreshing}
            success={refreshSuccess}
            onSuccessEnd={() => setRefreshSuccess(false)}
            onClick={handleRefresh}
            title="Recargar configuración"
            ariaLabel="Recargar configuración del sistema"
            className="self-end sm:self-center"
          />
        </div>

        {/* Skeleton de Carga Inicial */}
        {loading && !companyData && (
          <ConfigurationSkeleton activeTab={activeTab} />
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
        {(!loading || companyData) && !error && (
          <div className={loading ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
            {(activeTab === 'perfil' || activeTab === 'companhia') && (
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

            {activeTab === 'impresion' && (
              <PrintingTab
                branches={branches}
                companyData={companyData}
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
