import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  X,
  Ban,
  Loader2,
  Hash,
  User,
  Smartphone,
  Laptop,
  Tablet,
  Gamepad2,
  Watch
} from 'lucide-react';
import Button from '../common/Button';
import { cancelarServicio } from '../../services/servicios.service';
import { useAuth } from '../../context/AuthContext';
import { sileo } from 'sileo';

/**
 * Resuelve el icono visual según la categoría del equipo
 */
const getDeviceCategoryIcon = (categoria) => {
  const norm = (categoria || '').toLowerCase().trim();
  const iconClass = 'shrink-0 text-neutral-400 dark:text-neutral-500';
  if (norm.includes('laptop') || norm.includes('portatil') || norm.includes('portátil') || norm.includes('notebook') || norm.includes('computadora')) {
    return <Laptop size={13} className={iconClass} />;
  }
  if (norm.includes('tablet') || norm.includes('ipad') || norm.includes('tableta')) {
    return <Tablet size={13} className={iconClass} />;
  }
  if (norm.includes('consola') || norm.includes('videojuego') || norm.includes('game') || norm.includes('play') || norm.includes('xbox') || norm.includes('nintendo')) {
    return <Gamepad2 size={13} className={iconClass} />;
  }
  if (norm.includes('watch') || norm.includes('reloj') || norm.includes('band')) {
    return <Watch size={13} className={iconClass} />;
  }
  return <Smartphone size={13} className={iconClass} />;
};

/**
 * Modal para confirmar la cancelación de una orden de servicio.
 * Exige un motivo de cancelación descriptivo (mínimo 5 caracteres)
 * y advierte que la orden saldrá del flujo operativo de taller.
 */
export const CancelarOrdenModal = ({
  isOpen,
  onClose,
  orden,
  onSuccess
}) => {
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMotivo('');
      setErrorMsg('');
      setIsSubmitting(false);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const { user: currentUser } = useAuth();
  const userRole = String(currentUser?.rol_nombre || currentUser?.rol || '').toLowerCase();
  const isSuperAdmin = userRole === 'superadmin' || Number(currentUser?.rol_id) === 1;
  const isAuthorized = Boolean(
    isSuperAdmin ||
    userRole === 'admin_sucursal' ||
    userRole.includes('admin') ||
    [1, 2].includes(Number(currentUser?.rol_id))
  );

  if (!isOpen || !orden || !isAuthorized) return null;

  const rawTicket = String(orden.codigo_ticket || orden.codigo_orden || orden.id || '');
  const codigoTicket = rawTicket.startsWith('#') ? rawTicket.slice(1) : rawTicket;

  const rawMarca = (orden.marca_equipo || orden.marca || '').trim();
  const rawModelo = (orden.modelo_equipo || orden.modelo || '').trim();
  let modeloLimpio = rawModelo;
  if (rawMarca && rawModelo.toLowerCase().startsWith(rawMarca.toLowerCase())) {
    modeloLimpio = rawModelo.slice(rawMarca.length).trim();
  }
  const equipo = [rawMarca, modeloLimpio].filter(Boolean).join(' · ');
  const cliente = orden.nombre_cliente || orden.cliente_nombre || orden.cliente || 'Cliente Ocasional';

  const isMotivoValido = motivo.trim().length >= 5;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!isMotivoValido) {
      setErrorMsg('El motivo debe contener al menos 5 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const res = await cancelarServicio(orden.id, {
        motivo_cancelacion: motivo.trim()
      });

      if (res.ok || res.success) {
        sileo.success({
          title: 'Orden cancelada',
          description: `La orden #${codigoTicket} ha sido dada de baja del taller exitosamente.`
        });
        onSuccess?.(res.data || { ...orden, estado: 'Cancelado / No Reparado', codigo_estado: 'CANCELADO_DEVUELTO', orden_flujo: 8 });
        onClose?.();
      } else {
        throw new Error(res.message || 'No se pudo cancelar la orden de servicio.');
      }
    } catch (err) {
      console.error('Error al cancelar orden:', err);
      const msg = err.response?.data?.message || err.message || 'Error al procesar la cancelación.';
      setErrorMsg(msg);
      sileo.error({
        title: 'Error al cancelar',
        description: msg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs w-full h-full min-h-screen">
      {/* Backdrop */}
      <div
        onClick={() => !isSubmitting && onClose?.()}
        className="fixed inset-0 bg-transparent transition-opacity"
      />

      {/* Tarjeta Modal - Dimensiones ampliadas max-w-xl sm:max-w-2xl */}
      <div className="relative w-full max-w-xl sm:max-w-2xl bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 my-auto transition-all animate-scale-up">
        {/* Cabecera Homologada */}
        <div className="p-5 sm:p-6 pb-4 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base sm:text-lg font-bold font-outfit text-neutral-900 dark:text-white leading-tight">
              Cancelar Orden de Servicio
            </h3>

            {/* Metadatos con resaltado de ticket e iconos para cliente y equipo */}
            <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter mt-1">
              <span className="inline-flex items-center gap-1 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                <Hash size={13} className="shrink-0 text-red-500" />
                <span>{codigoTicket}</span>
              </span>

              <span className="text-neutral-300 dark:text-neutral-700 font-bold">·</span>

              <span className="inline-flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-medium">
                <User size={13} className="shrink-0 text-neutral-400" />
                <span>{cliente}</span>
              </span>

              {equipo && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700 font-bold">·</span>
                  <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 font-medium">
                    {getDeviceCategoryIcon(orden.categoria)}
                    <span>{equipo}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo / Formulario */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 font-inter">
          {/* Mensaje de Advertencia Limpio (sin caja de fondo ni bordes) */}
          <div className="space-y-1 text-rose-600 dark:text-rose-400">
            <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm font-outfit">
              <AlertTriangle size={15} className="text-rose-500 shrink-0" />
              <span>Esta acción dará de baja la orden técnica.</span>
            </div>
            <p className="text-xs text-rose-600/90 dark:text-rose-400/90 pl-5 leading-relaxed font-inter">
              El equipo saldrá del flujo operativo de taller y no podrá ser editado en el banco de trabajo. La acción quedará registrada en el historial de auditoría.
            </p>
          </div>

          {/* Campo Motivo de Cancelación */}
          <div className="space-y-1.5">
            <label htmlFor="motivo_cancelacion" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-outfit">
              Motivo de Cancelación <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="motivo_cancelacion"
              rows={3}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              disabled={isSubmitting}
              placeholder="Describe el motivo de la cancelación (ej. Cliente no aprobó presupuesto de reparación, equipo devuelto sin reparar, error de registro...)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all resize-none font-inter"
              autoFocus
            />
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>Mínimo 5 caracteres</span>
              <span className={motivo.trim().length >= 5 ? 'text-emerald-500 font-medium' : 'text-neutral-400'}>
                {motivo.trim().length} / 5
              </span>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errorMsg}
            </p>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Volver
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              icon={isSubmitting ? Loader2 : Ban}
              disabled={!isMotivoValido || isSubmitting}
              isLoading={isSubmitting}
            >
              Confirmar Cancelación
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CancelarOrdenModal;
