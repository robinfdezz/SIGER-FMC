import React, { useState, useEffect } from 'react';
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
import { getCompanyPublicProfile } from '../../services/configuracion.service';
import { sileo } from 'sileo';

/**
 * QrUploadModal
 * Componente visual controlado para visualización de Código QR y enlace
 * de sincronización móvil. La sesión y el sondeo son gestionados por el padre (DevicePhotoUploader).
 */
export const QrUploadModal = ({
  isOpen,
  onClose,
  sessionId = null,
  loading = false,
  error = null,
  isExpired = false,
  onGenerateNew,
  maxPhotos = 5
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [domainBase, setDomainBase] = useState('');

  // Determinar dominio base para construir la URL móvil
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await getCompanyPublicProfile();
        if (isMounted) {
          const remoteDomain = res?.data?.dominio_sistema?.trim();
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

  const queryParam = maxPhotos ? `?max=${maxPhotos}` : '';
  const targetUrl = sessionId
    ? `${(domainBase || window.location.origin).replace(/\/$/, '')}/subir-fotos/${sessionId}${queryParam}`
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
          Escanea el código con tu móvil para transferir {maxPhotos ? `hasta ${maxPhotos} fotografía${maxPhotos === 1 ? '' : 's'}` : 'las fotos'}.
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
              {onGenerateNew && (
                <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onGenerateNew}>
                  Reintentar
                </Button>
              )}
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
              {onGenerateNew && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={onGenerateNew}
                >
                  Generar nuevo código
                </Button>
              )}
            </div>
          ) : targetUrl ? (
            <div className="space-y-4 flex flex-col items-center">
              {/* Contenedor limpio del Código QR */}
              <div className="p-3.5 bg-white rounded-xl inline-flex items-center justify-center shadow-2xs">
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
        {targetUrl && !isExpired && !error && !loading && (
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
