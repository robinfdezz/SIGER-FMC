import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import PostCreacionModal from '../components/servicios/PostCreacionModal';
import EntregaServicioModal from '../components/servicios/EntregaServicioModal';
import OrdenDetalleModal from '../components/servicios/OrdenDetalleModal';
import CancelarOrdenModal from '../components/servicios/CancelarOrdenModal';
import Select from '../components/common/Select';
import Badge from '../components/common/Badge';
import Pagination from '../components/common/Pagination';
import ResetFiltersButton from '../components/common/ResetFiltersButton';
import AnimatedIconButton from '../components/common/AnimatedIconButton';
import { useAuth } from '../context/AuthContext';
import { getServicios, getServicioById } from '../services/servicios.service';
import { getEstados, getSucursales } from '../services/catalogs.service';
import { getWorkers } from '../services/workers.service';
import { getCompanyProfile, getBranches } from '../services/configuracion.service';
import { sileo } from 'sileo';
import {
  Plus,
  Search,
  RefreshCw,
  RotateCcw,
  Ticket,
  Printer,
  User,
  Smartphone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  ChevronsUp,
  Equal,
  ChevronsDown,
  Laptop,
  Tablet,
  Gamepad2,
  Watch,
  Package,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Clock,
  Wrench,
  ClipboardCheck,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Inbox,
  PackageCheck,
  Ban
} from 'lucide-react';

const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.sucursales)) return res.data.sucursales;
  if (Array.isArray(res?.sucursales)) return res.sucursales;
  return [];
};

const getPrioridadConfig = (prioridad) => {
  switch (prioridad?.toLowerCase()) {
    case 'urgente':
      return {
        label: 'Urgente',
        color: 'danger',
        icon: <Flame className="fill-current" />
      };
    case 'alta':
      return {
        label: 'Alta',
        color: 'warning',
        icon: ChevronsUp
      };
    case 'media':
      return {
        label: 'Media',
        color: 'info',
        icon: Equal
      };
    case 'baja':
    default:
      return {
        label: 'Baja',
        color: 'neutral',
        icon: ChevronsDown
      };
  }
};

const getPrioridadVariant = (prioridad) => getPrioridadConfig(prioridad).color;

const getDeviceCategoryIcon = (categoria) => {
  const norm = (categoria || '').toLowerCase().trim();
  const iconClass = "text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5";
  if (norm.includes('laptop') || norm.includes('portatil') || norm.includes('portátil') || norm.includes('notebook') || norm.includes('computadora')) {
    return <Laptop size={14} className={iconClass} />;
  }
  if (norm.includes('tablet') || norm.includes('ipad') || norm.includes('tableta')) {
    return <Tablet size={14} className={iconClass} />;
  }
  if (norm.includes('consola') || norm.includes('videojuego') || norm.includes('game') || norm.includes('play') || norm.includes('xbox') || norm.includes('nintendo')) {
    return <Gamepad2 size={14} className={iconClass} />;
  }
  if (norm.includes('watch') || norm.includes('reloj') || norm.includes('band')) {
    return <Watch size={14} className={iconClass} />;
  }
  if (norm.includes('phone') || norm.includes('celular') || norm.includes('movil') || norm.includes('móvil') || norm.includes('smartphone')) {
    return <Smartphone size={14} className={iconClass} />;
  }
  return <Package size={14} className={iconClass} />;
};

/**
 * Normaliza y desduplica marca y modelo (ej: "Google Pixel" y "Google Pixel 7 Pro" -> "Google Pixel · 7 Pro")
 */
const formatDeviceName = (marca = '', modelo = '') => {
  const m = String(marca || '').trim();
  let mod = String(modelo || '').trim();

  if (m && mod.toLowerCase().startsWith(m.toLowerCase())) {
    mod = mod.slice(m.length).replace(/^[\s\-_/]+/, '').trim();
  }

  if (m && mod) {
    return (
      <>
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{m}</span>
        <span className="text-neutral-300 dark:text-neutral-600 mx-1 font-light">·</span>
        <span>{mod}</span>
      </>
    );
  }
  return m || mod || 'Dispositivo Sin Identificar';
};

