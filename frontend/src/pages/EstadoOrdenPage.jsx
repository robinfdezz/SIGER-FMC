import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getServicioByTicket } from '../services/servicios.service';
import { getCompanyPublicProfile } from '../services/configuracion.service';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
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
  Receipt,
  Building2,
  User,
  CheckCircle,
  AlertTriangle,
  Minus
} from 'lucide-react';

const CHECKLIST_LABELS = {
  enciende: 'Enciende',
  pantalla: 'Pantalla / Imagen',
  tactil: 'Táctil',
  puerto_carga: 'Puerto de Carga',
  camara_frontal: 'Cámara Frontal',
  camara_trasera: 'Cámara Trasera',
  auricular: 'Auricular / Altavoz',
  microfono: 'Micrófono',
  botones: 'Botones Físicos',
  sim_senal: 'Lector SIM / Señal',
  golpes_tapa: 'Golpes / Tapa Trasera'
};

// Progresión cromática cálida institucional (Mamey / Naranja -> Rojo Corporativo)
const WARM_CHROMATIC_PALETTE = {
  RECIBIDO: {
    hex: '#F59E0B', // Amber / Mamey
    tailText: 'text-amber-500 dark:text-amber-400',
    tailBorder: 'border-amber-500'
  },
  EN_DIAGNOSTICO: {
    hex: '#F97316', // Orange / Mamey intenso
    tailText: 'text-orange-500 dark:text-orange-400',
    tailBorder: 'border-orange-500'
  },
  ESPERA_REPUESTO: {
    hex: '#EA580C', // Naranja tostado / quemado
    tailText: 'text-orange-600 dark:text-orange-400',
    tailBorder: 'border-orange-600'
  },
  EN_REPARACION: {
    hex: '#EF4444', // Rojo coral / Bermellón
    tailText: 'text-red-500 dark:text-red-400',
    tailBorder: 'border-red-500'
  },
  LISTO_ENTREGA: {
    hex: '#DC2626', // Rojo vivo corporativo
    tailText: 'text-red-600 dark:text-red-400',
    tailBorder: 'border-red-600'
  },
  ENTREGADO: {
    hex: '#B91C1C', // Rojo profundo final
    tailText: 'text-red-700 dark:text-red-400',
    tailBorder: 'border-red-700'
  },
  CANCELADO_DEVUELTO: {
    hex: '#DC2626',
    tailText: 'text-red-600 dark:text-red-400',
    tailBorder: 'border-red-600'
  }
};

