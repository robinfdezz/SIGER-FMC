import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getServicioByTicket } from '../services/servicios.service';
import { getCompanyPublicProfile } from '../services/configuracion.service';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import TurnstileWidget from '../components/common/TurnstileWidget';
import logoFmcBlack from '../assets/logo-FMC Black.png';
import logoFmcWhite from '../assets/logo-FMC White.png';
import {
  Search,
  Check,
  Clock,
  Wrench,
  PackageCheck,
  Package,
  CheckCircle2,
  X,
  AlertCircle,
  Smartphone,
  Calendar,
  ShieldCheck,
  ArrowRight,
  ClipboardCheck,
  Building2,
  User,
  AlertTriangle,
  Minus,
  ClipboardPaste
} from 'lucide-react';
import { MorphIcon } from 'morphicons/react';
import { Sun, Moon } from 'lucide';

import DeviceChecklistPicker from '../components/servicios/DeviceChecklistPicker';
import ServiceTimeline from '../components/servicios/ServiceTimeline';

// Progresión cromática cálida institucional (Mamey / Naranja -> Rojo Corporativo)
const WARM_CHROMATIC_PALETTE = {
  RECIBIDO: {
    hex: '#F59E0B',
    tailText: 'text-amber-500 dark:text-amber-400',
    tailBorder: 'border-amber-500'
  },
  EN_DIAGNOSTICO: {
    hex: '#F97316',
    tailText: 'text-orange-500 dark:text-orange-400',
    tailBorder: 'border-orange-500'
  },
  ESPERA_REPUESTO: {
    hex: '#EA580C',
    tailText: 'text-orange-600 dark:text-orange-400',
    tailBorder: 'border-orange-600'
  },
  EN_REPARACION: {
    hex: '#EF4444',
    tailText: 'text-red-500 dark:text-red-400',
    tailBorder: 'border-red-500'
  },
  LISTO_ENTREGA: {
    hex: '#DC2626',
    tailText: 'text-red-600 dark:text-red-400',
    tailBorder: 'border-red-600'
  },
  ENTREGADO: {
    hex: '#B91C1C',
    tailText: 'text-red-700 dark:text-red-400',
    tailBorder: 'border-red-700'
  },
  CANCELADO_DEVUELTO: {
    hex: '#DC2626',
    tailText: 'text-red-600 dark:text-red-400',
    tailBorder: 'border-red-600'
  }
};

