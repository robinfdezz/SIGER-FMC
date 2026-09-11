import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getServicioByTicket } from '../services/servicios.service';
import {
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  PackageCheck,
  AlertCircle,
  Smartphone,
  Calendar,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const ESTADOS_STEPS = [
  { key: 'recibido', label: 'Recibido', icon: Clock, desc: 'Equipo ingresado en taller' },
  { key: 'diagnostico', label: 'Diagnóstico', icon: Search, desc: 'Evaluación técnica inicial' },
  { key: 'reparacion', label: 'En Reparación', icon: Wrench, desc: 'Intervención técnica en curso' },
  { key: 'listo', label: 'Listo', icon: PackageCheck, desc: 'Pruebas completadas, listo para retiro' },
  { key: 'entregado', label: 'Entregado', icon: CheckCircle2, desc: 'Entregado a conformidad' }
];

export const EstadoOrdenPage = () => {
  const { codigo } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const codeFromUrl = (codigo || searchParams.get('codigo') || '').trim().toUpperCase();

  const [inputCode, setInputCode] = useState(codeFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orden, setOrden] = useState(null);

  const fetchTicket = useCallback(async (codeToFetch) => {
    if (!codeToFetch) return;
    setLoading(true);
    setError(null);

    try {
      const res = await getServicioByTicket(codeToFetch);
      if (res && res.ok && res.data) {
        setOrden(res.data);
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

  const handleSearch = (e) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) return;
    navigate(`/estado/${encodeURIComponent(clean)}`);
  };

  // Determinar paso actual en la línea de tiempo según el estado recibido
  const getStepIndex = (estadoNombre = '') => {
    const norm = String(estadoNombre).toLowerCase();
    if (norm.includes('entrega') || norm.includes('finaliz')) return 4;
    if (norm.includes('listo') || norm.includes('complet')) return 3;
    if (norm.includes('repar') || norm.includes('proceso') || norm.includes('espera')) return 2;
    if (norm.includes('diagn') || norm.includes('revis')) return 1;
    return 0; // Recibido por defecto
  };

  const currentStep = orden ? getStepIndex(orden.estado) : 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-inter selection:bg-red-500 selection:text-white">
      {/* Barra superior de navegación / Branding */}
      <header className="border-b border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white font-black text-base shadow-sm shadow-red-500/20">
              F
            </div>
            <div>
              <span className="font-outfit font-extrabold text-sm sm:text-base tracking-tight text-neutral-900 dark:text-neutral-50 block leading-tight">
                Franyer Mobile Center
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium tracking-wide uppercase">
                Portal de Seguimiento
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-900/40">
            <Sparkles size={13} className="shrink-0" />
            <span className="hidden sm:inline">Estado en vivo</span>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Buscador de Ticket */}
        <section className="text-center max-w-xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit text-neutral-900 dark:text-white tracking-tight">
              Consulta el Estado de tu Equipo
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 font-inter">
              Ingresa el código alfanumérico impreso en tu comprobante o sticker para ver los avances en tiempo real.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Ej: FMC-SFM-6XQB-W33K"
                className="w-full pl-4 pr-10 py-2.5 text-sm sm:text-base font-mono uppercase tracking-wider rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-xs"
              />
              <span className="absolute right-3 inset-y-0 flex items-center pointer-events-none text-neutral-400">
                <Search size={18} />
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm shadow-red-600/20 shrink-0"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              <span className="hidden sm:inline">Consultar</span>
            </button>
          </form>
        </section>

        {/* Estado de Carga */}
        {loading && (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-red-600" />
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 font-inter">
              Localizando orden de servicio...
            </p>
          </div>
        )}

        {/* Mensaje de Error */}
        {!loading && error && (
          <div className="max-w-lg mx-auto p-4 sm:p-5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3.5 text-red-800 dark:text-red-300">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-semibold font-outfit">Ticket no encontrado</p>
              <p className="text-red-700 dark:text-red-400/90 font-inter leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Tarjeta con Información del Ticket */}
        {!loading && orden && (
          <div className="space-y-6">
            {/* Header de la Orden */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block font-inter">
                    Código de Orden
                  </span>
                  <div className="font-mono text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-wider">
                    #{orden.codigo_ticket}
                  </div>
                </div>

                <div className="self-start sm:self-center">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shadow-2xs"
                    style={{
                      backgroundColor: orden.estado_color ? `${orden.estado_color}15` : '#f3f4f6',
                      color: orden.estado_color || '#374151',
                      borderColor: orden.estado_color ? `${orden.estado_color}40` : '#e5e7eb'
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: orden.estado_color || '#374151' }}
                    />
                    {orden.estado || 'En Proceso'}
                  </span>
                </div>
              </div>

              {/* Línea de Tiempo de Progreso */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-4 font-outfit">
                  Avance de la Reparación
                </span>

                <div className="grid grid-cols-5 gap-2 relative">
                  {ESTADOS_STEPS.map((step, idx) => {
                    const isCompleted = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    const IconComp = step.icon;

                    return (
                      <div key={step.key} className="flex flex-col items-center text-center gap-1.5 relative">
                        <div
                          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-4 ring-red-100 dark:ring-red-950/50'
                              : isCompleted
                              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          <IconComp size={18} />
                        </div>

                        <span className={`text-[10px] sm:text-xs font-semibold ${isCompleted ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
                          {step.label}
                        </span>
                        <span className="hidden sm:block text-[9px] text-neutral-400 leading-tight">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detalles del Dispositivo y Registro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Equipo y Falla */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <Smartphone size={18} className="text-red-500" />
                  <h3 className="text-sm font-semibold font-outfit text-neutral-900 dark:text-neutral-100">
                    Dispositivo en Servicio
                  </h3>
                </div>

                <div className="space-y-3 text-xs sm:text-sm font-inter">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Marca y Modelo</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {[orden.marca_equipo, orden.modelo_equipo].filter(Boolean).join(' ')}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[11px]">Falla Reportada</span>
                    <p className="text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed">
                      {orden.falla_reportada || 'Revisión general'}
                    </p>
                  </div>

                  {orden.es_garantia && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                      <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                      <span>Atendido bajo cobertura de garantía</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fechas y Sede */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <Calendar size={18} className="text-red-500" />
                  <h3 className="text-sm font-semibold font-outfit text-neutral-900 dark:text-neutral-100">
                    Tiempos y Recepción
                  </h3>
                </div>

                <div className="space-y-3 text-xs sm:text-sm font-inter">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Fecha de Ingreso</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {orden.created_at ? new Date(orden.created_at).toLocaleDateString('es-DO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      }) : 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[11px]">Fecha Estimada de Entrega</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {orden.fecha_entrega_estimada ? new Date(orden.fecha_entrega_estimada).toLocaleDateString('es-DO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      }) : 'Por definir según diagnóstico'}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-400 block text-[11px]">Titular Registrado</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {orden.nombre_cliente || orden.cliente_nombre || 'Cliente Particular'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800 py-6 text-center text-xs text-neutral-400 font-inter">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p>© {new Date().getFullYear()} Franyer Mobile Center. Todos los derechos reservados.</p>
          <p className="text-[11px] text-neutral-400/80">
            Los tiempos de reparación pueden variar según la disponibilidad de repuestos y complejidad técnica.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default EstadoOrdenPage;