const getDeviceFullCleanName = (marca = '', modelo = '') => {
  const m = String(marca || '').trim();
  let mod = String(modelo || '').trim();
  if (m && mod.toLowerCase().startsWith(m.toLowerCase())) {
    mod = mod.slice(m.length).replace(/^[\s\-_/]+/, '').trim();
  }
  if (m && mod) return `${m} · ${mod}`;
  return m || mod || 'Dispositivo Sin Identificar';
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
  // ¡CRÍTICO: Evaluar LISTO_ENTREGA primero para que "entrega" no sea capturado por "entregado"!
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
      return CheckCircle;
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

const FALLBACK_ESTADOS = [
  { id: 1, codigo_estado: 'RECIBIDO', nombre_estado: 'Recibido en Taller', color_badge: '#3B82F6', orden_flujo: 1 },
  { id: 2, codigo_estado: 'EN_DIAGNOSTICO', nombre_estado: 'En Diagnóstico', color_badge: '#F59E0B', orden_flujo: 2 },
  { id: 3, codigo_estado: 'EN_ESPERA_REPUESTO', nombre_estado: 'En Espera de Repuesto', color_badge: '#EC4899', orden_flujo: 3 },
  { id: 4, codigo_estado: 'EN_REPARACION', nombre_estado: 'En Proceso de Reparación', color_badge: '#8B5CF6', orden_flujo: 4 },
  { id: 5, codigo_estado: 'CONTROL_CALIDAD', nombre_estado: 'Control de Calidad / Pruebas', color_badge: '#06B6D4', orden_flujo: 5 },
  { id: 6, codigo_estado: 'LISTO_ENTREGA', nombre_estado: 'Listo para Entrega', color_badge: '#10B981', orden_flujo: 6 },
  { id: 7, codigo_estado: 'ENTREGADO', nombre_estado: 'Entregado al Cliente', color_badge: '#059669', orden_flujo: 7 },
  { id: 8, codigo_estado: 'CANCELADO', nombre_estado: 'Cancelado / No Reparado', color_badge: '#EF4444', orden_flujo: 8 }
];

export const ServiciosPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const userRole = String(currentUser?.rol_nombre || currentUser?.rol || '').toLowerCase();
  const isSuperAdmin = userRole === 'superadmin';
  const isTecnico = userRole === 'tecnico' || userRole.includes('tecnic') || Number(currentUser?.rol_id) === 4;
  const canAccessTaller = isSuperAdmin || userRole.includes('admin') || isTecnico;

  // Datos de empresa y sucursal para reimpresión
  const [companyData, setCompanyData] = useState(null);
  const [branchData, setBranchData] = useState(() => {
    if (currentUser?.sucursal_id || currentUser?.sucursal_nombre) {
      return {
        id: currentUser.sucursal_id,
        nombre_sucursal: currentUser.sucursal_nombre,
        codigo_sucursal: currentUser.sucursal_codigo
      };
    }
    return null;
  });

  // Catálogos para filtros
  const [estados, setEstados] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);

  // Estado de la tabla y paginación
  const [ordenes, setOrdenes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Filtros interactivos
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('all');
  const [selectedPrioridad, setSelectedPrioridad] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedTecnico, setSelectedTecnico] = useState('all');

  // Modal de reimpresión
  const [ordenAImprimir, setOrdenAImprimir] = useState(null);
  const [showPostCreacion, setShowPostCreacion] = useState(false);

  // Modal de liquidación y entrega
  const [ordenParaEntregar, setOrdenParaEntregar] = useState(null);

  // Modal de cancelación de orden
  const [ordenParaCancelar, setOrdenParaCancelar] = useState(null);

  // Modal de visualización rápida / Ficha de la Orden
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [selectedOrdenDetalle, setSelectedOrdenDetalle] = useState(null);

  const handleOpenDetalleModal = (orden) => {
    setSelectedOrdenDetalle(orden);
    setIsDetalleModalOpen(true);
  };

  // Debounce de búsqueda (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Carga de catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [estadosRes, sucursalesRes, workersRes] = await Promise.all([
          getEstados().catch(() => ({ data: [] })),
          getSucursales().catch(() => ({ data: [] })),
          getWorkers({ activo: true }).catch(() => ({ data: [] }))
        ]);

        const estadosArr = extractArray(estadosRes);
        setEstados(estadosArr.length > 0 ? estadosArr : FALLBACK_ESTADOS);
        setSucursales(extractArray(sucursalesRes));

        const allWorkers = extractArray(workersRes);
        const tecnicosList = allWorkers.filter((w) => {
          const rol = (w.rol_nombre || w.nombre_rol || '').toLowerCase();
          return rol.includes('tecnico') || rol.includes('admin') || w.rol_id === 4;
        });
        setTecnicos(tecnicosList.length > 0 ? tecnicosList : allWorkers);
      } catch (err) {
        console.error('Error al cargar catálogos en ServiciosPage:', err);
      }
    };

    loadCatalogs();
  }, []);

  // Carga de datos de empresa y sucursal del usuario
  useEffect(() => {
    getCompanyProfile().then((r) => r.ok && setCompanyData(r.data)).catch(() => { });
    getBranches().then((r) => {
      if (!r.ok) return;
      const branches = r.data || [];
      const userBranch = branches.find((b) => b.id === currentUser?.sucursal_id) ||
        (currentUser?.sucursal_nombre ? branches.find((b) => b.nombre_sucursal === currentUser.sucursal_nombre) : null) ||
        branches[0];
      if (userBranch) {
        setBranchData(userBranch);
      }
    }).catch(() => { });
  }, [currentUser?.sucursal_id]);

  // Consulta de órdenes con filtros activos y paginación
  const fetchOrdenes = useCallback(async (targetPage = page, targetLimit = limit) => {
    setIsLoading(true);
    try {
      const params = { page: targetPage, limit: targetLimit };
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      if (selectedEstado && selectedEstado !== 'all') params.estado_id = selectedEstado;
      if (selectedPrioridad !== 'all') params.prioridad = selectedPrioridad;
      if (selectedBranch !== 'all') params.sucursal_id = selectedBranch;
      if (selectedTecnico !== 'all') params.tecnico_id = selectedTecnico;

      const res = await getServicios(params);
      if (res.ok) {
        const rows = res.servicios || res.data || [];
        setOrdenes(rows);
        const pag = res.pagination || {
          total: rows.length,
          page: targetPage,
          limit: targetLimit,
          totalPages: Math.ceil(rows.length / targetLimit) || 1
        };
        setPagination(pag);
        setPage(pag.page || targetPage);
        setLimit(pag.limit || targetLimit);
        return true;
      }
      return false;
    } catch {
      sileo.error({ title: 'Error', description: 'No se pudo cargar el listado de órdenes.' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedEstado, selectedPrioridad, selectedBranch, selectedTecnico, page, limit]);

  // Recarga reactiva al cambiar filtros: siempre reinicia a la página 1
  useEffect(() => {
    setPage(1);
    fetchOrdenes(1, limit);
  }, [debouncedSearch, selectedEstado, selectedPrioridad, selectedBranch, selectedTecnico]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    (selectedEstado && selectedEstado !== 'all') ||
    selectedPrioridad !== 'all' ||
    selectedBranch !== 'all' ||
    selectedTecnico !== 'all'
  );

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchOrdenes(newPage, limit);
  };

  const handleItemsPerPageChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    fetchOrdenes(1, newLimit);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedEstado('all');
    setSelectedPrioridad('all');
    setSelectedBranch('all');
    setSelectedTecnico('all');
    setPage(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const success = await fetchOrdenes(page, limit);
    setIsRefreshing(false);
    if (success) {
      setRefreshSuccess(true);
    }
  };

  const handlePostCreacionClose = () => {
    setShowPostCreacion(false);
    setOrdenAImprimir(null);
  };

  const handleImprimirClick = async (orden) => {
    if (!orden) return;
    const flujo = Number(orden.orden_flujo || 0);
    const cod = String(orden.codigo_estado || '').toUpperCase();
    const nom = String(orden.estado || orden.nombre_estado || '').toLowerCase();
    if (flujo === 8 || cod.includes('CANCEL') || nom.includes('cancelad')) {
      sileo.warning({
        title: 'Impresión no permitida',
        description: 'No se permite emitir comprobantes o etiquetas para órdenes canceladas.'
      });
      return;
    }

    try {
      const res = await getServicioById(orden.id);
      if (res?.ok && res?.data) {
        setOrdenAImprimir({ ...orden, ...res.data });
      } else {
        setOrdenAImprimir(orden);
      }
    } catch (err) {
      console.error('Error al obtener detalle de orden para reimpresion:', err);
      setOrdenAImprimir(orden);
    } finally {
      setShowPostCreacion(true);
    }
  };

  // Estado y lógica de ordenamiento interactivo (sort)
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  const handleSort = (columnKey) => {
    setSortConfig((prev) => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedServicios = useMemo(() => {
    const items = [...ordenes];
    if (!sortConfig.key) return items;

    // Mapeo numérico de prioridades para orden lógico (no alfabético)
    const priorityWeight = { urgente: 3, alta: 2, media: 1, baja: 0 };

    return items.sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortConfig.key) {
        case 'ticket':
          valA = (a.codigo_ticket || '').toLowerCase();
          valB = (b.codigo_ticket || '').toLowerCase();
          break;
        case 'cliente':
          valA = (a.nombre_cliente || a.cliente_nombre || a.cliente || '').toLowerCase();
          valB = (b.nombre_cliente || b.cliente_nombre || b.cliente || '').toLowerCase();
          break;
        case 'equipo':
          valA = getDeviceFullCleanName(a.marca_equipo || a.marca, a.modelo_equipo || a.modelo).toLowerCase();
          valB = getDeviceFullCleanName(b.marca_equipo || b.marca, b.modelo_equipo || b.modelo).toLowerCase();
          break;
        case 'estado':
          valA = (a.estado || a.estado_nombre || a.nombre_estado || '').toLowerCase();
          valB = (b.estado || b.estado_nombre || b.nombre_estado || '').toLowerCase();
          break;
        case 'prioridad': {
          const prioA = (a.prioridad || a.nivel_prioridad || '').toLowerCase();
          const prioB = (b.prioridad || b.nivel_prioridad || '').toLowerCase();
          valA = priorityWeight[prioA] ?? 0;
          valB = priorityWeight[prioB] ?? 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        case 'fecha':
        default:
          valA = new Date(a.fecha_ingreso || a.created_at || 0).getTime();
          valB = new Date(b.fecha_ingreso || b.created_at || 0).getTime();
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [ordenes, sortConfig]);

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={13} strokeWidth={2.5} className="text-red-600 dark:text-red-400 shrink-0 transition-transform" />
    ) : (
      <ChevronDown size={13} strokeWidth={2.5} className="text-red-600 dark:text-red-400 shrink-0 transition-transform" />
    );
  };

  // Opciones para los componentes Select
  const estadoOptions = useMemo(() => [
    { id: 'all', value: 'all', label: 'Todos los Estados' },
    ...estados.map((e) => {
      const Icon = getEstadoIcon(e);
      const color = getEstadoColor(e);
      return {
        id: String(e.id),
        value: String(e.id),
        label: getEstadoLabel(e),
        icon: <Icon size={16} className="shrink-0 stroke-[2.2]" style={{ color }} />
      };
    })
  ], [estados]);

  const prioridadOptions = useMemo(() => [
    { id: 'all', label: 'Todas las Prioridades' },
    {
      id: 'baja',
      value: 'baja',
      label: 'Baja',
      icon: <ChevronsDown size={16} className="text-neutral-500 dark:text-neutral-400 shrink-0" />
    },
    {
      id: 'media',
      value: 'media',
      label: 'Media',
      icon: <Equal size={16} className="text-blue-500 dark:text-blue-400 shrink-0" />
    },
    {
      id: 'alta',
      value: 'alta',
      label: 'Alta',
      icon: <ChevronsUp size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
    },
    {
      id: 'urgente',
      value: 'urgente',
      label: 'Urgente',
      icon: <Flame size={16} className="fill-current text-red-500 dark:text-red-400 shrink-0" />
    }
  ], []);

  const branchOptions = useMemo(() => [
    { id: 'all', label: 'Todas las Sucursales' },
    ...sucursales.map((s) => ({
      id: String(s.id),
      label: s.nombre_sucursal || s.nombre
    }))
  ], [sucursales]);

  const tecnicoOptions = useMemo(() => [
    { id: 'all', label: 'Todos los Técnicos' },
    ...tecnicos.map((t) => ({
      id: String(t.id),
      label: `${t.nombre} ${t.apellido || ''}`.trim()
    }))
  ], [tecnicos]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Contenedor Superior Integrado (Encabezado + Filtros) */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-5">
          {/* Fila Superior: Título, subtítulo y botones de acción */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-outfit">
                Órdenes de Servicio
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
                Recepción, seguimiento y control de equipos en taller.
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
                ariaLabel="Refrescar lista de órdenes"
              />
              {!isTecnico && (
                <button
                  type="button"
                  onClick={() => navigate('/tickets/nueva')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl shadow-xs hover:shadow-md transition-all font-inter cursor-pointer"
                >
                  <Plus size={17} />
                  <span>Nueva Orden</span>
                </button>
              )}
            </div>
          </div>

          {/* Fila Inferior: Buscador Dinámico y Filtros */}
          <div className="space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Buscador Prominente Dinámico */}
              <div className="relative flex-1 max-w-md lg:max-w-lg w-full">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código, cliente, equipo, marca..."
                  className="w-full pl-9 pr-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors font-inter"
                />
              </div>

              {/* Selectores Dinámicos y Botón Limpiar */}
              <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
                {/* Selector Estado */}
                <div className="w-[185px] sm:w-[205px]">
                  <Select
                    value={selectedEstado}
                    onChange={(val) => setSelectedEstado(val)}
                    items={estadoOptions}
                    placeholder="Todos los Estados"
                  />
                </div>

                {/* Selector Prioridad */}
                <div className="w-[140px] sm:w-[155px]">
                  <Select
                    value={selectedPrioridad}
                    onChange={(val) => setSelectedPrioridad(val)}
                    items={prioridadOptions}
                    placeholder="Todas las Prioridades"
                  />
                </div>

                {/* Selector Sucursal (Visible si es SuperAdmin) */}
                {isSuperAdmin && (
                  <div className="w-[145px] sm:w-[165px]">
                    <Select
                      value={selectedBranch}
                      onChange={(val) => setSelectedBranch(val)}
                      items={branchOptions}
                      placeholder="Todas las Sucursales"
                    />
                  </div>
                )}

                {/* Selector Técnico */}
                <div className="w-[140px] sm:w-[160px]">
                  <Select
                    value={selectedTecnico}
                    onChange={(val) => setSelectedTecnico(val)}
                    items={tecnicoOptions}
                    placeholder="Todos los Técnicos"
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

        {/* Tabla de Órdenes de Servicio */}
        <div className="bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto overflow-y-auto h-[560px] relative">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-[#141416] shadow-xs">
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-inter">
                  <th
                    onClick={() => handleSort('ticket')}
                    className="py-3 px-2.5 sm:px-3 whitespace-nowrap w-[11%] min-w-[105px] bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Ticket</span>
                      {renderSortIcon('ticket')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('cliente')}
                    className="py-3 px-3 sm:px-4 whitespace-nowrap w-[20%] min-w-[165px] bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cliente</span>
                      {renderSortIcon('cliente')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('equipo')}
                    className="py-3 px-3 sm:px-4 whitespace-nowrap w-[22%] min-w-[165px] bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Equipo</span>
                      {renderSortIcon('equipo')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('estado')}
                    className="py-3 px-3 sm:px-4 whitespace-nowrap w-[17%] min-w-[130px] bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Estado</span>
                      {renderSortIcon('estado')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('prioridad')}
                    className="py-3 px-3 sm:px-4 whitespace-nowrap w-[13%] min-w-[100px] bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Prioridad</span>
                      {renderSortIcon('prioridad')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('fecha')}
                    className="py-3 px-2.5 sm:px-3 whitespace-nowrap w-[12%] min-w-[90px] bg-neutral-50 dark:bg-[#141416] sticky top-0 cursor-pointer select-none transition-colors hover:text-neutral-900 dark:hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Fecha</span>
                      {renderSortIcon('fecha')}
                    </div>
                  </th>

                  <th className="py-3 px-2 sm:px-2.5 whitespace-nowrap text-center w-[5%] min-w-[50px] bg-neutral-50 dark:bg-[#141416] sticky top-0">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80 font-inter text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="animate-spin text-red-500" size={28} />
                        <span className="text-sm">Cargando órdenes...</span>
                      </div>
                    </td>
                  </tr>
                ) : sortedServicios.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Ticket className="text-neutral-300 dark:text-neutral-600" size={36} />
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 font-outfit">
                          No se encontraron órdenes de servicio
                        </p>
                        <p className="text-xs text-neutral-400 font-inter">
                          Prueba ajustando los filtros o registra una nueva orden.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedServicios.map((orden) => {
                    const estadoObj = (estados || []).find((e) =>
                      (orden.estado_id && Number(e.id) === Number(orden.estado_id)) ||
                      (orden.codigo_estado && String(e.codigo_estado).toUpperCase() === String(orden.codigo_estado).toUpperCase()) ||
                      (orden.estado && (String(e.nombre_estado).toLowerCase() === String(orden.estado).toLowerCase() || String(e.codigo_estado).toUpperCase() === String(orden.estado).toUpperCase()))
                    ) || {
                      orden_flujo: orden.orden_flujo,
                      codigo_estado: orden.codigo_estado,
                      nombre_estado: orden.estado,
                      color_badge: orden.estado_color
                    };
                    const estadoNormKey = normalizeEstadoKey(estadoObj);
                    const isListoParaEntrega = estadoNormKey === 'LISTO_ENTREGA' || Number(orden.orden_flujo) === 6 || orden.codigo_estado === 'LISTO_ENTREGA';

                    const codEstadoRow = String(orden.codigo_estado || '').toUpperCase();
                    const flujoRow = Number(orden.orden_flujo || 0);
                    const nomEstadoRow = String(orden.estado || orden.nombre_estado || '').toLowerCase();
                    const isCancelado = flujoRow === 8 || codEstadoRow.includes('CANCEL') || nomEstadoRow.includes('cancelad');
                    const isEntregado = flujoRow === 7 || codEstadoRow.includes('ENTREG') || nomEstadoRow.includes('entregad');
                    const esInactiva = isEntregado || isCancelado;

                    return (
                      <tr
                        key={orden.id}
                        onClick={() => handleOpenDetalleModal(orden)}
                        className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-all cursor-pointer"
                      >
                        {/* Columna 1: Ticket */}
                        <td className="py-3 px-2.5 sm:px-3 whitespace-nowrap align-middle">
                          <div className="font-mono font-bold text-neutral-900 dark:text-neutral-100 tracking-tight text-xs sm:text-[13px]">
                            {orden.codigo_ticket}
                          </div>
                          {orden.es_garantia && (
                            <div className="mt-1">
                              <Badge
                                variant="minimal"
                                color="danger"
                                icon={<ShieldCheck size={11} className="stroke-[2.2] shrink-0" />}
                                size="sm"
                                className="font-semibold text-[10px] tracking-wide leading-none"
                              >
                                GARANTÍA
                              </Badge>
                            </div>
                          )}
                        </td>

                        {/* Columna 2: Cliente */}
                        <td className="py-3 px-3 sm:px-4 align-middle min-w-[165px] max-w-[220px]">
                          <div className="flex items-start gap-1.5">
                            <User size={13} className="text-neutral-400 shrink-0 mt-0.5" />
                            <span className="text-neutral-800 dark:text-neutral-200 font-medium text-xs leading-snug whitespace-normal break-words">
                              {orden.nombre_cliente || '—'}
                            </span>
                          </div>
                          {orden.telefono_cliente && (
                            <p className="text-[11px] text-neutral-400 font-inter ml-5 font-mono whitespace-nowrap mt-0.5">
                              {orden.telefono_cliente}
                            </p>
                          )}
                        </td>

                        {/* Columna 3: Equipo */}
                        <td className="py-3 px-3 sm:px-4 align-middle min-w-[165px] max-w-[230px]">
                          <div className="flex items-start gap-1.5">
                            {getDeviceCategoryIcon(orden.categoria)}
                            <span
                              className="text-neutral-700 dark:text-neutral-300 font-medium text-xs leading-snug whitespace-normal break-words"
                              title={getDeviceFullCleanName(orden.marca_equipo, orden.modelo_equipo)}
                            >
                              {formatDeviceName(orden.marca_equipo, orden.modelo_equipo)}
                            </span>
                          </div>
                          {Array.isArray(orden.tecnicos) && orden.tecnicos.length > 0 ? (
                            <p
                              className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter mt-1 flex items-start gap-1 whitespace-normal break-words leading-tight"
                              title={orden.tecnicos.map((t) => t.nombre_completo).join(', ')}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                              <span>{orden.tecnicos.map((t) => t.nombre_completo).join(', ')}</span>
                            </p>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-inter mt-1">
                              <Inbox size={12} className="text-amber-500 shrink-0" />
                              <span>Sin asignar</span>
                            </div>
                          )}
                        </td>

                        {/* Columna 4: Estado con Badge minimal */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap align-middle">
                          {orden.estado ? (
                            (() => {
                              const EstadoIcon = getEstadoIcon(estadoObj);
                              const estadoColor = orden.estado_color || getEstadoColor(estadoObj);
                              const estadoLabel = getEstadoLabel(estadoObj);

                              return (
                                <Badge
                                  variant="minimal"
                                  size="sm"
                                  showDot={false}
                                  icon={<EstadoIcon size={12} className="shrink-0 stroke-[2.2]" style={{ color: estadoColor }} />}
                                  className="font-medium"
                                  style={{ color: estadoColor }}
                                >
                                  {estadoLabel}
                                </Badge>
                              );
                            })()
                          ) : (
                            <span className="text-neutral-400 dark:text-neutral-500">—</span>
                          )}
                        </td>

                        {/* Columna 5: Prioridad con Badge minimal */}
                        <td className="py-3 px-3 sm:px-4 whitespace-nowrap align-middle">
                          {orden.prioridad ? (
                            (() => {
                              const config = getPrioridadConfig(orden.prioridad);
                              const PriorityIcon = config.icon;
                              return (
                                <Badge
                                  variant="minimal"
                                  color={config.color}
                                  icon={PriorityIcon}
                                  size="sm"
                                  className="capitalize font-medium"
                                >
                                  {config.label}
                                </Badge>
                              );
                            })()
                          ) : (
                            <span className="text-neutral-400 dark:text-neutral-500">—</span>
                          )}
                        </td>

                        {/* Columna 6: Fecha */}
                        <td className="py-3 px-2.5 sm:px-3 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                            <Calendar size={13} className="shrink-0" />
                            <span className="text-xs font-inter">
                              {orden.created_at
                                ? new Date(orden.created_at).toLocaleDateString('es-DO', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                                : '—'}
                            </span>
                          </div>
                        </td>

                        {/* Columna 7: Acciones */}
                        <td className="py-3 px-2 sm:px-2.5 whitespace-nowrap text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            {isListoParaEntrega && !isTecnico && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrdenParaEntregar(orden);
                                }}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                title="Liquidar y entregar equipo"
                              >
                                <PackageCheck size={16} />
                              </button>
                            )}
                            {!isCancelado && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImprimirClick(orden);
                                }}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="Imprimir comprobante o etiqueta"
                              >
                                <Printer size={15} />
                              </button>
                            )}

                            {!esInactiva && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrdenParaCancelar(orden);
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Cancelar orden de servicio"
                              >
                                <Ban size={15} />
                              </button>
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

          {/* Componente Reutilizable de Paginación */}
          <Pagination
            currentPage={pagination.page || page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total || 0}
            itemsPerPage={pagination.limit || limit}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            pageSizeOptions={[10, 20, 50, 100]}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Modal de Detalle / Ficha de la Orden */}
      <OrdenDetalleModal
        isOpen={isDetalleModalOpen}
        onClose={() => {
          setIsDetalleModalOpen(false);
          setSelectedOrdenDetalle(null);
        }}
        ordenId={selectedOrdenDetalle?.id}
        orden={selectedOrdenDetalle}
        onOpenTaller={canAccessTaller ? (targetOrder) => {
          const ord = targetOrder || selectedOrdenDetalle;
          setIsDetalleModalOpen(false);
          setSelectedOrdenDetalle(null);
          navigate('/taller', {
            state: {
              autoOpenOrdenId: ord?.id,
              autoOpenCodigo: ord?.codigo_ticket || ord?.codigo_orden
            }
          });
        } : null}
        onPrintTicket={(ord) => {
          setIsDetalleModalOpen(false);
          handleImprimirClick(ord);
        }}
        onOrderUpdated={() => {
          fetchOrdenes(page, limit);
        }}
      />

      {/* Modal de Impresión */}
      <PostCreacionModal
        isOpen={showPostCreacion}
        onClose={handlePostCreacionClose}
        orden={ordenAImprimir}
        companyData={companyData}
        branchData={branchData}
      />

      {/* Modal de Liquidación y Entrega */}
      <EntregaServicioModal
        isOpen={Boolean(ordenParaEntregar)}
        onClose={() => setOrdenParaEntregar(null)}
        orden={ordenParaEntregar}
        onSuccess={(ordenEntregada) => {
          setOrdenes((prev) =>
            prev.map((o) =>
              o.id === ordenEntregada.id
                ? {
                    ...o,
                    ...ordenEntregada,
                    estado: 'Entregado al Cliente',
                    orden_flujo: 7,
                    codigo_estado: 'ENTREGADO',
                    costo_final_confirmado: ordenEntregada.costo_final_confirmado,
                    fecha_entrega_real: ordenEntregada.fecha_entrega_real
                  }
                : o
            )
          );
          fetchOrdenes(pagination.page || 1);
        }}
      />

      {/* Modal de Cancelación de Orden */}
      <CancelarOrdenModal
        isOpen={Boolean(ordenParaCancelar)}
        onClose={() => setOrdenParaCancelar(null)}
        orden={ordenParaCancelar}
        onSuccess={(updatedOrden) => {
          setOrdenes((prev) =>
            prev.map((o) =>
              o.id === updatedOrden.id
                ? {
                    ...o,
                    ...updatedOrden,
                    estado: updatedOrden.estado || 'Cancelado / No Reparado',
                    codigo_estado: updatedOrden.codigo_estado || 'CANCELADO_DEVUELTO',
                    orden_flujo: 8,
                    estado_color: '#EF4444'
                  }
                : o
            )
          );
          fetchOrdenes(page, limit);
        }}
      />
    </DashboardLayout>
  );
};

export default ServiciosPage;