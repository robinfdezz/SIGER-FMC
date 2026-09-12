import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StepperHeader from '../components/servicios/StepperHeader';
import ClientQuickSelect from '../components/servicios/ClientQuickSelect';
import DevicePhotoUploader from '../components/servicios/DevicePhotoUploader';
import DeviceSecurityPicker from '../components/servicios/DeviceSecurityPicker';
import DeviceChecklistPicker from '../components/servicios/DeviceChecklistPicker';
import PostCreacionModal from '../components/servicios/PostCreacionModal';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import DatePicker from '../components/common/DatePicker';
import { getCategorias, createServicio, validarGarantiaTicket } from '../services/servicios.service';
import { getWorkers } from '../services/workers.service';
import { getCompanyProfile, getBranches } from '../services/configuracion.service';
import { useAuth } from '../context/AuthContext';
import { sileo } from 'sileo';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  User,
  Smartphone,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Lock,
  Tag,
  Wrench,
  Check,
  Flame,
  ChevronsUp,
  Equal,
  ChevronsDown,
  Laptop,
  Tablet,
  Gamepad2,
  Watch,
  Package
} from 'lucide-react';

const getCategoryIcon = (categoryName) => {
  const norm = (categoryName || '').toLowerCase().trim();
  const iconClass = "text-red-600 dark:text-red-400 shrink-0";
  if (norm.includes('laptop') || norm.includes('portatil') || norm.includes('portátil') || norm.includes('notebook') || norm.includes('computadora')) {
    return <Laptop size={16} className={iconClass} />;
  }
  if (norm.includes('tablet') || norm.includes('ipad') || norm.includes('tableta')) {
    return <Tablet size={16} className={iconClass} />;
  }
  if (norm.includes('consola') || norm.includes('videojuego') || norm.includes('game') || norm.includes('play') || norm.includes('xbox') || norm.includes('nintendo')) {
    return <Gamepad2 size={16} className={iconClass} />;
  }
  if (norm.includes('watch') || norm.includes('reloj') || norm.includes('band')) {
    return <Watch size={16} className={iconClass} />;
  }
  if (norm.includes('phone') || norm.includes('celular') || norm.includes('movil') || norm.includes('móvil') || norm.includes('smartphone')) {
    return <Smartphone size={16} className={iconClass} />;
  }
  return <Package size={16} className={iconClass} />;
};

const FALLBACK_CATEGORIAS = [
  { id: '1', value: '1', label: 'Smartphone', icon: <Smartphone size={16} className="text-red-600 dark:text-red-400 shrink-0" /> },
  { id: '2', value: '2', label: 'Laptop', icon: <Laptop size={16} className="text-red-600 dark:text-red-400 shrink-0" /> },
  { id: '3', value: '3', label: 'Tablet / iPad', icon: <Tablet size={16} className="text-red-600 dark:text-red-400 shrink-0" /> },
  { id: '4', value: '4', label: 'Consola de Videojuegos', icon: <Gamepad2 size={16} className="text-red-600 dark:text-red-400 shrink-0" /> },
  { id: '5', value: '5', label: 'Smartwatch', icon: <Watch size={16} className="text-red-600 dark:text-red-400 shrink-0" /> },
  { id: '6', value: '6', label: 'Otros', icon: <Package size={16} className="text-red-600 dark:text-red-400 shrink-0" /> }
];

const PRIORIDAD_OPTIONS = [
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
];

const GARANTIA_OPTIONS = [
  { id: '0', value: '0', label: 'Sin garantía (0 días)' },
  { id: '15', value: '15', label: '15 días' },
  { id: '30', value: '30', label: '30 días' },
  { id: '60', value: '60', label: '60 días' },
  { id: '90', value: '90', label: '90 días' },
  { id: '180', value: '180', label: '180 días' },
];

const chipActive = 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-600 text-rose-700 dark:text-rose-300 shadow-2xs';
const chipInactive = 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/40';

