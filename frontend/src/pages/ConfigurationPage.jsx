import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import CompanyProfileTab from '../components/configuration/CompanyProfileTab';
import BranchesTab from '../components/configuration/BranchesTab';
import PrintingTab from '../components/configuration/PrintingTab';
import { getCompanyProfile, getBranches } from '../services/configuracion.service';
import { sileo } from 'sileo';
import {
  Building2,
  Store,
  Printer,
  Loader2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const TABS = [
  { id: 'perfil', label: 'Perfil de la Empresa', icon: Building2 },
  { id: 'sucursales', label: 'Sucursales Físicas', icon: Store },
  { id: 'impresion', label: 'Impresión y Comprobantes', icon: Printer },
];

export const ConfigurationPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [companyData, setCompanyData] = useState(null);
  const [branches, setBranches] = useState([]);

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

  const containerRef = useRef(null);
  const tabsRef = useRef([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = TABS.findIndex((t) => t.id === activeTab);
      const currentTab = tabsRef.current[activeIndex];
      if (currentTab) {
        setIndicatorStyle({
          left: currentTab.offsetLeft,
          width: currentTab.offsetWidth,
          opacity: 1
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab]);

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
          <div
            ref={containerRef}
            className="relative flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700/60 w-full sm:w-fit overflow-x-auto"
          >
            {/* Pastilla deslizante (indicador activo absoluto) */}
            <span
              className="absolute top-1 bottom-1 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200/60 dark:border-neutral-700 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity
              }}
            />

            {TABS.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  ref={(el) => (tabsRef.current[idx] = el)}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer select-none whitespace-nowrap flex-1 sm:flex-none ${
                    isActive
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
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