const formatFechaLegible = (isoString) => {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const EstadoOrdenPage = () => {
  const { codigo } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const isTurnstileEnabled = import.meta.env.VITE_ENABLE_TURNSTILE === 'true';
  const codeFromUrl = (codigo || searchParams.get('codigo') || '').trim().toUpperCase();

  const [inputCode, setInputCode] = useState(codeFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orden, setOrden] = useState(null);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);

  // Cargar logotipo oficial de Cloudinary en la vista pública
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await getCompanyPublicProfile();
        if (isMounted && res?.data?.logo_url) {
          setCompanyLogo(res.data.logo_url);
        }
      } catch {
        // Fallback a logos locales de assets
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const fetchTicket = useCallback(async (codeToFetch, token = null) => {
    if (!codeToFetch) return;
    setLoading(true);
    setError(null);

    try {
      const tokenToUse = token || turnstileToken;
      const res = await getServicioByTicket(codeToFetch, tokenToUse);
      if (res && res.ok && res.data) {
        setOrden(res.data);
        if (res.data.logo_url) setCompanyLogo(res.data.logo_url);
      } else {
        setOrden(null);
        setError(res?.message || 'No se encontró ninguna orden con ese código de ticket.');
      }
    } catch (err) {
      console.error('Error al consultar ticket:', err);
      setOrden(null);
      setError(
        err.response?.data?.message ||
        'No se encontró ninguna orden de servicio con el código especificado. Verifique el código ingresado.'
      );
    } finally {
      setLoading(false);
    }
  }, [turnstileToken]);

  // Si la vista carga automáticamente el ticket desde la URL:
  // - Si VITE_ENABLE_TURNSTILE es false, consulta de forma directa e inmediata.
  // - Si está activo, consulta una vez obtenido el token.
  useEffect(() => {
    if (codeFromUrl) {
      setInputCode(codeFromUrl);
      if (!isTurnstileEnabled) {
        fetchTicket(codeFromUrl);
      } else if (turnstileToken) {
        fetchTicket(codeFromUrl, turnstileToken);
      }
    } else {
      setOrden(null);
      setError(null);
    }
  }, [codeFromUrl, isTurnstileEnabled, turnstileToken, fetchTicket]);

  // Callback cuando Turnstile se resuelve exitosamente
  const handleTurnstileVerify = (token) => {
    setTurnstileToken(token);
    if (codeFromUrl && !orden && !loading) {
      fetchTicket(codeFromUrl, token);
    }
  };

  // Manejo de búsqueda
  const handleSearch = (e) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!clean) return;

    if (isTurnstileEnabled && !turnstileToken) {
      setError('Por favor complete la verificación de seguridad antes de consultar.');
      return;
    }

    if (codeFromUrl === clean) {
      fetchTicket(clean, turnstileToken);
    } else {
      navigate(`/estado/${encodeURIComponent(clean)}`);
    }
  };

  // Sanitización estricta: solo alfanuméricos y guiones [A-Za-z0-9-], forzando mayúsculas
  const handleInputChange = (e) => {
    const raw = e.target.value || '';
    const clean = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setInputCode(clean);
  };

  const handleInputPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') || '';
    const clean = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setInputCode(clean);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        const clean = text.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        setInputCode(clean);
      }
    } catch (err) {
      console.warn('No se pudo acceder al portapapeles:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // LÍNEA DE TIEMPO DINÁMICA DE ESTADOS
  // ─────────────────────────────────────────────────────────────
  const buildTimelineSteps = (ord) => {
    if (!ord) return { steps: [], activeIndex: 0 };

    const estadoNorm = String(ord.codigo_estado || ord.estado || '').toUpperCase();
    const estadoNombre = String(ord.estado || '').toLowerCase();

    const isCancelado =
      estadoNorm === 'CANCELADO_DEVUELTO' ||
      estadoNombre.includes('cancel') ||
      estadoNombre.includes('devuelt') ||
      estadoNombre.includes('no reparado');

    const hasEsperaRepuesto =
      estadoNorm === 'ESPERA_REPUESTO' ||
      (ord.historial_estados &&
        ord.historial_estados.some((h) => String(h.codigo_estado).toUpperCase() === 'ESPERA_REPUESTO'));

    // Pasos base
    const steps = [
      {
        key: 'RECIBIDO',
        title: 'Recibido',
        icon: Clock,
        desc: 'Ingreso en taller',
        color: WARM_CHROMATIC_PALETTE.RECIBIDO
      },
      {
        key: 'EN_DIAGNOSTICO',
        title: 'En Diagnóstico',
        icon: Search,
        desc: 'Evaluación técnica inicial',
        color: WARM_CHROMATIC_PALETTE.EN_DIAGNOSTICO
      }
    ];

    if (hasEsperaRepuesto) {
      steps.push({
        key: 'ESPERA_REPUESTO',
        title: 'Espera de Repuesto',
        icon: Package,
        desc: 'Pieza en tránsito / pedido',
        color: WARM_CHROMATIC_PALETTE.ESPERA_REPUESTO
      });
    }

    steps.push(
      {
        key: 'EN_REPARACION',
        title: 'En Reparación',
        icon: Wrench,
        desc: 'Intervención y pruebas',
        color: WARM_CHROMATIC_PALETTE.EN_REPARACION
      },
      {
        key: 'LISTO_ENTREGA',
        title: 'Listo para Entrega',
        icon: PackageCheck,
        desc: 'Listo para retiro',
        color: WARM_CHROMATIC_PALETTE.LISTO_ENTREGA
      }
    );

    // Nodo final atómico: Cancelado O Entregado (nunca ambos a la vez)
    if (isCancelado) {
      steps.push({
        key: 'CANCELADO_DEVUELTO',
        title: 'Cancelado',
        icon: X,
        desc: 'Servicio cancelado',
        color: WARM_CHROMATIC_PALETTE.CANCELADO_DEVUELTO,
        isCancelledNode: true
      });
    } else {
      steps.push({
        key: 'ENTREGADO',
        title: 'Entregado',
        icon: CheckCircle2,
        desc: 'Entregado a conformidad',
        color: WARM_CHROMATIC_PALETTE.ENTREGADO
      });
    }

    // Calcular índice activo
    let activeIndex = 0;
    if (isCancelado) {
      activeIndex = steps.length - 1;
    } else if (estadoNorm === 'ENTREGADO' || estadoNombre.includes('entrega') || estadoNombre.includes('finaliz')) {
      activeIndex = steps.length - 1;
    } else if (estadoNorm === 'LISTO_ENTREGA' || estadoNombre.includes('listo')) {
      const listoIdx = steps.findIndex((s) => s.key === 'LISTO_ENTREGA');
      activeIndex = listoIdx !== -1 ? listoIdx : steps.length - 2;
    } else if (
      estadoNorm === 'EN_REPARACION' ||
      estadoNorm === 'CONTROL_CALIDAD' ||
      estadoNombre.includes('repar') ||
      estadoNombre.includes('proceso') ||
      estadoNombre.includes('calidad')
    ) {
      const repIdx = steps.findIndex((s) => s.key === 'EN_REPARACION');
      activeIndex = repIdx !== -1 ? repIdx : 2;
    } else if (estadoNorm === 'ESPERA_REPUESTO' || estadoNombre.includes('espera')) {
      const espIdx = steps.findIndex((s) => s.key === 'ESPERA_REPUESTO');
      activeIndex = espIdx !== -1 ? espIdx : 1;
    } else if (estadoNorm === 'EN_DIAGNOSTICO' || estadoNombre.includes('diagn') || estadoNombre.includes('revis')) {
      activeIndex = 1;
    } else {
      activeIndex = 0;
    }

    return { steps, activeIndex, isCancelado };
  };

  const { steps: timelineSteps, activeIndex: currentStepIndex } = buildTimelineSteps(orden);

  // Determinar si la vista está vacía / en espera de búsqueda
  const isVistaInicial = !orden && !loading && !error;

  // Fecha estimada normalizada
  const fechaEstimadaRaw = orden?.fecha_estimada_entrega || orden?.fecha_entrega_estimada;
  const fechaEstimadaFormateada = formatFechaLegible(fechaEstimadaRaw);
  const fechaIngresoFormateada = formatFechaLegible(orden?.created_at);

  // Lista de técnicos asignados normalizada
  const tecnicosList = Array.isArray(orden?.tecnicos) && orden.tecnicos.length > 0
    ? orden.tecnicos
    : (orden?.tecnico_nombre && orden.tecnico_nombre !== 'Sin asignar'
        ? [{ id: 1, nombre_completo: orden.tecnico_nombre }]
        : []);

  // Fotos de ingreso / recepción
  const fotosArray = useMemo(() => {
    return (orden?.fotos || orden?.fotos_recepcion || []).filter(
      (f) => !f.incidencia_id && (f.tipo_evidencia === 'RECEPCION' || !f.tipo_evidencia || f.tipo_evidencia !== 'INCIDENCIA')
    );
  }, [orden]);

  // Fotos de entrega (si hubiere)
  const fotosEntrega = useMemo(() => {
    return (orden?.fotos || []).filter((f) => f.tipo_evidencia === 'ENTREGA');
  }, [orden]);

  // Historial de eventos públicos para ServiceTimeline
  const historialPublico = useMemo(() => {
    if (!orden) return [];
    const base = Array.isArray(orden.historial_estados) && orden.historial_estados.length > 0
      ? orden.historial_estados
      : [
          {
            id: 'inicio',
            estado_id: orden.estado_id,
            nombre_estado: orden.estado || 'Recibido en Taller',
            codigo_estado: orden.codigo_estado,
            orden_flujo: orden.orden_flujo || 1,
            nota_cambio: null,
            fecha_registro: orden.created_at
          }
        ];

    // Eventos de cambio de estado (con fotos de recepción/entrega asociadas)
    const estadosEvents = base.map((item, idx) => {
        const isReceptionEvent =
          Number(item.orden_flujo) === 1 ||
          String(item.codigo_estado || '').toUpperCase().includes('RECIB') ||
          item.id === 'inicio' ||
          idx === 0;

        const isEntregaEvent =
          Number(item.orden_flujo) === 7 ||
          String(item.codigo_estado || '').toUpperCase().includes('ENTREG');

        let itemFotos = Array.isArray(item.fotos) && item.fotos.length > 0 ? item.fotos : [];
        if (itemFotos.length === 0) {
          if (isReceptionEvent) {
            itemFotos = fotosArray;
          } else if (isEntregaEvent) {
            itemFotos = fotosEntrega;
          }
        }

        return {
          ...item,
          tipo_evento: 'ESTADO',
          fotos: itemFotos,
          _timelineKey: `pub-estado-${item.id || idx}`,
          _sortTime: new Date(item.fecha_registro || orden.created_at || 0).getTime()
        };
      });

    // Eventos de incidencias / hallazgos técnicos (filtrados por ServiceTimeline en modo público)
    const incidenciasEvents = (Array.isArray(orden.incidencias) ? orden.incidencias : []).map((item, idx) => ({
      ...item,
      tipo_evento: 'INCIDENCIA',
      _timelineKey: `pub-incidencia-${item.id || idx}`,
      _sortTime: new Date(item.fecha_registro || 0).getTime()
    }));

    return [...estadosEvents, ...incidenciasEvents].sort((a, b) => b._sortTime - a._sortTime);
  }, [orden, fotosArray, fotosEntrega]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#121214] text-neutral-900 dark:text-neutral-100 flex flex-col font-inter selection:bg-red-500 selection:text-white transition-colors duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER PÚBLICO CON LOGO Y TOGGLE DE TEMA
      ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md sticky top-0 z-20 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Logotipo Oficial"
                className={`h-8 sm:h-9 w-auto max-w-[130px] sm:max-w-[160px] object-contain transition-all duration-200 ${
                  isDark ? 'brightness-0 invert' : ''
                }`}
                onError={() => setCompanyLogo(null)}
              />
            ) : (
              <img
                src={isDark ? logoFmcWhite : logoFmcBlack}
                alt="FMC"
                className="h-7 sm:h-8 w-auto object-contain transition-all duration-200"
              />
            )}
          </div>

          {/* Toggle de Modo Oscuro / Claro (Idéntico a Sidebar y Dashboard) */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            className="w-10 h-10 flex items-center justify-center rounded-lg aspect-square text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
          >
            <MorphIcon
              icon={isDark ? Moon : Sun}
              size={20}
              className={isDark ? "text-red-500" : "text-zinc-600 dark:text-zinc-400"}
            />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          CONTENIDO PRINCIPAL
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        {/* Bloque de Bienvenida y Buscador: Centrado en pantalla vacía, o arriba al tener datos */}
        <section
          className={`w-full transition-all duration-500 ease-out ${
            isVistaInicial
              ? 'min-h-[75vh] flex flex-col justify-center items-center text-center py-12'
              : 'pt-6 sm:pt-8 pb-4 text-center max-w-2xl mx-auto'
          }`}
        >
          {/* TÍTULO DINÁMICO RESPONSIVO */}
          {orden ? (
            <div className="max-w-xl mx-auto space-y-1.5 mb-6 px-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-outfit text-neutral-900 dark:text-white tracking-tight">
                Consultando el ticket:
                <span className="block font-mono text-red-600 dark:text-red-500 select-all mt-1 sm:mt-1.5 text-xl sm:text-2xl md:text-3xl font-black break-all">
                  #{orden.codigo_ticket}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter leading-relaxed">
                Seguimiento en tiempo real y avances técnicos del dispositivo.
              </p>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-2 mb-6 px-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-outfit text-neutral-900 dark:text-white tracking-tight">
                Consulta el Estado de tu Equipo
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter leading-relaxed">
                Ingresa el código alfanumérico impreso en tu comprobante o sticker para ver los avances en tiempo real.
              </p>
            </div>
          )}

          {/* BUSCADOR ADAPTATIVO: Columna en móvil, fila en pantallas mayores */}
          <form
            onSubmit={handleSearch}
            className="w-full max-w-md mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="flex-1 w-full relative flex items-center">
              <Input
                id="ticket-search-input"
                value={inputCode}
                onChange={handleInputChange}
                onPaste={handleInputPaste}
                placeholder="Ej: FMC-SFM-6XQB-W33K"
                className="font-mono text-sm sm:text-base uppercase tracking-wider !py-2.5 !pl-4 !pr-11 w-full"
                autoComplete="off"
                autoFocus={isVistaInicial}
              />
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="absolute right-2.5 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer shrink-0 focus:outline-hidden"
                title="Pegar código desde el portapapeles"
                aria-label="Pegar código desde el portapapeles"
              >
                <ClipboardPaste size={17} />
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading || !inputCode.trim()}
              isLoading={loading}
              icon={ArrowRight}
              iconPosition="right"
              className="!h-[44px] sm:!h-[42px] px-6 text-sm font-semibold w-full sm:w-auto shrink-0 justify-center"
            >
              Consultar
            </Button>
          </form>

          {/* Widget Anti-bot Cloudflare Turnstile (Condicional por Feature Flag) */}
          <TurnstileWidget
            onVerify={handleTurnstileVerify}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
            className="my-3.5"
          />

          {/* Mensaje de Error Inline y Minimalista con separación adecuada */}
          {!loading && error && (
            <div className="mt-4 sm:mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 animate-fade-in font-inter text-center">
              <AlertCircle size={16} className="shrink-0" />
              <span>{typeof error === 'string' ? error : 'Ticket no encontrado. Verifica el código e intenta nuevamente.'}</span>
            </div>
          )}
        </section>

        {/* Estado de Carga */}
        {loading && (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 font-inter">
              Localizando orden de servicio en taller...
            </p>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            2. TRACKER VISUAL DESACOPLADO CON DESPLAZAMIENTO SUAVE EN MÓVIL
        ───────────────────────────────────────────────────────────── */}
        {!loading && orden && (
          <div className="space-y-6 pb-12 animate-fade-in">
            {/* Stepper horizontal liberado con scroll suave en pantallas estrechas */}
            <div className="w-full my-6 sm:my-8 overflow-x-auto no-scrollbar pb-3 pt-1 px-1 select-none">
              <div className="min-w-[540px] sm:min-w-0 w-full flex items-start justify-between relative">
                {timelineSteps.map((s, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const isPending = index > currentStepIndex;
                  const StepIcon = s.icon;
                  const colorStage = s.color;
                  const nextColorStage = timelineSteps[index + 1]?.color || colorStage;

                  return (
                    <React.Fragment key={s.key}>
                      {/* Nodo del Paso */}
                      <div
                        className="flex flex-col items-center text-center relative z-10 transition-all duration-200"
                        style={{ flex: 1 }}
                      >
                        {/* Indicador Circular con Icono */}
                        <div className="flex items-center justify-center">
                          {/* Paso Completado: Tono cálido correspondiente con Check */}
                          {isCompleted && (
                            <div
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full text-white flex items-center justify-center shadow-xs"
                              style={{ backgroundColor: colorStage.hex }}
                            >
                              <Check size={18} strokeWidth={2.8} />
                            </div>
                          )}

                          {/* Paso Activo / En Curso: Aro nítido sin relleno blanquecino ni sombras */}
                          {isCurrent && (
                            <div
                              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 bg-transparent flex items-center justify-center animate-pulse"
                              style={{
                                borderColor: colorStage.hex,
                                color: colorStage.hex
                              }}
                            >
                              <StepIcon size={18} />
                            </div>
                          )}

                          {/* Paso Pendiente / Futuro: Gris tenue de baja opacidad */}
                          {isPending && (
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 text-neutral-400 dark:text-neutral-500 flex items-center justify-center">
                              <StepIcon size={18} />
                            </div>
                          )}
                        </div>

                        {/* Título y Subtítulo centrado */}
                        <div className="mt-2.5 px-1 max-w-[110px] sm:max-w-[140px]">
                          <p
                            className="text-xs sm:text-sm font-semibold font-outfit leading-tight transition-colors"
                            style={{
                              color: isCurrent
                                ? colorStage.hex
                                : undefined
                            }}
                          >
                            <span
                              className={
                                isCompleted
                                  ? 'text-neutral-900 dark:text-neutral-100'
                                  : isPending
                                  ? 'text-neutral-400 dark:text-neutral-500 font-medium'
                                  : ''
                              }
                            >
                              {s.title}
                            </span>
                          </p>
                          <span className="hidden sm:block text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 leading-snug font-inter">
                            {s.desc}
                          </span>
                        </div>
                      </div>

                      {/* Línea de conexión horizontal con degradado cálido si está completada */}
                      {index < timelineSteps.length - 1 && (
                        <div className="flex-1 h-0.5 relative z-0 self-start mt-5 mx-[-12px] sm:mx-[-15px]">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              background:
                                index < currentStepIndex
                                  ? `linear-gradient(to right, ${colorStage.hex}, ${nextColorStage.hex})`
                                  : undefined
                            }}
                          >
                            {index >= currentStepIndex && (
                              <div className="h-full bg-neutral-200 dark:bg-neutral-800" />
                            )}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                3. TARJETAS DETALLADAS HOMOLOGADAS Y RESPONSIVAS
            ───────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Tarjeta 1: Dispositivo en Servicio */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Smartphone size={18} className="text-red-500 shrink-0" />
                    <h3 className="text-sm font-bold font-outfit text-neutral-900 dark:text-neutral-100">
                      Dispositivo en Servicio
                    </h3>
                  </div>

                  {orden.es_garantia && (
                    <Badge
                      variant="minimal"
                      color="danger"
                      icon={<ShieldCheck size={11} className="stroke-[2.2] shrink-0" />}
                      size="sm"
                      className="font-semibold text-[10px] tracking-wide leading-none"
                    >
                      GARANTÍA
                    </Badge>
                  )}
                </div>

                <div className="space-y-3.5 font-inter">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                        Marca / Modelo
                      </span>
                      <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100 font-inter block leading-normal break-words">
                        {[orden.marca_equipo, orden.modelo_equipo].filter(Boolean).join(' ')}
                      </span>
                    </div>

                    <div>
                      <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                        IMEI / N° de Serie
                      </span>
                      {orden.num_serie_imei ? (
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100 font-inter tabular-nums tracking-wide block leading-normal break-all">
                          {orden.num_serie_imei}
                        </span>
                      ) : (
                        <span className="text-sm text-neutral-400 dark:text-neutral-500 font-normal font-inter block leading-normal">
                          No registrado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1">
                    <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block">
                      Falla Declarada por el Cliente
                    </span>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {orden.falla_reportada || 'Revisión general'}
                    </p>
                  </div>

                  {(orden.accesorios_recibidos || orden.accesorios) && (
                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                        <Package size={13} className="shrink-0" />
                        <span className="uppercase tracking-wider text-xs font-semibold block">
                          Accesorios Recibidos
                        </span>
                      </div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {orden.accesorios_recibidos || orden.accesorios}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tarjeta 2: Tiempos y Personal */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <Calendar size={18} className="text-red-500 shrink-0" />
                  <h3 className="text-sm font-bold font-outfit text-neutral-900 dark:text-neutral-100">
                    Tiempos y Personal
                  </h3>
                </div>

                <div className="space-y-3.5 font-inter">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                        Fecha de Ingreso
                      </span>
                      <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100 font-inter tabular-nums block leading-normal">
                        {fechaIngresoFormateada || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="uppercase tracking-wider text-xs font-semibold text-neutral-400 dark:text-neutral-500 block mb-1">
                        Fecha Est. Entrega
                      </span>
                      {fechaEstimadaFormateada ? (
                        <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100 font-inter tabular-nums block leading-normal">
                          {fechaEstimadaFormateada}
                        </span>
                      ) : (
                        <span className="text-sm text-neutral-400 dark:text-neutral-500 font-normal font-inter block leading-normal">
                          Pendiente de confirmación
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Técnicos Asignados (Soporte Múltiple con envoltorio flex) */}
                  <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                      <User size={13} className="shrink-0" />
                      <span className="uppercase tracking-wider text-xs font-semibold block">
                        {tecnicosList.length > 1 ? 'Técnicos Asignados' : 'Técnico Asignado'}
                      </span>
                    </div>

                    {tecnicosList.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {tecnicosList.map((tec, idx) => (
                          <span
                            key={tec.id || idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-100 dark:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs max-w-full truncate"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <span className="truncate">{tec.nombre_completo || `${tec.nombre} ${tec.apellido}`}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400 dark:text-neutral-500 font-normal font-inter block">
                        Pendiente de asignación
                      </span>
                    )}
                  </div>

                  {/* Sucursal Responsable */}
                  <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                      <Building2 size={13} className="shrink-0" />
                      <span className="uppercase tracking-wider text-xs font-semibold block">
                        Sucursal Responsable
                      </span>
                    </div>
                    <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100 font-inter block break-words">
                      {orden.sucursal || 'Sucursal Principal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Checklist de Recepción (Full Width con rejilla responsiva) */}
              <div className="md:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={18} className="text-red-500 shrink-0" />
                    <h3 className="text-sm font-bold font-outfit text-neutral-900 dark:text-neutral-100">
                      Checklist de Recepción
                    </h3>
                  </div>
                  <span className="uppercase tracking-wider text-[11px] sm:text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                    Inspección Inicial de Hardware
                  </span>
                </div>

                <DeviceChecklistPicker
                  value={orden.checklist_entrada}
                  readOnly={true}
                  centered={true}
                  badgeVariant="minimal"
                  showCard={false}
                  showHeader={false}
                />
              </div>

              {/* Tarjeta 4: Historial de Avance en Taller (Línea de Tiempo Pública) */}
              <div className="md:col-span-2">
                <ServiceTimeline
                  events={historialPublico}
                  isPublic={true}
                  title="Historial de Avance"
                  onPhotoClick={setActivePhoto}
                  maxHeight="max-h-[520px]"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER INSTITUCIONAL
      ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800 py-6 text-center text-xs text-neutral-400 font-inter mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p>© {new Date().getFullYear()} Franyer Mobile Center. Todos los derechos reservados.</p>
          <p className="text-[11px] text-neutral-400/80">
            Los tiempos de reparación pueden variar según disponibilidad de repuestos y complejidad técnica.
          </p>
        </div>
      </footer>

      {/* Modal Lightbox de Foto Pública */}
      {activePhoto &&
        createPortal(
          <div
            onClick={() => setActivePhoto(null)}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-fade-in"
          >
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10"
              title="Cerrar visor"
            >
              <X size={22} />
            </button>
            <div
              className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={activePhoto}
                alt="Evidencia ampliada"
                className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-xl"
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default EstadoOrdenPage;