const inputClass = "w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none focus:outline-none focus-visible:outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:focus:ring-red-500/20 font-inter transition-colors";
const labelClass = "block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5";

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800/80 mb-4">
    <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
      <Icon size={16} />
    </div>
    <div>
      <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-outfit">{title}</h4>
      {subtitle && <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const INITIAL_FORM = {
  cliente: null,
  cliente_id: null,
  cliente_seleccionado: null,
  nombre_cliente: '',
  nombre_cliente_libre: '',
  telefono_cliente: '',
  telefono_cliente_libre: '',
  cedula_cliente: '',
  cedula_cliente_libre: '',
  correo_cliente: '',
  correo_cliente_libre: '',
  categoria_id: '',
  marca_equipo: '',
  modelo_equipo: '',
  num_serie_imei: '',
  falla_reportada: '',
  observaciones_recepcion: '',
  fotos_recepcion: [],
  datos_acceso_equipo: { metodo: 'ninguno', tipo: 'ninguno', valor: '', patron: [] },
  checklist_entrada: {},
  costo_previsto: '',
  monto_anticipo: '',
  monto_descuento: '',
  fecha_entrega_estimada: '',
  tiempo_garantia: 30,
  condiciones_garantia: '',
  prioridad: 'media',
  es_garantia: false,
  servicio_origen_id: null,
  servicio_origen_codigo: '',
  codigo_ticket_origen: '',
  tecnicos_ids: [],
  tecnicos_asignados: [],
};

export const NuevaOrdenPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = String(user?.rol_nombre || user?.rol || '').toLowerCase();
  const isTecnico = userRole === 'tecnico';

  useEffect(() => {
    if (isTecnico) {
      sileo.error({
        title: 'Acceso no autorizado',
        description: 'Los técnicos no tienen permisos para crear órdenes de servicio.'
      });
      navigate('/servicios', { replace: true });
    }
  }, [isTecnico, navigate]);

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [categorias, setCategorias] = useState([]);
  const [tecnicosDisponibles, setTecnicosDisponibles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Validación de ticket de garantía previo
  const [ticketValidation, setTicketValidation] = useState({
    loading: false,
    checked: false,
    error: null,
    data: null
  });

  // Datos para el comprobante de impresion
  const [companyData, setCompanyData] = useState(null);
  const [branchData, setBranchData] = useState(() => {
    if (user?.sucursal_id || user?.sucursal_nombre) {
      return {
        id: user.sucursal_id,
        nombre_sucursal: user.sucursal_nombre,
        codigo_sucursal: user.sucursal_codigo
      };
    }
    return null;
  });
  const [ordenCreada, setOrdenCreada] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);

  useEffect(() => {
    if (user?.sucursal_id && (!branchData || branchData.id !== user.sucursal_id || !branchData.nombre_sucursal)) {
      setBranchData(prev => ({
        ...prev,
        id: user.sucursal_id,
        nombre_sucursal: user.sucursal_nombre || prev?.nombre_sucursal,
        codigo_sucursal: user.sucursal_codigo || prev?.codigo_sucursal
      }));
    }
  }, [user]);

  useEffect(() => {
    getCategorias().then(res => {
      if (res.ok) setCategorias(res.data || []);
    }).catch(() => { });

    getCompanyProfile().then(r => r.ok && setCompanyData(r.data)).catch(() => { });
    getBranches().then(r => {
      if (!r.ok) return;
      const branches = r.data || [];
      const userBranch = branches.find(b => b.id === user?.sucursal_id) ||
        (user?.sucursal_nombre ? branches.find(b => b.nombre_sucursal === user.sucursal_nombre) : null) ||
        branches[0];
      if (userBranch) {
        setBranchData(userBranch);
      }
    }).catch(() => { });

    getWorkers({ activo: true }).then(res => {
      const rawList = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
      const list = Array.isArray(rawList) ? rawList : [];

      // 1. Filtrar solo trabajadores activos
      const activos = list.filter(w => w.activo === true || w.activo === 'true' || w.activo === 1 || w.activo === undefined);

      // 2. Asignables: Técnicos (rol_id 4) y Administradores (rol_id 1, 2) — Excluye 'Secretaria' (rol_id 3)
      const asignables = activos.filter(w => {
        const rol = String(w.rol_nombre || w.nombre_rol || '').toLowerCase();
        const rolId = Number(w.rol_id);
        const esSecretaria = rolId === 3 || rol.includes('secre');
        if (esSecretaria) return false;

        const esTecnico = rolId === 4 || rol.includes('tec') || rol.includes('téc');
        const esAdmin = rolId === 1 || rolId === 2 || rol.includes('admin');
        return esTecnico || esAdmin;
      });

      // 3. Fallback: Si no hay específicos, listar activos que no sean secretaria o todos los activos
      if (asignables.length > 0) {
        setTecnicosDisponibles(asignables);
      } else {
        const fallback = activos.filter(w => {
          const rol = String(w.rol_nombre || w.nombre_rol || '').toLowerCase();
          return Number(w.rol_id) !== 3 && !rol.includes('secre');
        });
        setTecnicosDisponibles(fallback.length > 0 ? fallback : activos);
      }
    }).catch((err) => {
      console.error('Error al cargar técnicos:', err);
    });
  }, [user?.sucursal_id]);

  const toggleTecnico = (id) => {
    const current = form.tecnicos_ids || [];
    if (current.includes(id)) {
      set('tecnicos_ids', current.filter(tId => tId !== id));
    } else {
      set('tecnicos_ids', [...current, id]);
    }
  };

  const set = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  // Limpieza de campos de orden de garantía sin tocar feedback de error
  const clearGarantiaFields = useCallback((preserveInputCode = true) => {
    setForm(prev => ({
      ...prev,
      servicio_origen_id: null,
      servicio_origen_codigo: preserveInputCode ? prev.servicio_origen_codigo : '',
      codigo_ticket_origen: preserveInputCode ? (prev.codigo_ticket_origen || prev.servicio_origen_codigo) : '',
      cliente: null,
      cliente_id: null,
      cliente_seleccionado: null,
      nombre_cliente: '',
      nombre_cliente_libre: '',
      telefono_cliente: '',
      telefono_cliente_libre: '',
      cedula_cliente: '',
      cedula_cliente_libre: '',
      correo_cliente: '',
      correo_cliente_libre: '',
      categoria_id: '',
      marca_equipo: '',
      modelo_equipo: '',
      num_serie_imei: '',
      datos_acceso_equipo: { metodo: 'ninguno', tipo: 'ninguno', valor: '', patron: [] },
      costo_previsto: '',
      monto_anticipo: '',
      monto_descuento: '',
      tecnicos_ids: [],
      tecnicos_asignados: [],
    }));
  }, []);

  // Limpieza centralizada y total del formulario cuando se cancela o desvincula la garantía
  const resetGarantiaState = useCallback((preserveInputCode = false) => {
    // 1. Limpiar feedback y estado de validación
    setTicketValidation({
      loading: false,
      checked: false,
      error: null,
      data: null
    });

    // 2. Limpiar errores de validación de garantía
    setErrors(prev => {
      const next = { ...prev };
      delete next.servicio_origen_codigo;
      delete next.codigo_ticket_origen;
      return next;
    });

    // 3. Restablecer campos del formulario rigurosamente a sus valores iniciales limpios
    clearGarantiaFields(preserveInputCode);
  }, [clearGarantiaFields]);

  const handleToggleGarantia = useCallback(() => {
    const nextVal = !form.es_garantia;
    if (!nextVal) {
      resetGarantiaState(false);
    }
    set('es_garantia', nextVal);
  }, [form.es_garantia, resetGarantiaState, set]);

  // Validación con debounce (300ms) del código de ticket original en caso de reingreso por garantía
  useEffect(() => {
    if (!form.es_garantia) {
      if (ticketValidation.checked || ticketValidation.loading || form.servicio_origen_id || form.servicio_origen_codigo) {
        resetGarantiaState(false);
      }
      return;
    }

    const code = (form.servicio_origen_codigo || form.codigo_ticket_origen || '').trim();
    if (code.length < 3) {
      if (form.servicio_origen_id || ticketValidation.checked || ticketValidation.error || ticketValidation.data) {
        resetGarantiaState(true);
      }
      return;
    }

    let isCancelled = false;
    setTicketValidation(prev => ({ ...prev, loading: true, error: null }));

    const timer = setTimeout(async () => {
      try {
        const res = await validarGarantiaTicket(code);
        if (isCancelled) return;

        // Validar si procede: debe ser ok, valido y entregado con servicio presente
        const isEntregaValida = res && res.ok && res.valido !== false && res.entregado !== false && res.codigo_error !== 'NO_ENTREGADO' && res.servicio;

        if (isEntregaValida) {
          const serv = res.servicio;
          const clienteObj = serv.cliente_id ? {
            id: serv.cliente_id,
            nombre: serv.nombre_cliente || serv.cliente || '',
            apellido: '',
            telefono: serv.telefono_cliente || '',
            cedula_rnc: serv.cedula_cliente || '',
            cedula: serv.cedula_cliente || '',
            correo: serv.correo_cliente || '',
            email: serv.correo_cliente || ''
          } : null;

          setTicketValidation({
            loading: false,
            checked: true,
            error: null,
            data: res
          });

          setForm(prev => ({
            ...prev,
            cliente: clienteObj,
            cliente_id: serv.cliente_id || null,
            cliente_seleccionado: clienteObj,
            nombre_cliente: serv.nombre_cliente || serv.cliente || '',
            nombre_cliente_libre: serv.nombre_cliente || serv.cliente || '',
            telefono_cliente: serv.telefono_cliente || '',
            telefono_cliente_libre: serv.telefono_cliente || '',
            cedula_cliente: serv.cedula_cliente || '',
            cedula_cliente_libre: serv.cedula_cliente || '',
            correo_cliente: serv.correo_cliente || '',
            correo_cliente_libre: serv.correo_cliente || '',
            categoria_id: serv.categoria_id ? String(serv.categoria_id) : prev.categoria_id,
            marca_equipo: serv.marca_equipo || '',
            modelo_equipo: serv.modelo_equipo || '',
            num_serie_imei: serv.num_serie_imei || '',
            datos_acceso_equipo: serv.datos_acceso_equipo || { metodo: 'ninguno', tipo: 'ninguno', valor: '', patron: [] },
            servicio_origen_id: serv.id,
            servicio_origen_codigo: serv.codigo_ticket || code,
            codigo_ticket_origen: serv.codigo_ticket || code,
            costo_previsto: 0,
            monto_anticipo: 0,
            monto_descuento: 0
          }));
        } else {
          // No procede o no entregado: marcar inválido y limpiar datos autocompletados
          const errorMsg = res?.message || res?.error || 'El equipo correspondiente a este ticket aún no ha sido entregado al cliente.';
          setTicketValidation({
            loading: false,
            checked: true,
            error: errorMsg,
            data: res || { ok: false, valido: false, codigo_error: 'NO_ENTREGADO' }
          });
          clearGarantiaFields(true);
        }
      } catch (err) {
        if (isCancelled) return;
        setTicketValidation({
          loading: false,
          checked: true,
          error: err.message || 'Error al validar el ticket.',
          data: null
        });
        clearGarantiaFields(true);
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [form.es_garantia, form.servicio_origen_codigo, form.codigo_ticket_origen, resetGarantiaState, clearGarantiaFields]);

  const isGarantiaValida = Boolean(
    form.es_garantia &&
    form.servicio_origen_id &&
    ticketValidation.checked &&
    !ticketValidation.loading &&
    !ticketValidation.error &&
    ticketValidation.data?.ok !== false &&
    ticketValidation.data?.valido !== false &&
    ticketValidation.data?.codigo_error !== 'NO_ENTREGADO' &&
    ticketValidation.data?.entregado === true
  );

  const isGarantiaLocked = Boolean(form.es_garantia && isGarantiaValida && form.servicio_origen_id);

  const categoriaOptions = useMemo(() => {
    if (categorias && categorias.length > 0) {
      return categorias.map((c) => {
        const label = c.nombre_categoria || c.nombre || `Categoría ${c.id}`;
        return {
          id: String(c.id),
          value: String(c.id),
          label,
          icon: getCategoryIcon(label)
        };
      });
    }
    return FALLBACK_CATEGORIAS;
  }, [categorias]);

  // Validacion por paso
  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (form.es_garantia) {
        const codigoTicket = (form.servicio_origen_codigo || '').trim();
        if (!codigoTicket) {
          errs.servicio_origen_codigo = 'El código del ticket original es obligatorio';
        } else if (!isGarantiaValida) {
          errs.servicio_origen_codigo = ticketValidation.error || 'El ticket original debe corresponder a un equipo entregado y con garantía válida';
        }
      }

      if (!form.cliente) {
        const nombre = (form.nombre_cliente_libre || '').trim();
        if (!nombre) {
          errs.nombre_cliente_libre = 'El nombre del cliente es obligatorio';
        } else if (nombre.length < 3) {
          errs.nombre_cliente_libre = 'El nombre debe tener al menos 3 caracteres';
        } else if (nombre.length > 100) {
          errs.nombre_cliente_libre = 'El nombre no puede exceder los 100 caracteres';
        }

        const telDigits = (form.telefono_cliente_libre || '').replace(/\D/g, '');
        if (!form.telefono_cliente_libre || !form.telefono_cliente_libre.trim()) {
          errs.telefono_cliente_libre = 'El teléfono de contacto es obligatorio';
        } else if (telDigits.length < 10) {
          errs.telefono_cliente_libre = 'Ingresa un teléfono válido (mínimo 10 dígitos)';
        }

        if (form.cedula_cliente_libre && form.cedula_cliente_libre.trim()) {
          const cedDigits = form.cedula_cliente_libre.replace(/\D/g, '');
          if (cedDigits.length < 9) {
            errs.cedula_cliente_libre = 'Cédula o RNC incompleto (mínimo 9 dígitos)';
          }
        }

        if (form.correo_cliente_libre && form.correo_cliente_libre.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(form.correo_cliente_libre.trim())) {
            errs.correo_cliente_libre = 'Ingresa un correo electrónico válido';
          }
        }
      }

      if (!form.categoria_id) {
        errs.categoria_id = 'Selecciona una categoría de dispositivo';
      }

      const marca = (form.marca_equipo || '').trim();
      if (!marca) {
        errs.marca_equipo = 'La marca del dispositivo es requerida';
      } else if (marca.length < 2) {
        errs.marca_equipo = 'La marca debe tener al menos 2 caracteres';
      } else if (marca.length > 50) {
        errs.marca_equipo = 'La marca no puede exceder los 50 caracteres';
      }

      const modelo = (form.modelo_equipo || '').trim();
      if (!modelo) {
        errs.modelo_equipo = 'El modelo del dispositivo es requerido';
      } else if (modelo.length < 2) {
        errs.modelo_equipo = 'El modelo debe tener al menos 2 caracteres';
      } else if (modelo.length > 50) {
        errs.modelo_equipo = 'El modelo no puede exceder los 50 caracteres';
      }

      if (form.num_serie_imei && form.num_serie_imei.trim().length > 50) {
        errs.num_serie_imei = 'El IMEI / número de serie no puede exceder los 50 caracteres';
      }
    } else if (step === 2) {
      if (!form.falla_reportada.trim()) {
        errs.falla_reportada = 'Describe la falla reportada por el cliente';
      }
    } else if (step === 4) {
      if (form.costo_previsto === '' || form.costo_previsto === null || form.costo_previsto === undefined) {
        errs.costo_previsto = 'El costo estimado es requerido';
      } else if (isNaN(Number(form.costo_previsto)) || Number(form.costo_previsto) < 0) {
        errs.costo_previsto = 'Ingresa un monto válido';
      }
    }
    return errs;
  };

  const handleNext = () => {
    if (currentStep === 1 && form.es_garantia && !isGarantiaValida) {
      setErrors(prev => ({
        ...prev,
        servicio_origen_codigo: ticketValidation.error || 'Debes ingresar un ticket previo válido y entregado para aplicar garantía.'
      }));
      return;
    }
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrors({});
    setCurrentStep(prev => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const errsStep1 = validateStep(1);
    const errsStep2 = validateStep(2);
    const errsStep4 = validateStep(4);
    const allErrors = { ...errsStep1, ...errsStep2, ...errsStep4 };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if (errsStep1.servicio_origen_codigo || errsStep1.categoria_id || errsStep1.marca_equipo || errsStep1.modelo_equipo || errsStep1.nombre_cliente_libre) {
        setCurrentStep(1);
      } else if (errsStep2.falla_reportada) {
        setCurrentStep(2);
      } else if (errsStep4.costo_previsto) {
        setCurrentStep(4);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        sucursal_id: branchData?.id || user?.sucursal_id,
        categoria_id: Number(form.categoria_id),
        prioridad: form.prioridad,
        cliente_id: form.cliente?.id || null,
        nombre_cliente: form.cliente ? null : form.nombre_cliente_libre.trim() || null,
        telefono_cliente: form.cliente ? null : form.telefono_cliente_libre.trim() || null,
        cedula_cliente: form.cliente ? null : form.cedula_cliente_libre.trim() || null,
        correo_cliente: form.cliente ? null : form.correo_cliente_libre?.trim() || null,
        marca_equipo: form.marca_equipo.trim(),
        modelo_equipo: form.modelo_equipo.trim(),
        num_serie_imei: form.num_serie_imei.trim() || null,
        falla_reportada: form.falla_reportada.trim(),
        observaciones_recepcion: form.observaciones_recepcion.trim() || null,
        datos_acceso_equipo: form.datos_acceso_equipo,
        checklist_entrada: form.checklist_entrada,
        fotos_recepcion: form.fotos_recepcion.filter(Boolean),
        costo_previsto: parseFloat(form.costo_previsto) || 0,
        monto_anticipo: parseFloat(form.monto_anticipo) || 0,
        monto_descuento: parseFloat(form.monto_descuento) || 0,
        fecha_entrega_estimada: form.fecha_entrega_estimada || null,
        tiempo_garantia: parseInt(form.tiempo_garantia, 10) || 0,
        condiciones_garantia: form.condiciones_garantia.trim() || null,
        es_garantia: form.es_garantia,
        servicio_origen_id: form.es_garantia ? (Number(form.servicio_origen_id) || null) : null,
        tecnicos_ids: form.tecnicos_ids || []
      };

      const res = await createServicio(payload);
      if (res.ok) {
        const nombreClientePrint = form.cliente
          ? [form.cliente.nombre, form.cliente.apellido].filter(Boolean).join(' ')
          : form.nombre_cliente_libre;

        const ordenFinal = {
          ...payload,
          ...res.data,
          cliente_nombre: nombreClientePrint,
          nombre_cliente: nombreClientePrint
        };

        sileo.success({
          title: 'Orden registrada',
          description: `Ticket ${res.data.codigo_ticket} creado exitosamente.`
        });

        setOrdenCreada(ordenFinal);
        setShowPostModal(true);
      } else {
        sileo.error({ title: 'Error', description: res.message || 'No se pudo crear la orden.' });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error de conexión con el servidor.';
      sileo.error({ title: 'Error al procesar', description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostModalClose = () => {
    setShowPostModal(false);
    navigate('/tickets');
  };

  const clienteNombreDisplay = form.cliente
    ? [form.cliente.nombre, form.cliente.apellido].filter(Boolean).join(' ')
    : form.nombre_cliente_libre || 'Sin especificar';

  const categoriaNombreDisplay = categorias.find(c => c.id === Number(form.categoria_id))?.nombre || 'Sin categoría';

  const fechaHoyFormateada = useMemo(() => {
    const raw = new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return raw.replace(/\sde\s(\d{4})$/, ' del $1');
  }, []);

  if (isTecnico) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">

        {/* ── Cabecera Principal de Navegación ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-2xs"
              title="Volver al listado de órdenes"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
                Apertura de Orden de Servicio
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-inter mt-0.5">
                {branchData?.nombre_sucursal || user?.sucursal_nombre || 'Sucursal Principal'} &bull; {fechaHoyFormateada}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stepper Horizontal sin tarjeta contenedora ── */}
        <div className="py-2 px-1">
          <StepperHeader
            currentStep={currentStep}
            onStepClick={(step) => {
              if (step < currentStep) {
                setErrors({});
                setCurrentStep(step);
              }
            }}
          />
        </div>

        {/* ── Contenedor del Paso Activo ── */}
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden">

          {/* ═══════════════════════════════════════════════════
              PASO 1: CLIENTE Y EQUIPO
          ═══════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="p-5 sm:p-7 animate-fade-in space-y-6">
              {/* Bloque Superior: Reingreso por Garantía de Servicio Previo (Cuadrícula 2 Columnas) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs mb-6">
                {/* Columna Izquierda: Identificación y Switch */}
                <div>
                  <SectionHeader
                    icon={ShieldAlert}
                    title="REINGRESO POR GARANTÍA DE SERVICIO PREVIO"
                    subtitle="Activa si el equipo regresa al taller debido a una orden anterior para autocompletar cliente y dispositivo."
                  />

                  <label
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggleGarantia();
                    }}
                    className="inline-flex items-center gap-3 cursor-pointer select-none mt-4"
                  >
                    <div
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                        form.es_garantia ? 'bg-red-600' : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                          form.es_garantia ? 'translate-x-5' : ''
                        }`}
                      />
                    </div>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 font-inter">
                      Es reingreso por garantía de servicio anterior
                    </span>
                  </label>
                </div>

                {/* Columna Derecha: Búsqueda y Feedback */}
                <div>
                  {form.es_garantia ? (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <label className={`${labelClass} mb-0`}>
                          CÓDIGO DEL TICKET ORIGINAL <span className="text-red-500 font-bold">*</span>
                        </label>
                        {ticketValidation.loading && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
                            <Loader2 className="w-3 h-3 animate-spin text-red-600" /> Verificando...
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={form.servicio_origen_codigo}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().trim();
                            set('servicio_origen_codigo', val);
                            set('codigo_ticket_origen', val);
                            if (!val) {
                              resetGarantiaState(true);
                            }
                          }}
                          placeholder="Ej: ABC-1234"
                          className={`${inputClass} font-mono tracking-widest uppercase pr-10 ${
                            errors.servicio_origen_codigo || (ticketValidation.checked && (ticketValidation.error || !isGarantiaValida))
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                              : isGarantiaValida
                              ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20'
                              : ''
                          }`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                          {ticketValidation.loading ? (
                            <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
                          ) : isGarantiaValida ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : ticketValidation.checked && (ticketValidation.error || ticketValidation.data?.codigo_error === 'NO_ENTREGADO' || (ticketValidation.data && !ticketValidation.data.entregado)) ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : null}
                        </div>
                      </div>

                      {/* Bloqueante: Equipo aún NO entregado */}
                      {ticketValidation.checked && (ticketValidation.data?.codigo_error === 'NO_ENTREGADO' || (ticketValidation.data && !ticketValidation.data.entregado)) && (
                        <div className="bg-red-50/90 dark:bg-red-950/40 border-2 border-red-500/80 dark:border-red-600/80 rounded-xl p-3.5 space-y-2 animate-fade-in shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400">
                              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                              Equipo aún no entregado (Garantía no procedente)
                            </span>
                            {(ticketValidation.data?.servicio?.codigo_ticket || form.servicio_origen_codigo) && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-semibold">
                                #{ticketValidation.data?.servicio?.codigo_ticket || form.servicio_origen_codigo}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed font-medium">
                            {ticketValidation.data?.message || 'El equipo correspondiente a este ticket aún no ha sido entregado al cliente. No procede aplicar garantía.'}
                          </p>
                          <div className="text-[11px] text-red-600/90 dark:text-red-400/90 flex items-center gap-1.5 pt-1.5 border-t border-red-200/60 dark:border-red-900/40">
                            <span>Para aplicar a garantía, la orden previa debe haber concluido su ciclo y registrarse como <strong>Entregado</strong>.</span>
                          </div>
                        </div>
                      )}

                      {/* Error genérico o no encontrado (cuando no es NO_ENTREGADO) */}
                      {ticketValidation.checked && ticketValidation.error && ticketValidation.data?.codigo_error !== 'NO_ENTREGADO' && (
                        <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium pt-0.5 animate-fade-in">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{ticketValidation.error}</span>
                        </div>
                      )}

                      {/* Error de validación de campo cuando no ha chequeado aún */}
                      {errors.servicio_origen_codigo && !ticketValidation.checked && (
                        <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium pt-0.5 animate-fade-in">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{errors.servicio_origen_codigo}</span>
                        </div>
                      )}

                      {/* Procedente y vigente */}
                      {isGarantiaValida && ticketValidation.data?.vigente && (
                        <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1.5 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              Garantía Vigente ({ticketValidation.data.diasRestantes} {ticketValidation.data.diasRestantes === 1 ? 'día restante' : 'días restantes'})
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-medium">
                              #{ticketValidation.data.servicio?.codigo_ticket}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-900/90 dark:text-emerald-200/90">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <User className="w-3 h-3 shrink-0 opacity-70" />
                              <span className="truncate">Cliente: <strong className="font-semibold">{ticketValidation.data.servicio?.cliente}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Smartphone className="w-3 h-3 shrink-0 opacity-70" />
                              <span className="truncate">Equipo: <strong className="font-semibold">{[ticketValidation.data.servicio?.marca_equipo, ticketValidation.data.servicio?.modelo_equipo].filter(Boolean).join(' ')}</strong></span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Procedente pero fuera de tiempo / vencida */}
                      {isGarantiaValida && ticketValidation.data && !ticketValidation.data.vigente && (
                        <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3.5 space-y-1.5 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-400">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              Garantía Vencida
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                              #{ticketValidation.data.servicio?.codigo_ticket}
                            </span>
                          </div>
                          <p className="text-xs text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                            La garantía de este servicio venció el {ticketValidation.data.fechaVencimiento ? new Date(ticketValidation.data.fechaVencimiento).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'recientemente'}.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-amber-100 dark:border-amber-900/30 text-xs text-amber-700/80 dark:text-amber-300/70">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <User className="w-3.5 h-3.5 shrink-0 opacity-70" />
                              <span className="truncate">Cliente: <strong className="font-medium text-amber-900 dark:text-amber-200">{ticketValidation.data.servicio?.cliente}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Smartphone className="w-3.5 h-3.5 shrink-0 opacity-70" />
                              <span className="truncate">Equipo: <strong className="font-medium text-amber-900 dark:text-amber-200">{[ticketValidation.data.servicio?.marca_equipo, ticketValidation.data.servicio?.modelo_equipo].filter(Boolean).join(' ')}</strong></span>
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter">
                        Indica el código del ticket previo para vincular el historial técnico y autocompletar los datos del cliente y dispositivo.
                      </p>
                    </div>
                  ) : (
                    <div className="hidden lg:flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center select-none min-h-[110px]">
                      <ShieldAlert className="w-5 h-5 text-neutral-300 dark:text-neutral-600 mb-1" />
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 font-inter">
                        Activa el interruptor para buscar una orden anterior y autocompletar
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 2 Columnas: Cliente y Equipo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Bloque Cliente */}
                <div className="p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <SectionHeader
                      icon={User}
                      title="Identificación del Cliente"
                      subtitle="Selecciona un cliente de la cartera o ingresa los datos directamente para recepción rápida"
                    />
                    {isGarantiaLocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200/60 dark:border-red-900/30 shrink-0">
                        Bloqueado por garantía
                      </span>
                    )}
                  </div>

                  <ClientQuickSelect
                    value={form.cliente}
                    onChange={(c) => set('cliente', c)}
                    disabled={isGarantiaLocked}
                  />

                  {!form.cliente && (
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className={labelClass}>
                          Nombre del Cliente <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={100}
                          value={form.nombre_cliente_libre}
                          onChange={(e) => set('nombre_cliente_libre', e.target.value)}
                          disabled={isGarantiaLocked}
                          placeholder="Nombre completo del cliente..."
                          className={`${inputClass} ${isGarantiaLocked ? 'bg-neutral-100 dark:bg-neutral-800/50 cursor-not-allowed opacity-80' : ''} ${errors.nombre_cliente_libre ? 'border-red-500 dark:border-red-500' : ''}`}
                        />
                        {errors.nombre_cliente_libre && (
                          <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.nombre_cliente_libre}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>
                            Teléfono <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            maxLength={15}
                            value={form.telefono_cliente_libre}
                            disabled={isGarantiaLocked}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val.length <= 15) set('telefono_cliente_libre', val);
                            }}
                            placeholder="8090000000 (solo números)"
                            className={`${inputClass} ${isGarantiaLocked ? 'bg-neutral-100 dark:bg-neutral-800/50 cursor-not-allowed opacity-80' : ''} ${errors.telefono_cliente_libre ? 'border-red-500 dark:border-red-500' : ''}`}
                          />
                          {errors.telefono_cliente_libre && (
                            <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.telefono_cliente_libre}</p>
                          )}
                        </div>

                        <div>
                          <label className={labelClass}>Cédula o RNC</label>
                          <input
                            type="text"
                            maxLength={13}
                            value={form.cedula_cliente_libre}
                            disabled={isGarantiaLocked}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9\-]/g, '');
                              if (val.length <= 13) set('cedula_cliente_libre', val);
                            }}
                            placeholder="000-0000000-0"
                            className={`${inputClass} ${isGarantiaLocked ? 'bg-neutral-100 dark:bg-neutral-800/50 cursor-not-allowed opacity-80' : ''} ${errors.cedula_cliente_libre ? 'border-red-500 dark:border-red-500' : ''}`}
                          />
                          {errors.cedula_cliente_libre && (
                            <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.cedula_cliente_libre}</p>
                          )}
                        </div>

                        <div>
                          <label className={labelClass}>Correo Electrónico</label>
                          <input
                            type="email"
                            maxLength={100}
                            value={form.correo_cliente_libre}
                            disabled={isGarantiaLocked}
                            onChange={(e) => set('correo_cliente_libre', e.target.value.trimStart())}
                            placeholder="cliente@ejemplo.com"
                            className={`${inputClass} ${isGarantiaLocked ? 'bg-neutral-100 dark:bg-neutral-800/50 cursor-not-allowed opacity-80' : ''} ${errors.correo_cliente_libre ? 'border-red-500 dark:border-red-500' : ''}`}
                          />
                          {errors.correo_cliente_libre && (
                            <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.correo_cliente_libre}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloque Equipo */}
                <div className="p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <SectionHeader
                      icon={Smartphone}
                      title="Datos del Dispositivo"
                      subtitle="Categoría técnica y características del equipo entregado"
                    />
                    {isGarantiaLocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200/60 dark:border-red-900/30 shrink-0">
                        Bloqueado por garantía
                      </span>
                    )}
                  </div>

                  {/* Categoría y Prioridad en la misma fila */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <Select
                        label="Categoría de Dispositivo"
                        isRequired={true}
                        disabled={isGarantiaLocked}
                        items={categoriaOptions}
                        value={form.categoria_id ? String(form.categoria_id) : ''}
                        onChange={(val) => set('categoria_id', val)}
                        placeholder="Seleccionar categoría..."
                        error={errors.categoria_id}
                      />
                    </div>
                    <div>
                      <Select
                        label="Nivel de Prioridad"
                        items={PRIORIDAD_OPTIONS}
                        value={form.prioridad}
                        onChange={(val) => set('prioridad', val)}
                        placeholder="Seleccionar prioridad..."
                      />
                    </div>
                  </div>

                  {/* Marca y Modelo uno al lado del otro */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={labelClass}>
                        Marca <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={form.marca_equipo}
                        disabled={isGarantiaLocked}
                        onChange={(e) => set('marca_equipo', e.target.value)}
                        placeholder="Apple, Samsung, Xiaomi..."
                        className={`${inputClass} ${isGarantiaLocked ? 'bg-neutral-100 dark:bg-neutral-800/50 cursor-not-allowed opacity-80' : ''} ${errors.marca_equipo ? 'border-red-500 dark:border-red-500' : ''}`}
                      />
                      {errors.marca_equipo && (
                        <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.marca_equipo}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>
                        Modelo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={form.modelo_equipo}
                        disabled={isGarantiaLocked}
                        onChange={(e) => set('modelo_equipo', e.target.value)}
                        placeholder="iPhone 14 Pro, Galaxy S23..."
                        className={`${inputClass} ${isGarantiaLocked ? 'bg-neutral-100 dark:bg-neutral-800/50 cursor-not-allowed opacity-80' : ''} ${errors.modelo_equipo ? 'border-red-500 dark:border-red-500' : ''}`}
                      />
                      {errors.modelo_equipo && (
                        <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.modelo_equipo}</p>
                      )}
                    </div>
                  </div>

                  {/* IMEI / Número de Serie abajo */}
                  <div>
                    <label className={labelClass}>IMEI / Número de Serie</label>
                    <input
                      type="text"
                      maxLength={50}
                      value={form.num_serie_imei}
                      disabled={isGarantiaLocked}
                      onChange={(e) => set('num_serie_imei', e.target.value)}
                      placeholder="352099001761481"
                      className={`${inputClass} ${isGarantiaLocked ? 'bg-neutral-100 dark:bg-neutral-800/50 cursor-not-allowed opacity-80' : ''} ${errors.num_serie_imei ? 'border-red-500 dark:border-red-500' : ''}`}
                    />
                    {errors.num_serie_imei && (
                      <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.num_serie_imei}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              PASO 2: DIAGNÓSTICO Y ESTADO
          ═══════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="p-5 sm:p-7 space-y-6 animate-fade-in">
              {/* Falla y Observaciones */}
              <div className="p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-neutral-800 space-y-4">
                <SectionHeader
                  icon={AlertCircle}
                  title="Falla Reportada y Estado Físico"
                  subtitle="Detalla el problema manifestado por el cliente y las condiciones visibles del equipo"
                />

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      Falla Reportada <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.falla_reportada}
                      onChange={(e) => set('falla_reportada', e.target.value)}
                      rows={3}
                      placeholder="Ejemplo: No carga con cable tipo C, pantalla con parpadeos verdes tras caída..."
                      className={`${inputClass} resize-none ${errors.falla_reportada ? 'border-red-500 dark:border-red-500' : ''}`}
                    />
                    {errors.falla_reportada && (
                      <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.falla_reportada}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Observaciones Estéticas y Detalles Visibles</label>
                    <textarea
                      value={form.observaciones_recepcion}
                      onChange={(e) => set('observaciones_recepcion', e.target.value)}
                      rows={2}
                      placeholder="Ejemplo: Vidrio trasero quebrado en esquina, bisel con rasguños leves, sin bandeja SIM..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
              </div>

              {/* Grid: Checklist y Fotografías */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DeviceChecklistPicker
                  value={form.checklist_entrada}
                  onChange={(v) => set('checklist_entrada', v)}
                />

                <DevicePhotoUploader
                  value={form.fotos_recepcion}
                  onChange={(urls) => set('fotos_recepcion', urls)}
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              PASO 3: SEGURIDAD Y ACCESO
          ═══════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="p-5 sm:p-7 space-y-6 animate-fade-in">
              <div className="w-full max-w-3xl mx-auto">
                <DeviceSecurityPicker
                  value={form.datos_acceso_equipo}
                  onChange={(v) => set('datos_acceso_equipo', v)}
                />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              PASO 4: PRESUPUESTO Y CIERRE
          ═══════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="p-5 sm:p-7 space-y-6 animate-fade-in">
              {/* 1. Resumen Superior de la Orden */}
              <div className="bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200 font-semibold text-xs uppercase tracking-wider font-outfit">
                  <CheckCircle2 size={16} className="text-red-600 dark:text-red-500 shrink-0" />
                  RESUMEN PREVIO DE LA ORDEN
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-800">
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium block font-inter">Cliente</span>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate mt-0.5" title={clienteNombreDisplay}>
                      {clienteNombreDisplay}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium block font-inter">Equipo</span>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate mt-0.5" title={`${form.marca_equipo} ${form.modelo_equipo}`}>
                      {form.marca_equipo} {form.modelo_equipo}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium block font-inter">Categoría</span>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate mt-0.5" title={categoriaNombreDisplay}>
                      {categoriaNombreDisplay}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium block font-inter">Prioridad</span>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate mt-0.5 capitalize">
                      {form.prioridad}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium block font-inter">Asignación</span>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate mt-0.5">
                      {form.tecnicos_ids.length > 0 ? `${form.tecnicos_ids.length} especialista(s)` : 'Bolsa general'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Aspectos Económicos y Fechas de Entrega */}
              <div className="p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-neutral-800 space-y-4">
                <SectionHeader
                  icon={DollarSign}
                  title="Aspectos Económicos y Fechas de Entrega"
                  subtitle="Define los montos acordados y la proyección de entrega al cliente"
                />

                {/* Fila 1 (Montos) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>
                      Costo Estimado (RD$) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.costo_previsto}
                      onChange={(e) => set('costo_previsto', e.target.value)}
                      placeholder="0.00"
                      className={`${inputClass} ${errors.costo_previsto ? 'border-red-500 dark:border-red-500' : ''}`}
                    />
                    {errors.costo_previsto && (
                      <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.costo_previsto}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Anticipo Recibido (RD$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monto_anticipo}
                      onChange={(e) => set('monto_anticipo', e.target.value)}
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Descuento Aplicado (RD$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monto_descuento}
                      onChange={(e) => set('monto_descuento', e.target.value)}
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Fila 2 (Fechas y Garantía) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Fecha Estimada de Entrega</label>
                    <DatePicker
                      value={form.fecha_entrega_estimada}
                      onChange={(dateStr) => set('fecha_entrega_estimada', dateStr)}
                      placeholder="Seleccionar fecha..."
                    />
                  </div>
                  <div>
                    <Select
                      label="Período de Garantía Ofrecido"
                      items={GARANTIA_OPTIONS}
                      value={String(form.tiempo_garantia ?? '30')}
                      onChange={(val) => set('tiempo_garantia', parseInt(val, 10) || 0)}
                      placeholder="Seleccionar período de garantía..."
                    />
                  </div>
                </div>

                {/* Fila 3: Condiciones Especiales de Garantía */}
                <div>
                  <label className={labelClass}>Condiciones Especiales de Garantía</label>
                  <textarea
                    value={form.condiciones_garantia}
                    onChange={(e) => set('condiciones_garantia', e.target.value)}
                    rows={2}
                    placeholder="Garantía aplica únicamente sobre el módulo de pantalla instalado. No cubre caídas o humedad..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              {/* 3. Bloque Inferior: Técnicos Asignados */}
              <div className="p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-neutral-800 space-y-4">
                <SectionHeader
                  icon={Wrench}
                  title="Técnicos Asignados (Opcional)"
                  subtitle="Asigna directamente a especialistas responsables de esta orden"
                />

                {tecnicosDisponibles.length === 0 ? (
                  <p className="text-xs text-neutral-400 font-inter py-2">No hay técnicos disponibles en este momento.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {tecnicosDisponibles.map((tec) => {
                      const isSelected = form.tecnicos_ids.includes(tec.id);
                      const fullName = tec.nombre_completo || `${tec.nombre} ${tec.apellido}`;
                      return (
                        <div
                          key={tec.id}
                          onClick={() => toggleTecnico(tec.id)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'border-red-500 dark:border-red-500 bg-red-50/60 dark:bg-red-950/30 shadow-2xs ring-1 ring-red-500/20'
                              : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected
                                ? 'bg-red-600 text-white'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                            }`}
                          >
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate font-outfit">
                              {fullName}
                            </p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-inter truncate">
                              {(tec.rol_nombre || tec.nombre_rol || 'Técnico').replace('_', ' ')}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                              isSelected
                                ? 'bg-red-600 border-red-600 text-white'
                                : 'border-neutral-300 dark:border-neutral-700'
                            }`}
                          >
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {form.tecnicos_ids.length === 0 && (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter italic pt-2">
                    * Si no seleccionas técnicos, la orden quedará en la bolsa general de trabajo de la sucursal.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Barra de Navegación Inferior (Footer del Formulario) ── */}
          <div className="px-5 sm:px-7 py-4 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/90 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                icon={ArrowLeft}
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Anterior
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => navigate('/tickets')}
              >
                Cancelar
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={ArrowRight}
                iconPosition="right"
                onClick={handleNext}
                disabled={Boolean(currentStep === 1 && form.es_garantia && !isGarantiaValida)}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={ClipboardList}
                onClick={handleSubmit}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="min-w-[200px]"
              >
                {isSubmitting ? 'Registrando...' : 'Crear Orden de Servicio'}
              </Button>
            )}
          </div>
        </div>

        {/* ── Modal de Impresión Post-Creación ── */}
        <PostCreacionModal
          isOpen={showPostModal}
          onClose={handlePostModalClose}
          orden={ordenCreada}
          companyData={companyData}
          branchData={branchData}
        />
      </div>
    </DashboardLayout>
  );
};

export default NuevaOrdenPage;
