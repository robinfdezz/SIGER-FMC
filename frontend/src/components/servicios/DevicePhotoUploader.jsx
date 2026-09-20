import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Trash2, Plus, Loader2, QrCode } from 'lucide-react';
import { uploadFotosRecepcion, eliminarFotoTemporal } from '../../services/servicios.service';
import { crearUploadSession, getUploadSession } from '../../services/uploadSession.service';
import QrUploadModal from './QrUploadModal';
import { sileo } from 'sileo';

const DEFAULT_MAX_PHOTOS = 5;
const POLLING_INTERVAL_MS = 2500;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos de vigencia

/**
 * DevicePhotoUploader
 * Galería dinámica de evidencias fotográficas.
 * Permite selección individual/múltiple o Drag & Drop con subida inmediata a Cloudinary,
 * así como carga remota sincronizada desde dispositivos móviles mediante Código QR y Polling
 * desacoplado que continúa operando en segundo plano aunque el modal esté cerrado.
 *
 * @param {string[]|Object[]} value - URLs u objetos de fotos cargadas
 * @param {Function} onChange       - Callback con el nuevo array de objetos {url, public_id}
 * @param {number} maxPhotos        - Cantidad máxima de fotos permitidas (default 5)
 * @param {string} title            - Título de la cabecera
 * @param {string} description      - Subtítulo explicativo
 * @param {React.Component} icon    - Icono temático del bloque
 * @param {string} className        - Clases CSS adicionales para el contenedor
 */
