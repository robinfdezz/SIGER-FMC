import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getReportesResumen, getReportesDetalle } from '../../services/reportes.service';
import { getSucursales } from '../../services/catalogs.service';
import { getCompanyProfile } from '../../services/configuracion.service';
import DeviceCategoryDonut from '../../components/charts/DeviceCategoryDonut';
import ReportTrendChart from '../../components/charts/ReportTrendChart';
import InlineConfirmButton from '../../components/common/InlineConfirmButton';
import AnimatedIconButton from '../../components/common/AnimatedIconButton';
import AnimatedTabs from '../../components/common/AnimatedTabs';
import Select from '../../components/common/Select';
import DatePicker from '../../components/common/DatePicker';
import ReporteEjecutivoImprimible from './ReporteEjecutivoImprimible';
import Skeleton from '../../components/common/Skeleton';
import TableSkeleton from '../../components/common/TableSkeleton';
import ReportesSkeleton from './ReportesSkeleton';
import { sileo } from 'sileo';
import {
  BarChart3,
  Calendar,
  Building2,
  Download,
  Printer,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Receipt,
  Wrench,
  Percent,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Search,
  X,
  XCircle,
  PackageCheck,
  ClipboardCheck,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Package,
  Layers
} from 'lucide-react';

const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDateLocal = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getInitials = (name = '') => {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const formatDateTimeLocal = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const normalizeEstadoKey = (estado) => {
  if (!estado) return '';
  const flujo = Number(estado.orden_flujo);
  const cod = String(estado.codigo_estado || '').toUpperCase().trim();
  const nom = String(estado.nombre_estado || estado.estado || '').toLowerCase().trim();

  // 1. Evaluación canónica por orden_flujo
  if (flujo === 1) return 'RECIBIDO';
  if (flujo === 2) return 'EN_DIAGNOSTICO';
  if (flujo === 3) return 'ESPERA_REPUESTO';
  if (flujo === 4) return 'EN_REPARACION';
  if (flujo === 5) return 'CONTROL_CALIDAD';
  if (flujo === 6) return 'LISTO_ENTREGA';
  if (flujo === 7) return 'ENTREGADO';
  if (flujo === 8) return 'CANCELADO';

  // 2. Evaluación estricta por codigo_estado
  if (cod === 'RECIBIDO') return 'RECIBIDO';
  if (cod === 'EN_DIAGNOSTICO') return 'EN_DIAGNOSTICO';
  if (cod === 'ESPERA_REPUESTO' || cod === 'EN_ESPERA_REPUESTO') return 'ESPERA_REPUESTO';
  if (cod === 'EN_REPARACION') return 'EN_REPARACION';
  if (cod === 'CONTROL_CALIDAD') return 'CONTROL_CALIDAD';
  if (cod === 'LISTO_ENTREGA') return 'LISTO_ENTREGA';
  if (cod === 'ENTREGADO' || cod === 'ENTREGADO_CLIENTE' || cod === 'ENTREGA_CONFORME') return 'ENTREGADO';
  if (cod === 'CANCELADO' || cod === 'CANCELADO_DEVUELTO') return 'CANCELADO';

  // 3. Evaluación por texto evitando confusiones ("listo para entrega" vs "entregado")
  if (cod.includes('LISTO') || nom.includes('listo')) return 'LISTO_ENTREGA';
  if (
    (cod.includes('ENTREG') || nom.includes('entreg')) &&
    !cod.includes('LISTO') &&
    !nom.includes('listo')
  ) {
    return 'ENTREGADO';
  }

  if (cod.includes('RECIB') || nom.includes('recib')) return 'RECIBIDO';
  if (cod.includes('DIAGN') || nom.includes('diagn')) return 'EN_DIAGNOSTICO';
  if (cod.includes('ESPERA') || nom.includes('espera') || cod.includes('REPUESTO') || nom.includes('repuesto')) return 'ESPERA_REPUESTO';
  if (cod.includes('REPARAC') || nom.includes('reparac') || cod.includes('PROCESO') || nom.includes('proceso')) return 'EN_REPARACION';
  if (cod.includes('CALIDAD') || nom.includes('calidad') || cod.includes('CONTROL') || nom.includes('control')) return 'CONTROL_CALIDAD';
  if (cod.includes('CANCEL') || nom.includes('cancel') || nom.includes('devuelt')) return 'CANCELADO';

  return cod || nom;
};

const getEstadoIcon = (estado) => {
  const key = normalizeEstadoKey(estado);
  switch (key) {
    case 'RECIBIDO':
      return Package;
    case 'EN_DIAGNOSTICO':
      return Search;
    case 'ESPERA_REPUESTO':
      return Clock;
    case 'EN_REPARACION':
      return Wrench;
    case 'CONTROL_CALIDAD':
      return ClipboardCheck;
    case 'LISTO_ENTREGA':
      return PackageCheck;
    case 'ENTREGADO':
      return CheckCircle2;
    case 'CANCELADO':
      return XCircle;
    default:
      return Package;
  }
};

const getEstadoColor = (estado) => {
  if (estado?.color_badge) return estado.color_badge;
  const key = normalizeEstadoKey(estado);
  switch (key) {
    case 'RECIBIDO':
      return '#3B82F6';
    case 'EN_DIAGNOSTICO':
      return '#F59E0B';
    case 'ESPERA_REPUESTO':
      return '#EC4899';
    case 'EN_REPARACION':
      return '#8B5CF6';
    case 'CONTROL_CALIDAD':
      return '#06B6D4';
    case 'LISTO_ENTREGA':
      return '#10B981';
    case 'ENTREGADO':
      return '#059669';
    case 'CANCELADO':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

const getEstadoLabel = (estado) => {
  if (!estado) return '';
  const key = normalizeEstadoKey(estado);
  switch (key) {
    case 'RECIBIDO':
      return 'Recibido';
    case 'EN_DIAGNOSTICO':
      return 'En Diagnóstico';
    case 'ESPERA_REPUESTO':
      return 'En Repuesto';
    case 'EN_REPARACION':
      return 'En Reparación';
    case 'CONTROL_CALIDAD':
      return 'Control de Calidad';
    case 'LISTO_ENTREGA':
      return 'Listo para Entrega';
    case 'ENTREGADO':
      return 'Entregado';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return estado.nombre_estado || estado.estado || '';
  }
};

// Date Presets Calculation in local civil time (Santo Domingo YYYY-MM-DD)
const getPresetRange = (presetKey) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const toYMD = (year, month, day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const todayStr = toYMD(y, m, d);

  switch (presetKey) {
    case 'hoy':
      return { desde: todayStr, hasta: todayStr };
    case 'semana': {
      const dayOfWeek = now.getDay() || 7; // 1 = Lunes, 7 = Domingo
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek - 1));
      return {
        desde: toYMD(monday.getFullYear(), monday.getMonth(), monday.getDate()),
        hasta: todayStr
      };
    }
    case 'mes':
      return {
        desde: toYMD(y, m, 1),
        hasta: todayStr
      };
    case 'mes_anterior': {
      const prevMonthLastDay = new Date(y, m, 0);
      const prevY = prevMonthLastDay.getFullYear();
      const prevM = prevMonthLastDay.getMonth();
      const prevLastD = prevMonthLastDay.getDate();
      return {
        desde: toYMD(prevY, prevM, 1),
        hasta: toYMD(prevY, prevM, prevLastD)
      };
    }
    default:
      return { desde: toYMD(y, m, 1), hasta: todayStr };
  }
};

const PRESET_TABS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta Semana' },
  { id: 'mes', label: 'Este Mes' },
  { id: 'mes_anterior', label: 'Mes Anterior' },
  { id: 'personalizado', label: 'Personalizado' }
];