export const EstadoOrdenPage = () => {
  const { codigo } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const codeFromUrl = (codigo || searchParams.get('codigo') || '').trim().toUpperCase();

  const [inputCode, setInputCode] = useState(codeFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orden, setOrden] = useState(null);
  const [companyLogo, setCompanyLogo] = useState(null);

  // Cargar logotipo de la empresa en el cliente público
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

  const fetchTicket = useCallback(async (codeToFetch) => {
    if (!codeToFetch) return;
    setLoading(true);
    setError(null);

    try {
      const res = await getServicioByTicket(codeToFetch);
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
  }, []);

  useEffect(() => {
    if (codeFromUrl) {
      setInputCode(codeFromUrl);
      fetchTicket(codeFromUrl);
    } else {
      setOrden(null);
      setError(null);
    }
  }, [codeFromUrl, fetchTicket]);

  // Manejo de búsqueda
  const handleSearch = (e) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!clean) return;
    navigate(`/estado/${encodeURIComponent(clean)}`);
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

  // Cálculos económicos para la tarjeta de Balance
  const costoTotal = Number(orden?.costo_final_confirmado || orden?.costo_previsto || 0);
  const anticipo = Number(orden?.monto_anticipo || 0);
  const descuento = Number(orden?.monto_descuento || 0);
  const balancePendiente = Math.max(0, costoTotal - anticipo - descuento);
  const estaLiquidado = balancePendiente <= 0 || orden?.codigo_estado === 'ENTREGADO';

  // Nota de diagnóstico técnico (si existe en historial o recepción)
  const notaDiagnostico =
    orden?.historial_estados?.find(
      (h) => (h.codigo_estado === 'EN_DIAGNOSTICO' || h.codigo_estado === 'EN_REPARACION') && h.nota_cambio
    )?.nota_cambio ||
    orden?.observaciones_recepcion ||
    null;

  // Determinar si la vista está vacía / en espera de búsqueda
  const isVistaInicial = !orden && !loading && !error;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#121214] text-neutral-900 dark:text-neutral-100 flex flex-col font-inter selection:bg-red-500 selection:text-white transition-colors duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER PÚBLICO LIMPIO (Únicamente Logo y Subtítulo)
      ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Logotipo Oficial"
                className="h-9 w-auto max-w-[160px] object-contain"
                onError={() => setCompanyLogo(null)}
              />
            ) : (
              <div className="flex items-center">
                <img src={logoFmcBlack} alt="FMC" className="h-8 w-auto dark:hidden" />
                <img src={logoFmcWhite} alt="FMC" className="h-8 w-auto hidden dark:block" />
              </div>
            )}

            <div className="border-l border-neutral-200 dark:border-neutral-800 pl-3">
              <span className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold tracking-wider uppercase font-inter">
                Portal de Consulta y Seguimiento
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          CONTENIDO PRINCIPAL
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 flex flex-col justify-center">
        {/* Bloque de Bienvenida y Buscador: Centrado en pantalla vacía, o arriba al tener datos */}
        <section
          className={`w-full transition-all duration-500 ease-out ${
            isVistaInicial
              ? 'min-h-[75vh] flex flex-col justify-center items-center text-center py-12'
              : 'pt-6 sm:pt-8 pb-4 text-center max-w-2xl mx-auto'
          }`}
        >
          {/* TÍTULO DINÁMICO */}
          {orden ? (
            <div className="max-w-xl mx-auto space-y-1.5 mb-6">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-outfit text-neutral-900 dark:text-white tracking-tight">
                Consultando el ticket:
                <span className="block font-mono text-red-600 dark:text-red-500 select-all mt-1 sm:mt-1.5 text-2xl sm:text-3xl lg:text-4xl">
                  #{orden.codigo_ticket}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter leading-relaxed">
                Seguimiento en tiempo real y avances técnicos del dispositivo.
              </p>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-2 mb-6">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-outfit text-neutral-900 dark:text-white tracking-tight">
                Consulta el Estado de tu Equipo
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter leading-relaxed">
                Ingresa el código alfanumérico impreso en tu comprobante o sticker para ver los avances en tiempo real.
              </p>
            </div>
          )}

          {/* BUSCADOR CON BUTTON REUTILIZABLE */}
          <form onSubmit={handleSearch} className="w-full max-w-md mx-auto flex items-center gap-2">
            <div className="flex-1">
              <Input
                id="ticket-search-input"
                value={inputCode}
                onChange={handleInputChange}
                onPaste={handleInputPaste}
                placeholder="Ej: FMC-SFM-6XQB-W33K"
                className="font-mono text-sm sm:text-base uppercase tracking-wider !py-2.5 !px-4"
                autoComplete="off"
                autoFocus={isVistaInicial}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading || !inputCode.trim()}
              isLoading={loading}
              icon={ArrowRight}
              iconPosition="right"
              className="!h-[42px] px-5 text-xs sm:text-sm font-semibold shrink-0"
            >
              Consultar
            </Button>
          </form>
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

        {/* Mensaje de Error */}
        {!loading && error && (
          <div className="max-w-lg mx-auto mb-8 p-4 sm:p-5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3.5 text-red-800 dark:text-red-300 animate-fade-in">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-semibold font-outfit">Ticket no encontrado</p>
              <p className="text-red-700 dark:text-red-400/90 font-inter leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. TRACKER VISUAL DESACOPLADO (Flotando sobre el fondo general)
        ───────────────────────────────────────────────────────────── */}
        {!loading && orden && (
          <div className="space-y-8 pb-12 animate-fade-in">
            {/* Stepper horizontal liberado de la caja blanca */}
            <div className="w-full my-6 sm:my-8 px-2 select-none">
              <div className="flex items-start justify-between relative">
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
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full text-white flex items-center justify-center shadow-xs transition-transform hover:scale-105"
                              style={{ backgroundColor: colorStage.hex }}
                            >
                              <Check size={18} strokeWidth={2.8} />
                            </div>
                          )}

                          {/* Paso Activo / En Curso: Borde y pulso en el color de su etapa */}
                          {isCurrent && (
                            <div
                              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center animate-pulse"
                              style={{
                                borderColor: colorStage.hex,
                                backgroundColor: `${colorStage.hex}18`,
                                color: colorStage.hex,
                                boxShadow: `0 0 14px ${colorStage.hex}35`
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
                        <div className="mt-2.5 px-1 max-w-[120px] sm:max-w-[150px]">
                          <p
                            className="text-xs sm:text-sm font-semibold font-outfit leading-tight transition-colors"
                            style={{
                              color: isCurrent
                                ? colorStage.hex
                                : isCompleted
                                ? undefined
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
                4. CUADRÍCULA DE TARJETAS DETALLADAS (2x2)
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

                <div className="space-y-3.5 text-xs sm:text-sm font-inter">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">
                        Marca y Modelo
                      </span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-inter text-sm block mt-0.5">
                        {[orden.marca_equipo, orden.modelo_equipo].filter(Boolean).join(' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">
                        IMEI / N° de Serie
                      </span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200 block mt-0.5">
                        {orden.num_serie_imei || 'No especificado'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-1">
                    <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">
                      Falla Declarada por el Cliente
                    </span>
                    <p className="text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed text-xs">
                      {orden.falla_reportada || 'Revisión general'}
                    </p>
                  </div>

                  {notaDiagnostico && (
                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-1">
                      <span className="text-blue-600 dark:text-blue-400 block text-[11px] uppercase tracking-wider font-semibold">
                        Diagnóstico Técnico / Observaciones
                      </span>
                      <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed text-xs">
                        {notaDiagnostico}
                      </p>
                    </div>
                  )}

                  {(orden.accesorios_recibidos || orden.accesorios) && (
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                        <Package size={13} className="shrink-0" />
                        <span className="text-[11px] uppercase tracking-wider font-semibold">
                          Accesorios Recibidos
                        </span>
                      </div>
                      <p className="text-neutral-700 dark:text-neutral-300 font-medium text-xs leading-relaxed">
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

                <div className="space-y-3.5 text-xs sm:text-sm font-inter">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">
                        Fecha de Ingreso
                      </span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 block mt-0.5">
                        {orden.created_at
                          ? new Date(orden.created_at).toLocaleDateString('es-DO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-neutral-400 block text-[11px] uppercase tracking-wider font-semibold">
                        Fecha Estimada de Entrega
                      </span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 block mt-0.5">
                        {orden.fecha_entrega_real
                          ? new Date(orden.fecha_entrega_real).toLocaleDateString('es-DO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : orden.fecha_entrega_estimada
                          ? new Date(orden.fecha_entrega_estimada).toLocaleDateString('es-DO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Por definir según diagnóstico'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                      <User size={13} className="shrink-0" />
                      <span className="text-[11px] uppercase tracking-wider font-semibold">
                        Técnico Asignado
                      </span>
                    </div>
                    <span className="text-neutral-800 dark:text-neutral-200 font-semibold text-xs block">
                      {orden.tecnico_nombre || 'Especialista en taller asignado'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                      <Building2 size={13} className="shrink-0" />
                      <span className="text-[11px] uppercase tracking-wider font-semibold">
                        Sucursal Responsable
                      </span>
                    </div>
                    <span className="text-neutral-800 dark:text-neutral-200 font-semibold text-xs block">
                      {orden.sucursal || 'Sucursal Principal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Checklist de Recepción */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={18} className="text-red-500 shrink-0" />
                    <h3 className="text-sm font-bold font-outfit text-neutral-900 dark:text-neutral-100">
                      Checklist de Recepción
                    </h3>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-medium">Estado inicial</span>
                </div>

                {orden.checklist_entrada && Object.keys(orden.checklist_entrada).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(orden.checklist_entrada).map(([key, val]) => {
                      const label = CHECKLIST_LABELS[key] || key.replace(/_/g, ' ');
                      const isOk = val === 'ok' || val === true || val === 'bueno';
                      const isFalla = val === 'falla' || val === false || val === 'malo';

                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs font-medium ${
                            isOk
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                              : isFalla
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                              : 'bg-neutral-50 dark:bg-neutral-900/40 border-neutral-200/50 dark:border-neutral-800 text-neutral-500'
                          }`}
                        >
                          <span className="truncate pr-1">{label}</span>
                          {isOk ? (
                            <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                          ) : isFalla ? (
                            <AlertTriangle size={13} className="text-rose-500 shrink-0" />
                          ) : (
                            <Minus size={13} className="text-neutral-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-neutral-400 font-inter">
                    Inspección estándar sin observaciones críticas registradas.
                  </div>
                )}
              </div>

              {/* Tarjeta 4: Balance / Pago */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-red-500 shrink-0" />
                    <h3 className="text-sm font-bold font-outfit text-neutral-900 dark:text-neutral-100">
                      Balance y Cotización
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      estaLiquidado
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                        : anticipo > 0
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                        : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {estaLiquidado ? 'Liquidado' : anticipo > 0 ? 'Abono Parcial' : 'Pendiente'}
                  </span>
                </div>

                <div className="space-y-3 font-inter">
                  <div className="flex items-center justify-between text-xs sm:text-sm py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                    <span className="text-neutral-500 dark:text-neutral-400">Presupuesto Acordado:</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                      RD$ {costoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                    <span className="text-neutral-500 dark:text-neutral-400">Abono Inicial (Anticipo):</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      RD$ {anticipo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {descuento > 0 && (
                    <div className="flex items-center justify-between text-xs sm:text-sm py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                      <span className="text-neutral-500 dark:text-neutral-400">Descuento Especial:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                        - RD$ {descuento.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm sm:text-base pt-2 font-bold">
                    <span className="text-neutral-800 dark:text-neutral-200">Balance Pendiente:</span>
                    <span
                      className={`font-mono text-base sm:text-lg ${
                        balancePendiente > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      RD$ {balancePendiente.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER INSTITUCIONAL
      ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800 py-6 text-center text-xs text-neutral-400 font-inter mt-auto">
        <div className="max-w-5xl mx-auto px-4 space-y-1">
          <p>© {new Date().getFullYear()} Franyer Mobile Center. Todos los derechos reservados.</p>
          <p className="text-[11px] text-neutral-400/80">
            Los tiempos de reparación pueden variar según disponibilidad de repuestos y complejidad técnica.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EstadoOrdenPage;
