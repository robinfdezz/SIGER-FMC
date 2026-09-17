import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import SimpleButton from '../common/SimpleButton';
import {
  Copy,
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { crearUploadSession, getUploadSession } from '../../services/uploadSession.service';
import { getCompanyPublicProfile } from '../../services/configuracion.service';
import { sileo } from 'sileo';

const POLLING_INTERVAL_MS = 2500;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos en frontend

/**
 * QrUploadModal
 * Modal interactivo para sincronización en tiempo real de fotografías desde móviles vía QR y Polling.
 */
export const QrUploadModal = ({
  isOpen,
  onClose,
  onPhotosReceived,
  maxPhotos = 5
}) => {
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [domainBase, setDomainBase] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const pollTimerRef = useRef(null);
  const sessionTimeoutRef = useRef(null);

  // Determinar dominio base para construir la URL móvil
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await getCompanyPublicProfile();
        if (isMounted) {
          const remoteDomain = res?.data?.dominio_sistema?.trim();
          // Si estamos en localhost y hay un dominio remoto de producción no accesible localmente,
          // preferimos window.location.origin para pruebas en red local, o remoteDomain si es HTTPS público
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          if (isLocal) {
            setDomainBase(window.location.origin);
          } else if (remoteDomain && remoteDomain.startsWith('http')) {
            setDomainBase(remoteDomain.replace(/\/$/, ''));
          } else {
            setDomainBase(window.location.origin);
          }
        }
      } catch {
        if (isMounted) setDomainBase(window.location.origin);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  }, []);

  // Iniciar o reiniciar sesión QR
  const startSession = useCallback(async () => {
    clearTimers();
    setLoading(true);
    setError(null);
    setIsExpired(false);
    setPollCount(0);

    try {
      const res = await crearUploadSession();
      if (res && res.ok && res.sessionId) {
        setSessionId(res.sessionId);
      } else {
        setError('No se pudo inicializar la sesión QR. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error al crear sesión QR:', err);
      setError(err.response?.data?.message || 'Error de conexión al servidor al generar el código QR.');
    } finally {
      setLoading(false);
    }
  }, [clearTimers]);

  // Manejar apertura y cierre del modal
  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      clearTimers();
      setSessionId(null);
      setError(null);
      setIsExpired(false);
    }
    return () => {
      clearTimers();
    };
  }, [isOpen, startSession, clearTimers]);

  // Polling activo cuando existe sessionId
  useEffect(() => {
    if (!sessionId || !isOpen || isExpired) return;

    // Timeout de 10 minutos
    sessionTimeoutRef.current = setTimeout(() => {
      clearTimers();
      setIsExpired(true);
    }, SESSION_TIMEOUT_MS);

    pollTimerRef.current = setInterval(async () => {
      try {
        setPollCount((prev) => prev + 1);
        const res = await getUploadSession(sessionId);

        if (res && res.ok) {
          if (res.estado === 'EXPIRADO') {
            clearTimers();
            setIsExpired(true);
            return;
          }

          if (Array.isArray(res.fotos) && res.fotos.length > 0) {
            clearTimers();
            sileo.success({
              title: '¡Fotos recibidas!',
              description: `${res.fotos.length} fotografía(s) sincronizada(s) exitosamente desde el móvil.`
            });
            onPhotosReceived(res.fotos);
            onClose();
          }
        }
      } catch (err) {
        console.warn('Error en ciclo de polling de fotos:', err.message);
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      clearTimers();
    };
  }, [sessionId, isOpen, isExpired, clearTimers, onPhotosReceived, onClose]);

  const targetUrl = sessionId
    ? `${(domainBase || window.location.origin).replace(/\/$/, '')}/subir-fotos/${sessionId}`
    : '';

  const handleCopyLink = async () => {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      sileo.info({
        title: 'Enlace copiado',
        description: 'Pega el enlace en tu navegador móvil si prefieres no escanear el QR.'
      });
    } catch {
      sileo.error({ title: 'Error', description: 'No se pudo copiar el enlace al portapapeles.' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      height="h-auto max-h-[90vh]"
      title="Subir Fotos con el Móvil"
    >
      <div className="px-4 sm:px-6 pt-2 pb-6 sm:pb-7 space-y-4 text-center">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-inter">
          Escanea el código con tu móvil para transferir las fotos.
        </p>

        {/* Contenedor central del QR */}
        <div className="flex flex-col items-center justify-center min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 size={36} className="text-red-600 animate-spin" />
              <span className="text-xs text-neutral-500 font-inter">Generando sesión segura...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 max-w-xs text-center">
              <AlertCircle size={32} className="text-red-500 dark:text-red-400" />
              <p className="text-xs text-red-600 dark:text-red-400 font-inter">{error}</p>
              <Button size="sm" variant="secondary" icon={RefreshCw} onClick={startSession}>
                Reintentar
              </Button>
            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 max-w-xs text-center">
              <AlertCircle size={32} className="text-amber-500 dark:text-amber-400" />
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                El código QR ha expirado
              </p>
              <p className="text-[11px] text-neutral-500">
                Por seguridad, las sesiones caducan a los 10 minutos de inactividad.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={RefreshCw}
                onClick={startSession}
              >
                Generar nuevo código
              </Button>
            </div>
          ) : targetUrl ? (
            <div className="space-y-4 flex flex-col items-center">
              {/* Contenedor limpio del Código QR */}
              <div className="p-3.5 bg-white rounded-xl inline-flex items-center justify-center">
                <QRCodeSVG
                  value={targetUrl}
                  size={180}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#111827"
                />
              </div>

              {/* Estado minimalista con Badge */}
              <Badge
                variant="minimalist"
                color="neutral"
                size="sm"
                icon={
                  <span className="relative flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                }
              >
                Esperando fotos del móvil...
              </Badge>
            </div>
          ) : null}
        </div>

        {/* Acciones de enlace alternativo centradas con SimpleButton */}
        {targetUrl && !isExpired && !error && (
          <div className="flex justify-center items-center gap-2 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
            <SimpleButton
              onClick={handleCopyLink}
              icon={copiedLink ? Check : Copy}
              iconClassName={copiedLink ? 'text-emerald-500' : ''}
              size="sm"
            >
              {copiedLink ? '¡Enlace copiado!' : 'Copiar enlace'}
            </SimpleButton>

            <span className="text-neutral-300 dark:text-neutral-700 select-none text-xs">•</span>

            <SimpleButton
              onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
              icon={ExternalLink}
              size="sm"
            >
              Abrir en pestaña
            </SimpleButton>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QrUploadModal;