const DETALLE_TABS = [
  { id: 'entregados', label: 'Entregadas / Liquidadas' },
  { id: 'recibidos', label: 'Recibidas en Período' },
  { id: 'cancelados', label: 'Canceladas' },
  { id: 'todos', label: 'Todas las Órdenes' }
];

const ReportesPage = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const isSuperAdmin = useMemo(() => {
    const roleName = String(user?.rol_nombre || user?.rol || '').toLowerCase();
    const roleId = Number(user?.rol_id);
    return roleName === 'superadmin' || roleId === 1;
  }, [user]);

  // Controles de cabecera
  const [activePreset, setActivePreset] = useState('mes');
  const [dateRange, setDateRange] = useState(() => getPresetRange('mes'));
  const [sucursalId, setSucursalId] = useState('all');
  const [sucursalesList, setSucursalesList] = useState([]);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const branchOptions = useMemo(() => [
    {
      id: 'all',
      label: 'Todas las sucursales',
      supportingText: 'Consolidado global',
      icon: Building2
    },
    ...sucursalesList.map((suc) => ({
      id: String(suc.id),
      label: suc.nombre_sucursal || suc.nombre,
      supportingText: suc.codigo_sucursal ? `Código: ${suc.codigo_sucursal}` : undefined,
      icon: Building2
    }))
  ], [sucursalesList]);

  // Nombre legible de la sucursal activa
  const sucursalActivaLabel = useMemo(() => {
    if (!isSuperAdmin) {
      return user?.sucursal_nombre || 'Franyer Mobile Center';
    }
    if (!sucursalId || sucursalId === 'all') {
      return 'Todas las sucursales (Consolidado)';
    }
    const option = branchOptions.find((b) => String(b.id) === String(sucursalId));
    if (option && option.id !== 'all') {
      return option.label;
    }
    const suc = sucursalesList.find((s) => String(s.id) === String(sucursalId));
    if (suc) {
      return suc.nombre_sucursal || suc.nombre;
    }
    return user?.sucursal_nombre || 'Todas las sucursales';
  }, [isSuperAdmin, sucursalId, branchOptions, sucursalesList, user]);

  // Estados de datos
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resumenData, setResumenData] = useState(null);

  // Estados de la tabla de detalle
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleData, setDetalleData] = useState({ ordenes: [], totales: {}, paginacion: {} });
  const [detallePage, setDetallePage] = useState(1);
  const [detalleEstado, setDetalleEstado] = useState('entregados');
  const [detalleSearch, setDetalleSearch] = useState('');
  const [exportingCsv, setExportingCsv] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [companyData, setCompanyData] = useState(null);

  // Control de carga inicial sincronizada
  const initialLoadsRef = React.useRef({ resumen: false, detalle: false });
  const checkInitialLoaded = useCallback(() => {
    if (initialLoadsRef.current.resumen && initialLoadsRef.current.detalle) {
      setInitialLoading(false);
    }
  }, []);

  // Cargar datos de la empresa
  useEffect(() => {
    getCompanyProfile()
      .then((res) => {
        if (res?.ok && res?.data) {
          setCompanyData(res.data);
        }
      })
      .catch((err) => console.warn('Error al cargar datos de empresa:', err.message));
  }, []);

  // Cargar catálogo de sucursales si es SuperAdmin
  useEffect(() => {
    if (isSuperAdmin) {
      getSucursales()
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setSucursalesList(res.data);
          } else if (Array.isArray(res)) {
            setSucursalesList(res);
          }
        })
        .catch((err) => console.warn('Error al cargar sucursales:', err.message));
    }
  }, [isSuperAdmin]);

  // Cargar Resumen Analítico
  const fetchResumen = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        desde: dateRange.desde,
        hasta: dateRange.hasta,
        sucursal_id: isSuperAdmin ? sucursalId : undefined
      };
      const response = await getReportesResumen(params);
      if (response?.ok && response?.data) {
        setResumenData(response.data);
        if (response.data.sucursales?.length > 0) {
          setSucursalesList((prev) => (prev.length === 0 ? response.data.sucursales : prev));
        }
      } else {
        sileo.error('No se pudo cargar el resumen de reportes');
      }
    } catch (err) {
      console.error('Error al cargar resumen:', err);
      sileo.error(err.response?.data?.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
      initialLoadsRef.current.resumen = true;
      checkInitialLoaded();
    }
  }, [dateRange, sucursalId, isSuperAdmin]);

  // Cargar Detalle de Órdenes
  const fetchDetalle = useCallback(async () => {
    setDetalleLoading(true);
    try {
      const params = {
        desde: dateRange.desde,
        hasta: dateRange.hasta,
        sucursal_id: isSuperAdmin ? sucursalId : undefined,
        page: detallePage,
        limit: 15,
        estado: detalleEstado,
        q: detalleSearch || undefined
      };
      const response = await getReportesDetalle(params);
      if (response?.ok && response?.data) {
        setDetalleData(response.data);
      }
    } catch (err) {
      console.error('Error al cargar detalle:', err);
    } finally {
      setDetalleLoading(false);
      initialLoadsRef.current.detalle = true;
      checkInitialLoaded();
    }
  }, [dateRange, sucursalId, isSuperAdmin, detallePage, detalleEstado, detalleSearch]);

  // Ejecución inicial y reactiva
  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  useEffect(() => {
    fetchDetalle();
  }, [fetchDetalle]);

  // Manejador de cambio de Preset
  const handleSelectPreset = (key) => {
    setActivePreset(key);
    if (key !== 'personalizado') {
      const newRange = getPresetRange(key);
      setDateRange(newRange);
      setDetallePage(1);
    }
  };

  // Manejador de cambio de rango de fechas manual
  const handleRangeChange = (range) => {
    if (!range?.desde || !range?.hasta) return;
    setDateRange(range);
    setActivePreset('personalizado');
    setDetallePage(1);
  };

  // Exportar archivo CSV con UTF-8 BOM
  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const params = {
        desde: dateRange.desde,
        hasta: dateRange.hasta,
        sucursal_id: isSuperAdmin ? sucursalId : undefined,
        estado: detalleEstado,
        q: detalleSearch || undefined,
        export: true
      };
      const response = await getReportesDetalle(params);
      const ordenes = response?.data?.ordenes || [];

      if (ordenes.length === 0) {
        sileo.info('No hay órdenes para exportar con los filtros seleccionados.');
        setExportingCsv(false);
        return;
      }

      // Encabezados en español
      const headers = [
        'Ticket',
        'Fecha Recepcion',
        'Fecha Entrega',
        'Cliente',
        'Telefono',
        'Equipo',
        'Categoria',
        'Sucursal',
        'Tecnico',
        'Mano de Obra (RD$)',
        'Anticipo (RD$)',
        'Descuento (RD$)',
        'Liquidado (RD$)',
        'Total Cobrado (RD$)',
        'Metodo de Pago',
        'Estado'
      ];

      const escapeCsv = (str) => {
        if (str == null) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
      };

      const rows = ordenes.map((o) => [
        escapeCsv(o.codigo_ticket),
        escapeCsv(o.fecha_recepcion ? o.fecha_recepcion.split('T')[0] : ''),
        escapeCsv(o.fecha_entrega_real ? o.fecha_entrega_real.split('T')[0] : ''),
        escapeCsv(o.cliente_nombre),
        escapeCsv(o.cliente_telefono),
        escapeCsv(o.equipo),
        escapeCsv(o.categoria_nombre),
        escapeCsv(o.sucursal_nombre),
        escapeCsv(o.tecnico_nombre),
        (Number(o.mano_obra_neta != null ? o.mano_obra_neta : (o.costo_previsto || o.costo_final_confirmado)) || 0).toFixed(2),
        (Number(o.monto_anticipo) || 0).toFixed(2),
        (Number(o.monto_descuento) || 0).toFixed(2),
        (Number(o.monto_liquidado) || 0).toFixed(2),
        (Number(o.total_cobrado) || 0).toFixed(2),
        escapeCsv(o.metodo_pago_entrega),
        escapeCsv(o.nombre_estado)
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_Ordenes_SIGER_FMC_${dateRange.desde}_${dateRange.hasta}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      sileo.success('Archivo CSV exportado exitosamente.');
    } catch (err) {
      console.error('Error al exportar CSV:', err);
      sileo.error('Error al generar la exportación.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Imprimir resumen ejecutivo en formato formal Carta / A4
  const handlePrintSummary = () => {
    setIsPrinting(true);

    // Remover cualquier estilo térmico previo
    document.getElementById('thermal-print-page-style')?.remove();

    const styleId = 'report-print-page-style';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      @page {
        size: letter portrait;
        margin: 10mm 10mm 10mm 10mm;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #111827 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > *:not(#print-mount-point) {
          display: none !important;
        }
        body #print-mount-point {
          position: static !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          visibility: visible !important;
          background: #ffffff !important;
          left: auto !important;
          top: auto !important;
          overflow: visible !important;
        }
        body #print-mount-point,
        body #print-mount-point * {
          visibility: visible !important;
        }
      }
    `;

    try {
      setTimeout(() => {
        window.print();
      }, 200);
    } catch (err) {
      console.error('Error al imprimir:', err);
      setIsPrinting(false);
      document.getElementById('report-print-page-style')?.remove();
    }
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
      document.getElementById('report-print-page-style')?.remove();
    };

    window.addEventListener('afterprint', handleAfterPrint);

    // Salvaguarda para cuando se cancela la impresión y la ventana recupera el foco
    const handleWindowFocus = () => {
      if (isPrinting) {
        setTimeout(() => {
          setIsPrinting(false);
          document.getElementById('report-print-page-style')?.remove();
        }, 500);
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isPrinting]);

  const kpis = resumenData?.kpis || {};
  const metodosPago = kpis.metodos_pago || {};
  const totalPagosMetodos = (metodosPago.efectivo || 0) + (metodosPago.tarjeta || 0) + (metodosPago.transferencia || 0);

  const paymentMethodsList = useMemo(() => [
    {
      id: 'efectivo',
      label: 'Efectivo',
      amount: metodosPago.efectivo || 0,
      icon: Banknote,
      pct: totalPagosMetodos > 0 ? Math.round(((metodosPago.efectivo || 0) / totalPagosMetodos) * 100) : 0
    },
    {
      id: 'tarjeta',
      label: 'Tarjeta',
      amount: metodosPago.tarjeta || 0,
      icon: CreditCard,
      pct: totalPagosMetodos > 0 ? Math.round(((metodosPago.tarjeta || 0) / totalPagosMetodos) * 100) : 0
    },
    {
      id: 'transferencia',
      label: 'Transferencia',
      amount: metodosPago.transferencia || 0,
      icon: ArrowRightLeft,
      pct: totalPagosMetodos > 0 ? Math.round(((metodosPago.transferencia || 0) / totalPagosMetodos) * 100) : 0
    }
  ], [metodosPago, totalPagosMetodos]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full pb-12">
        {initialLoading ? (
          <ReportesSkeleton />
        ) : (
          <>
            {/* Cabecera Principal y Barra de Control Homologada */}
            <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 font-outfit">
                Informes y Reportes
              </h1>
              <p className="text-xs sm:text-[13px] text-neutral-500 dark:text-neutral-400 font-inter mt-1">
                Auditoría analítica financiera, rendimiento de taller y flujo de servicios
              </p>
            </div>

            {/* Acciones Superiores: Refrescar, Exportar CSV e Imprimir Informe */}
            <div className="flex flex-wrap items-center gap-2.5">
              <AnimatedIconButton
                loading={loading || detalleLoading}
                success={refreshSuccess}
                onSuccessEnd={() => setRefreshSuccess(false)}
                onClick={async () => {
                  await Promise.all([fetchResumen(), fetchDetalle()]);
                  setRefreshSuccess(true);
                }}
                title="Actualizar datos"
                ariaLabel="Actualizar datos de informes y reportes"
                className="w-[38px] h-[38px] rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors shrink-0"
                size={16}
              />

              <InlineConfirmButton
                variant="secondary"
                text="Exportar CSV"
                confirmText="¿Exportar?"
                icon={FileSpreadsheet}
                iconClassName="text-emerald-600 dark:text-emerald-400"
                isLoading={exportingCsv}
                onConfirm={handleExportCsv}
                title="Descargar archivo CSV compatible con Excel"
              />

              <InlineConfirmButton
                variant="primary"
                text="Imprimir Informe"
                confirmText="¿Imprimir?"
                icon={Printer}
                onConfirm={handlePrintSummary}
                title="Imprimir resumen o guardar en PDF"
              />
            </div>
          </div>

          {/* Filtros de Rango y Sucursal */}
          <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Presets de Fecha con AnimatedTabs y Fechas Manuales */}
            <div className="flex flex-wrap items-center gap-3">
              <AnimatedTabs
                items={PRESET_TABS}
                value={activePreset}
                onChange={handleSelectPreset}
                size="sm"
              />

              {/* Selector de Rango Unificado (Visible exclusivamente en modo Personalizado) */}
              {activePreset === 'personalizado' && (
                <div className="w-[215px] sm:w-[230px]">
                  <DatePicker
                    mode="range"
                    value={dateRange}
                    onChange={handleRangeChange}
                    size="sm"
                    displayFormat="dd/mm/yyyy"
                    showClear={false}
                    align="right"
                  />
                </div>
              )}
            </div>

            {/* Selector de Sucursal con Select personalizado del Dashboard */}
            <div className="shrink-0">
              {isSuperAdmin ? (
                <div className="w-[180px] sm:w-[220px]">
                  <Select
                    value={sucursalId}
                    onChange={(val) => {
                      setSucursalId(String(val));
                      setDetallePage(1);
                    }}
                    items={branchOptions}
                    placeholder="Todas las sucursales"
                  />
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 select-none">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <span>{user?.sucursal_nombre || 'Mi Sucursal'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bloque de KPIs Financieros y Operativos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Facturado / Cobrado */}
          <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Total Cobrado
                </span>
                <DollarSign className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-neutral-400 dark:text-neutral-500 select-none font-mono">
                  RD$
                </span>
                {loading ? (
                  <Skeleton className="h-7 sm:h-8 w-28 sm:w-36 rounded-md my-0.5" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-outfit tracking-tight tabular-nums leading-none">
                    {formatCurrency(kpis.total_facturado)}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="min-w-0">
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">Liquidado:</span>
                {loading ? (
                  <Skeleton className="h-4 w-20 mt-1" />
                ) : (
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono text-xs sm:text-[13px] whitespace-nowrap block mt-0.5">
                    RD$ {formatCurrency(kpis.total_liquidado)}
                  </span>
                )}
              </div>
              <div className="min-w-0 text-right">
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">Anticipos:</span>
                {loading ? (
                  <Skeleton className="h-4 w-20 mt-1 ml-auto" />
                ) : (
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono text-xs sm:text-[13px] whitespace-nowrap block mt-0.5">
                    RD$ {formatCurrency(kpis.total_anticipos)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Mano de Obra y Repuestos */}
          <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Mano de Obra Taller
                </span>
                <Wrench className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-neutral-400 dark:text-neutral-500 select-none font-mono">
                  RD$
                </span>
                {loading ? (
                  <Skeleton className="h-7 sm:h-8 w-28 sm:w-36 rounded-md my-0.5" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-outfit tracking-tight tabular-nums leading-none">
                    {formatCurrency(kpis.total_mano_obra)}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="min-w-0">
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">Repuestos:</span>
                {loading ? (
                  <Skeleton className="h-4 w-20 mt-1" />
                ) : (
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono text-xs sm:text-[13px] whitespace-nowrap block mt-0.5">
                    RD$ {formatCurrency(kpis.total_repuestos)}
                  </span>
                )}
              </div>
              <div className="min-w-0 text-right">
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">Descuentos:</span>
                {loading ? (
                  <Skeleton className="h-4 w-20 mt-1 ml-auto" />
                ) : (
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono text-xs sm:text-[13px] whitespace-nowrap block mt-0.5">
                    RD$ {formatCurrency(kpis.total_descuentos)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Saldo Pendiente de Cobro */}
          <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Saldo Pendiente
                </span>
                <Receipt className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm font-bold text-neutral-400 dark:text-neutral-500 select-none font-mono">
                  RD$
                </span>
                {loading ? (
                  <Skeleton className="h-7 sm:h-8 w-28 sm:w-36 rounded-md my-0.5" />
                ) : (
                  <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-outfit tracking-tight tabular-nums leading-none">
                    {formatCurrency(kpis.saldo_pendiente)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 font-medium pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <span className="leading-tight">Por cobrar en órdenes en proceso</span>
            </div>
          </div>

          {/* 4. Órdenes Entregadas y Ticket Promedio */}
          <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Órdenes Entregadas
                </span>
                <CheckCircle2 className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <Skeleton className="h-7 sm:h-8 w-20 rounded-md my-0.5" />
                ) : (
                  <>
                    <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-outfit tracking-tight tabular-nums leading-none">
                      {kpis.ordenes_liquidadas || 0}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      de {kpis.ordenes_recibidas || 0} recibidas
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="min-w-0">
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">Ticket promedio:</span>
                {loading ? (
                  <Skeleton className="h-4 w-28 mt-1" />
                ) : (
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono text-xs sm:text-[13px] whitespace-nowrap block mt-0.5">
                    RD$ {formatCurrency(kpis.ticket_promedio)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Métodos de Pago en Entregas */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
            <div>
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                MÉTODOS DE PAGO EN ENTREGAS
              </span>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Total liquidado:{' '}
              <span className="font-outfit font-semibold text-xs text-neutral-700 dark:text-neutral-300">
                RD$ {formatCurrency(kpis.total_liquidado)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2.5">
            {paymentMethodsList.map((m) => {
              const Icon = m.icon;
              const isZero = Number(m.amount || 0) === 0;
              return (
                <div
                  key={m.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#141416] shadow-xs flex flex-col justify-between transition-opacity ${isZero ? 'opacity-65' : ''
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                      {m.label}
                    </span>
                    <Icon className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
                  </div>

                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 select-none font-mono">
                      RD$
                    </span>
                    <span className="font-outfit font-bold text-lg sm:text-xl text-neutral-900 dark:text-neutral-100 tabular-nums leading-none">
                      {formatCurrency(m.amount)}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 dark:bg-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-medium mt-1.5">
                      <span>{m.pct}% del total</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fila de Gráficos Analíticos: Tendencia + Donut de Categorías */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-stretch">
          {/* Tendencia Temporal (2 columnas en XL) */}
          <div className="xl:col-span-2">
            <ReportTrendChart
              serie={resumenData?.serie_temporal || []}
              title="Tendencia de Entradas vs. Entregas"
              subtitle={`Flujo diario comparativo desde ${dateRange.desde} hasta ${dateRange.hasta}`}
              className="h-full"
            />
          </div>

          {/* Donut de Categorías (1 columna en XL) */}
          <div className="xl:col-span-1">
            <DeviceCategoryDonut
              data={resumenData?.distribucion_categorias || []}
              title="Distribución por Categorías"
              subtitle="Participación de equipos atendidos en el rango"
              periodLabel="En el rango"
              mostrarDetalle={true}
              className="h-full"
            />
          </div>
        </div>

        {/* Sección: Productividad por Técnico */}
        <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 font-outfit">
                Productividad y Rendimiento del Equipo Técnico
              </h3>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-inter">
                Mano de obra generada, volumen de órdenes despachadas y cumplimiento de tiempos
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Users className="w-4 h-4 text-neutral-400" />
              <span>{resumenData?.productividad_tecnicos?.length || 0} técnicos</span>
            </div>
          </div>

          {(!resumenData?.productividad_tecnicos || resumenData.productividad_tecnicos.length === 0) ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No hay registros de actividad técnica para el rango seleccionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumenData.productividad_tecnicos.map((tec) => {
                const activas = Number(tec.ordenes_en_proceso) || 0;
                const CAPACIDAD_REF_TECNICO = 6;
                const rawPorcentaje = (activas / CAPACIDAD_REF_TECNICO) * 100;
                const porcentajeCarga = Math.round(rawPorcentaje);
                const barWidth = activas > 0 ? Math.min(100, Math.max(6, porcentajeCarga)) : 0;

                // Saturación condicional: rojo si > 4 activas, ámbar si 2-3 (o 2-4), verde si 0-1
                let loadColor = {
                  barBg: 'bg-emerald-500 dark:bg-emerald-500',
                  textColor: 'text-emerald-600 dark:text-emerald-400'
                };
                if (activas > 4) {
                  loadColor = {
                    barBg: 'bg-red-500 dark:bg-red-500',
                    textColor: 'text-red-600 dark:text-red-400'
                  };
                } else if (activas >= 2) {
                  loadColor = {
                    barBg: 'bg-amber-500 dark:bg-amber-500',
                    textColor: 'text-amber-600 dark:text-amber-400'
                  };
                }

                const cumplimiento = Number(tec.tasa_cumplimiento) || 100;
                const cumplimientoColor =
                  cumplimiento >= 85
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : cumplimiento >= 70
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400';
                const initials = getInitials(tec.nombre);

                return (
                  <div
                    key={tec.tecnico_id || tec.nombre}
                    className="p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-all flex flex-col justify-between"
                  >
                    {/* Cabecera del Técnico */}
                    <div className="flex items-center gap-2.5 mb-2.5">
                      {tec.foto_perfil_url ? (
                        <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-100 dark:bg-zinc-700 font-bold text-xs flex items-center justify-center border border-zinc-700 dark:border-zinc-600 shadow-xs overflow-hidden relative shrink-0">
                          <img
                            src={tec.foto_perfil_url}
                            alt={tec.nombre}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                          <span className="avatar-fallback hidden">
                            {initials}
                          </span>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs bg-zinc-800 text-zinc-100 dark:bg-zinc-700 border border-zinc-700 dark:border-zinc-600">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-outfit font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                          {tec.nombre}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          Técnico de servicio
                        </p>
                      </div>
                    </div>

                    {/* Grid de 4 Métricas Limpias */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80">
                      <div>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium block">
                          Entregadas
                        </span>
                        <span className="font-outfit font-bold text-sm text-neutral-900 dark:text-neutral-100 tabular-nums">
                          {tec.ordenes_entregadas || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium block">
                          En Proceso
                        </span>
                        <span className="font-outfit font-bold text-sm text-neutral-900 dark:text-neutral-100 tabular-nums">
                          {activas}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium block">
                          Mano de Obra
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 font-mono select-none">
                            RD$
                          </span>
                          <span className="font-outfit font-bold text-sm text-neutral-900 dark:text-neutral-100 tabular-nums">
                            {formatCurrency(tec.total_mano_obra)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium block">
                          Ciclo Promedio
                        </span>
                        <span className="font-outfit font-bold text-sm text-neutral-900 dark:text-neutral-100 tabular-nums">
                          {tec.tiempo_promedio_horas > 0 ? `${tec.tiempo_promedio_horas} hrs` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progreso de Carga Técnica (Idéntica al Dashboard) */}
                    <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                          Carga actual ({activas} {activas === 1 ? 'activa' : 'activas'})
                        </span>
                        <span className={`text-[11px] font-semibold tabular-nums ${loadColor.textColor}`}>
                          {porcentajeCarga}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${loadColor.barBg}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400 pt-0.5">
                        <span className="text-[11px]">Tasa de cumplimiento:</span>
                        <span className={`text-[11px] font-bold tabular-nums ${cumplimientoColor}`}>
                          {cumplimiento}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sección: Tabla Detallada de Órdenes y Liquidaciones */}
        <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-50 font-outfit">
                Detalle de Órdenes y Liquidaciones
              </h3>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-inter">
                Registro pormenorizado de transacciones del período seleccionado
              </p>
            </div>

            {/* Búsqueda en Vivo */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Search className="w-4 h-4 text-neutral-400" />
              </span>
              <input
                type="text"
                value={detalleSearch}
                onChange={(e) => {
                  setDetalleSearch(e.target.value);
                  setDetallePage(1);
                }}
                placeholder="Buscar ticket, cliente, equipo..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
              />
              {detalleSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setDetalleSearch('');
                    setDetallePage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Submenú de Pestañas: Tabs de Estado (Control Segmentado Estándar) */}
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 gap-1 overflow-x-auto max-w-full">
              {DETALLE_TABS.map((tab) => {
                const isActive = detalleEstado === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setDetalleEstado(tab.id);
                      setDetallePage(1);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${isActive
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                      }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumen del Período Filtrado con Identificadores Sutiles */}
          {detalleLoading ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-1.5 px-0.5 mb-3.5 text-xs">
              <Skeleton className="h-4 w-40" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : detalleData.totales?.total_items > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-1.5 px-0.5 mb-3.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-outfit font-bold text-neutral-800 dark:text-neutral-200 text-xs sm:text-[13px]">
                  Total del período
                </span>
                <span className="text-neutral-400 dark:text-neutral-500 font-medium text-xs">
                  ({detalleData.totales.total_items} {detalleData.totales.total_items === 1 ? 'orden filtrada' : 'órdenes filtradas'})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3.5 sm:gap-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                    Mano de obra:
                  </span>
                  <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
                    RD$ {formatCurrency(detalleData.totales.suma_mano_obra)}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                    Anticipo:
                  </span>
                  <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
                    RD$ {formatCurrency(detalleData.totales.suma_anticipo)}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                    Liquidado:
                  </span>
                  <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">
                    RD$ {formatCurrency(detalleData.totales.suma_liquidado)}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 pl-2 sm:pl-3 border-l border-neutral-200 dark:border-neutral-700">
                  <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                    Total cobrado:
                  </span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 tabular-nums sm:text-[13px]">
                    RD$ {formatCurrency(detalleData.totales.suma_facturado)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Tabla Responsive */}
          <div className="overflow-x-auto rounded-2xl border border-neutral-200/70 dark:border-neutral-800/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/80 dark:bg-neutral-900/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200/70 dark:border-neutral-800/80 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Equipo</th>
                  <th className="py-3.5 px-4">Técnico</th>
                  <th className="py-3.5 px-4 text-right">Mano Obra</th>
                  <th className="py-3.5 px-4 text-right">Anticipo</th>
                  <th className="py-3.5 px-4 text-right">Liquidado</th>
                  <th className="py-3.5 px-4 text-right font-bold">Total Cobrado</th>
                  <th className="py-3.5 px-4">Pago</th>
                  <th className="py-3.5 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium">
                {detalleLoading ? (
                  <TableSkeleton rows={8} cols={11} />
                ) : (!detalleData.ordenes || detalleData.ordenes.length === 0) ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-neutral-400">
                      No se encontraron órdenes con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  detalleData.ordenes.map((orden) => {
                    const EstadoIcon = getEstadoIcon(orden);
                    const estadoColor = orden.color_badge || getEstadoColor(orden);
                    const estadoLabel = getEstadoLabel(orden);

                    return (
                      <tr
                        key={orden.id}
                        className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        {/* Ticket */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                          <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:text-red-600 transition-colors">
                            {orden.codigo_ticket}
                          </span>
                        </td>

                        {/* Fecha */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                            <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span className="text-xs font-inter">
                              {formatDateLocal(orden.fecha_entrega_real || orden.fecha_recepcion)}
                            </span>
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="py-3.5 px-4 max-w-[150px] truncate align-middle text-neutral-800 dark:text-neutral-200 text-xs font-medium" title={orden.cliente_nombre}>
                          {orden.cliente_nombre || '—'}
                        </td>

                        {/* Equipo */}
                        <td className="py-3.5 px-4 max-w-[150px] truncate align-middle text-neutral-700 dark:text-neutral-300 text-xs font-medium" title={orden.equipo}>
                          {orden.equipo || '—'}
                        </td>

                        {/* Técnico */}
                        <td className="py-3.5 px-4 align-middle">
                          {(Array.isArray(orden.tecnicos) && orden.tecnicos.length > 0) || (orden.tecnico_nombre && orden.tecnico_nombre !== 'Sin asignar') ? (
                            <div
                              className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex items-start gap-1 whitespace-normal break-words leading-tight max-w-[160px]"
                              title={
                                Array.isArray(orden.tecnicos) && orden.tecnicos.length > 0
                                  ? orden.tecnicos.map((t) => t.nombre_completo || t.nombre).join(', ')
                                  : orden.tecnico_nombre
                              }
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                              <span>
                                {Array.isArray(orden.tecnicos) && orden.tecnicos.length > 0
                                  ? orden.tecnicos.map((t) => t.nombre_completo || `${t.nombre} ${t.apellido || ''}`.trim()).join(', ')
                                  : orden.tecnico_nombre}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Inbox className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                Sin asignar
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Mano de Obra */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400 align-middle">
                          RD$ {formatCurrency(orden.mano_obra_neta != null ? orden.mano_obra_neta : (orden.costo_previsto || orden.costo_final_confirmado))}
                        </td>

                        {/* Anticipo */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400 align-middle">
                          {orden.monto_anticipo > 0 ? `RD$ ${formatCurrency(orden.monto_anticipo)}` : '—'}
                        </td>

                        {/* Liquidado */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400 align-middle">
                          {orden.monto_liquidado > 0 ? `RD$ ${formatCurrency(orden.monto_liquidado)}` : '—'}
                        </td>

                        {/* Total Cobrado */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle font-mono font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                          RD$ {formatCurrency(orden.total_cobrado)}
                        </td>

                        {/* Método de Pago */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                          {orden.metodo_pago_entrega && orden.metodo_pago_entrega !== 'N/A' ? (
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              {orden.metodo_pago_entrega}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                              N/A
                            </span>
                          )}
                        </td>

                        {/* Estado Minimal */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-medium"
                            style={{ color: estadoColor }}
                          >
                            <EstadoIcon className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" style={{ color: estadoColor }} />
                            <span>{estadoLabel}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {detalleData.paginacion?.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
              <span>
                Página {detalleData.paginacion.page} de {detalleData.paginacion.totalPages} ({detalleData.paginacion.total} registros)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDetallePage((p) => Math.max(1, p - 1))}
                  disabled={detallePage <= 1}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDetallePage((p) => Math.min(detalleData.paginacion.totalPages, p + 1))}
                  disabled={detallePage >= detalleData.paginacion.totalPages}
                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* ── Portal de Impresión Ejecutiva A4/Carta ── */}
      {isPrinting && typeof document !== 'undefined' && createPortal(
        <div id="print-mount-point" className="print-only">
          <ReporteEjecutivoImprimible
            kpis={kpis}
            paymentMethodsList={paymentMethodsList}
            dateRange={dateRange}
            sucursalNombre={sucursalActivaLabel}
            estadoFiltroLabel={
              DETALLE_TABS.find((t) => t.id === detalleEstado)?.label || 'Entregadas / Liquidadas'
            }
            detalleData={detalleData}
            user={user}
            companyData={companyData}
          />
        </div>,
        document.body
      )}
    </DashboardLayout>
  );
};

export default ReportesPage;