const DevicePhotoUploader = ({
  value = [],
  onChange,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  title = 'Fotografías / Evidencias de Recepción',
  description = null,
  icon: HeaderIcon = Camera,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Estados del ciclo de vida de la sesión QR (gestionados en el padre)
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const fileInputRef = useRef(null);
  const pollTimerRef = useRef(null);
  const sessionTimeoutRef = useRef(null);

  const MAX_PHOTOS = maxPhotos;
  const currentPhotos = Array.isArray(value) ? value.filter(Boolean) : [];

  // Mantener referencias actualizadas para callbacks asíncronos y polling
  const currentPhotosRef = useRef(currentPhotos);
  useEffect(() => {
    currentPhotosRef.current = currentPhotos;
  }, [currentPhotos]);

  const isQrModalOpenRef = useRef(isQrModalOpen);
  useEffect(() => {
    isQrModalOpenRef.current = isQrModalOpen;
  }, [isQrModalOpen]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Limpiar temporizadores de sondeo
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

  // Limpieza al desmontar el componente padre
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Callback ejecutado al recibir fotos sincronizadas desde el móvil
  const handleQrPhotosReceived = useCallback(
    (newRemotePhotos) => {
      if (!Array.isArray(newRemotePhotos) || newRemotePhotos.length === 0) return;

      const normalizedNew = newRemotePhotos.map((item) => ({
        url: typeof item === 'object' && item !== null ? item.url || item.secure_url : item,
        public_id: typeof item === 'object' && item !== null ? item.public_id || null : null,
        size: typeof item === 'object' && item?.size ? item.size : null
      }));

      const currentList = currentPhotosRef.current;
      const normalizedCurrent = currentList.map((item) =>
        typeof item === 'object' && item !== null
          ? { url: item.url, public_id: item.public_id || null, size: item.size || null }
          : { url: item, public_id: null, size: null }
      );

      // Fusionar sin duplicados por URL
      const existingUrls = new Set(normalizedCurrent.map((p) => p.url));
      const toAdd = normalizedNew.filter((p) => !existingUrls.has(p.url));

      const combined = [...normalizedCurrent, ...toAdd].slice(0, MAX_PHOTOS);
      if (onChangeRef.current) {
        onChangeRef.current(combined);
      }
    },
    [MAX_PHOTOS]
  );

  const cuposRestantes = Math.max(0, MAX_PHOTOS - currentPhotos.length);

  // Iniciar una nueva sesión de carga QR con el cupo restante real de la orden
  const startNewSession = useCallback(async () => {
    clearTimers();
    setIsSessionLoading(true);
    setSessionError(null);
    setIsSessionExpired(false);

    const remainingSlots = Math.max(0, MAX_PHOTOS - currentPhotosRef.current.length);
    if (remainingSlots <= 0) {
      setSessionError(`Ya has alcanzado el límite máximo de ${MAX_PHOTOS} fotografías para esta orden.`);
      setIsSessionLoading(false);
      return;
    }

    try {
      const res = await crearUploadSession({ maxFotosPermitidas: remainingSlots });
      if (res && res.ok && res.sessionId) {
        setActiveSessionId(res.sessionId);
        setSessionExpiresAt(Date.now() + SESSION_TIMEOUT_MS);
      } else {
        setSessionError('No se pudo inicializar la sesión QR. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error al crear sesión QR:', err);
      setSessionError(err.response?.data?.message || 'Error de conexión al servidor al generar el código QR.');
    } finally {
      setIsSessionLoading(false);
    }
  }, [clearTimers, MAX_PHOTOS]);

  // Abrir modal QR reutilizando la sesión activa si aún no ha expirado
  const handleOpenQrModal = () => {
    const isSessionAlive = activeSessionId && !isSessionExpired && sessionExpiresAt && Date.now() < sessionExpiresAt;
    if (!isSessionAlive) {
      startNewSession();
    }
    setIsQrModalOpen(true);
  };

  // Sondeo continuo en segundo plano (Background Polling)
  useEffect(() => {
    if (!activeSessionId || isSessionExpired) return;

    // Timeout de 10 minutos para expirar la sesión en frontend
    const remainingMs = sessionExpiresAt ? Math.max(0, sessionExpiresAt - Date.now()) : SESSION_TIMEOUT_MS;
    sessionTimeoutRef.current = setTimeout(() => {
      clearTimers();
      setIsSessionExpired(true);
    }, remainingMs);

    // Intervalo de polling periódico
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await getUploadSession(activeSessionId);
        if (!res || !res.ok) return;

        if (res.estado === 'EXPIRADO') {
          clearTimers();
          setIsSessionExpired(true);
          return;
        }

        if (Array.isArray(res.fotos) && res.fotos.length > 0) {
          clearTimers();
          const wasModalOpen = isQrModalOpenRef.current;

          // Integrar fotos recibidas al estado del formulario
          handleQrPhotosReceived(res.fotos);

          // Resetear sesión completada
          setActiveSessionId(null);
          setSessionExpiresAt(null);

          // Si el modal estaba visible, cerrarlo automáticamente
          if (wasModalOpen) {
            setIsQrModalOpen(false);
          }

          // Notificación amigable tanto si estaba abierto como si estaba cerrado
          sileo.success({
            title: '¡Fotos recibidas desde el móvil!',
            description: `${res.fotos.length} fotografía(s) sincronizada(s) exitosamente a la orden.`
          });
        }
      } catch (pollErr) {
        console.warn('⚠️ Error en ciclo de sondeo de fotos móvil:', pollErr?.message);
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      clearTimers();
    };
  }, [activeSessionId, isSessionExpired, sessionExpiresAt, clearTimers, handleQrPhotosReceived]);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    const availableSlots = MAX_PHOTOS - currentPhotos.length;
    if (availableSlots <= 0) {
      sileo.error({
        title: 'Límite alcanzado',
        description: `Solo se permite un máximo de ${MAX_PHOTOS} fotografías.`
      });
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const validFiles = [];

    for (const f of filesToProcess) {
      if (!validTypes.includes(f.type)) {
        sileo.error({ title: 'Formato no permitido', description: `${f.name}: Solo JPG, PNG o WEBP.` });
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        sileo.error({ title: 'Archivo muy grande', description: `${f.name} excede el límite de 5MB.` });
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const result = await uploadFotosRecepcion(validFiles);
      if (result && (result.ok || result.status === 200)) {
        let uploaded = [];
        if (Array.isArray(result.fotos) && result.fotos.length > 0) {
          uploaded = result.fotos.map((f, idx) => ({
            url: f.url || f.secure_url,
            public_id: f.public_id || null,
            size: f.size || (validFiles[idx]?.size ? (validFiles[idx].size / (1024 * 1024)).toFixed(2) : null)
          }));
        } else if (Array.isArray(result.data?.fotos) && result.data.fotos.length > 0) {
          uploaded = result.data.fotos.map((f, idx) => ({
            url: f.url || f.secure_url,
            public_id: f.public_id || null,
            size: f.size || (validFiles[idx]?.size ? (validFiles[idx].size / (1024 * 1024)).toFixed(2) : null)
          }));
        } else if (result.url || result.data?.url) {
          uploaded = [
            {
              url: result.url || result.data?.url,
              public_id: result.public_id || result.data?.public_id || null,
              size: validFiles[0]?.size ? (validFiles[0].size / (1024 * 1024)).toFixed(2) : null
            }
          ];
        } else if (Array.isArray(result.urls)) {
          uploaded = result.urls.map((url, idx) => ({
            url,
            public_id: null,
            size: validFiles[idx]?.size ? (validFiles[idx].size / (1024 * 1024)).toFixed(2) : null
          }));
        }

        const normalizedCurrent = currentPhotos.map((item) =>
          typeof item === 'object' && item !== null
            ? { url: item.url, public_id: item.public_id || null, size: item.size || null }
            : { url: item, public_id: null, size: null }
        );

        const newPhotos = [...normalizedCurrent, ...uploaded].slice(0, MAX_PHOTOS);
        onChange(newPhotos);
      } else {
        sileo.error({ title: 'Error de subida', description: result?.message || 'No se pudieron subir las imágenes.' });
      }
    } catch {
      sileo.error({ title: 'Error de subida', description: 'No se pudo subir la imagen. Intenta de nuevo.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (indexToRemove) => {
    const photoToRemove = currentPhotos[indexToRemove];
    const publicId =
      typeof photoToRemove === 'object' && photoToRemove !== null ? photoToRemove.public_id || null : null;

    // Destruir inmediatamente en Cloudinary en segundo plano
    if (publicId && typeof publicId === 'string' && !publicId.startsWith('local-')) {
      eliminarFotoTemporal(publicId).catch((err) => {
        console.warn('⚠️ No se pudo eliminar asset temporal de Cloudinary:', err?.message);
      });
    }

    const newPhotos = currentPhotos.filter((_, idx) => idx !== indexToRemove);
    onChange(newPhotos);
  };

  // ¿Hay una sesión QR en curso esperando fotos en segundo plano?
  const hasActiveWaitingSession = Boolean(
    activeSessionId && !isSessionExpired && sessionExpiresAt && Date.now() < sessionExpiresAt
  );

  return (
    <div
      className={`p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4 ${className}`.trim()}
    >
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
            <HeaderIcon size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-outfit">
              {title}
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter mt-0.5">
              {description || `Hasta ${MAX_PHOTOS} fotos del dispositivo. JPG, PNG o WEBP, máx. 5MB cada una.`}
            </p>
          </div>
        </div>

        <span className="text-sm text-neutral-600 dark:text-neutral-300 font-inter shrink-0">
          <strong className="font-semibold">{currentPhotos.length}</strong> de {MAX_PHOTOS}
        </span>
      </div>

      {/* Input de archivo invisible (PC) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Galería dinámica de miniaturas y slots de subida */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {/* Fotos agregadas */}
        {currentPhotos.map((item, index) => {
          const photoUrl = typeof item === 'object' && item !== null ? item.url : item;
          const photoKey = typeof item === 'object' && item?.public_id ? item.public_id : `${photoUrl}-${index}`;
          const photoSize =
            typeof item === 'object' && item !== null
              ? item.size || (item.bytes ? (item.bytes / (1024 * 1024)).toFixed(2) : null)
              : null;

          return (
            <div
              key={photoKey}
              className="relative w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl overflow-hidden group border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 shadow-2xs"
            >
              <img
                src={photoUrl}
                alt={`Evidencia ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Botón de descartar/eliminar en la esquina superior derecha */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-red-600 text-white transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-sm"
                title="Eliminar fotografía"
              >
                <Trash2 size={13} />
              </button>

              {/* Indicador de peso o índice */}
              <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[10px] text-white/90 font-inter bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded-md">
                <span>Foto {index + 1}</span>
                {photoSize && <span>{photoSize} MB</span>}
              </div>
            </div>
          );
        })}

        {/* Slot 1: Botón de adjuntar desde PC o Drag & Drop */}
        {!isUploading && currentPhotos.length < MAX_PHOTOS && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-2 text-center cursor-pointer select-none group ${
              isDragging
                ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-neutral-50/50 dark:bg-neutral-800/40 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/70'
            }`}
            title="Hacer clic para buscar o arrastrar fotos desde esta PC"
          >
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 shadow-2xs border border-neutral-200 dark:border-neutral-700 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <Plus size={18} />
            </div>
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 font-inter">
              Desde PC
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-inter leading-tight">
              Adjuntar
            </span>
          </div>
        )}

        {/* Slot 2: Botón complementario móvil QR al lado del botón de adjuntar */}
        {!isUploading && currentPhotos.length < MAX_PHOTOS && (
          <div
            onClick={handleOpenQrModal}
            className={`relative w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-2 text-center cursor-pointer select-none group ${
              hasActiveWaitingSession
                ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 shadow-xs'
                : 'border-red-200 dark:border-red-950/60 hover:border-red-500 dark:hover:border-red-600 bg-red-50/30 dark:bg-red-950/10 hover:bg-red-50/70 dark:hover:bg-red-950/30'
            }`}
            title={
              hasActiveWaitingSession
                ? 'Sesión QR activa en segundo plano. Haz clic para ver el código nuevamente.'
                : 'Escanear QR para capturar fotos con la cámara del móvil'
            }
          >
            {/* Badge pulsante cuando está esperando fotos en segundo plano */}
            {hasActiveWaitingSession && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5" title="Sondeo activo en segundo plano">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
            )}

            <div
              className={`w-8 h-8 rounded-xl shadow-2xs border flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110 ${
                hasActiveWaitingSession
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-800/60'
              }`}
            >
              <QrCode size={18} />
            </div>
            <span
              className={`text-xs font-semibold font-inter ${
                hasActiveWaitingSession
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              {hasActiveWaitingSession ? 'Esperando...' : 'Con Móvil'}
            </span>
            <span
              className={`text-[10px] font-inter leading-tight ${
                hasActiveWaitingSession
                  ? 'text-emerald-600/80 dark:text-emerald-400/80'
                  : 'text-red-500/80 dark:text-red-400/80'
              }`}
            >
              {hasActiveWaitingSession ? 'Sesión activa' : 'Código QR'}
            </span>
          </div>
        )}

        {/* Slot de carga mientras se procesan imágenes de la PC */}
        {isUploading && (
          <div className="w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex flex-col items-center justify-center p-3 text-center animate-pulse">
            <Loader2 size={24} className="text-red-600 animate-spin mb-1.5" />
            <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 font-inter">
              Subiendo a Cloudinary...
            </span>
          </div>
        )}
      </div>

      {/* Submodal controlado de visualización QR */}
      <QrUploadModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        sessionId={activeSessionId}
        loading={isSessionLoading}
        error={sessionError}
        isExpired={isSessionExpired}
        onGenerateNew={startNewSession}
        maxPhotos={cuposRestantes}
      />
    </div>
  );
};

export default DevicePhotoUploader;