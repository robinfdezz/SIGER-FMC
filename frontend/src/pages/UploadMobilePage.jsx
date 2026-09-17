import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getUploadSession, subirFotosSession } from '../services/uploadSession.service';
import { getCompanyPublicProfile } from '../services/configuracion.service';
import { useTheme } from '../context/ThemeContext';
import { MorphIcon } from 'morphicons/react';
import { Sun, Moon } from 'lucide';
import { sileo } from 'sileo';
import Button from '../components/common/Button';
import SimpleButton from '../components/common/SimpleButton';
import logoFmcBlack from '../assets/logo-FMC Black.png';
import logoFmcWhite from '../assets/logo-FMC White.png';

export const UploadMobilePage = () => {
  const { sessionId } = useParams();
  const { isDark, toggleTheme } = useTheme();

  const [sessionData, setSessionData] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Cargar logotipo oficial homologado con /estado
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

  // Validar sesión al montar
  const verifySession = async () => {
    if (!sessionId) {
      setSessionError('Identificador de sesión no proporcionado.');
      setLoadingSession(false);
      return;
    }

    setLoadingSession(true);
    setSessionError(null);

    try {
      const res = await getUploadSession(sessionId);
      if (res && res.ok) {
        if (res.estado === 'EXPIRADO') {
          setSessionError('Esta sesión ha expirado. Por favor, escanea un nuevo código QR en la computadora.');
        } else {
          setSessionData(res);
        }
      } else {
        setSessionError(res?.message || 'Código de sesión no encontrado o inválido.');
      }
    } catch (err) {
      console.error('Error al validar sesión móvil:', err);
      setSessionError(
        err.response?.data?.message ||
        'No se pudo conectar con el servidor para validar la sesión QR. Revisa tu conexión a internet.'
      );
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    verifySession();
  }, [sessionId]);

  // Manejo de archivos seleccionados
  const handleFilesAdded = (files) => {
    if (!files || files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const newFiles = [];
    const newUrls = [];

    Array.from(files).forEach((file) => {
      if (!validTypes.includes(file.type)) {
        sileo.error({
          title: 'Formato no compatible',
          description: `${file.name}: Solo se permiten imágenes JPG, PNG o WEBP.`
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        sileo.error({
          title: 'Archivo muy grande',
          description: `${file.name} excede el límite máximo permitido de 5MB.`
        });
        return;
      }

      newFiles.push(file);
      newUrls.push({
        url: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2)
      });
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
  };

  const handleRemoveFile = (index) => {
    // Liberar memoria del objectURL
    if (previewUrls[index]?.url) {
      URL.revokeObjectURL(previewUrls[index].url);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendPhotos = async () => {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    try {
      const result = await subirFotosSession(sessionId, selectedFiles);
      if (result && result.ok) {
        // Limpiar previews
        previewUrls.forEach((p) => URL.revokeObjectURL(p.url));
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadSuccess(true);
        sileo.success({
          title: '¡Fotos enviadas!',
          description: 'Las imágenes se han sincronizado con la computadora.'
        });
      } else {
        sileo.error({
          title: 'Error de subida',
          description: result?.message || 'Error al procesar la subida de las fotos.'
        });
      }
    } catch (err) {
      console.error('Error al subir fotos desde el móvil:', err);
      sileo.error({
        title: 'Error de transferencia',
        description: err.response?.data?.message || 'Ocurrió un error al transferir las imágenes al servidor.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#121214] text-neutral-900 dark:text-neutral-100 flex flex-col font-inter selection:bg-red-500 selection:text-white pb-12 transition-colors duration-200">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER PÚBLICO CON LOGO Y TOGGLE DE TEMA (HOMOLOGADO CON /ESTADO)
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

          {/* Toggle de Modo Oscuro / Claro (Idéntico a /estado) */}
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

      {/* Contenido principal */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center">
        {loadingSession ? (
          <div className="text-center py-16 space-y-3">
            <Loader2 size={36} className="text-red-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Conectando con la computadora...
            </p>
          </div>
        ) : sessionError ? (
          <div className="bg-white dark:bg-[#18181b] p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm text-center space-y-4 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
                Sesión no disponible
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {sessionError}
              </p>
            </div>
            <button
              type="button"
              onClick={verifySession}
              className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} />
              Reintentar conexión
            </button>
          </div>
        ) : uploadSuccess ? (
          <div className="bg-white dark:bg-[#18181b] p-6 sm:p-8 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 text-center space-y-4 my-auto animate-fade-in">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto" strokeWidth={2.2} />
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 font-outfit">
                ¡Fotografías enviadas!
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Las imágenes se transfirieron exitosamente y ya están visibles en la pantalla de la computadora. Ya puedes cerrar esta pestaña.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Título institucional homologado con /estado */}
            <div className="max-w-xl mx-auto space-y-2 text-center px-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-outfit text-neutral-900 dark:text-white tracking-tight">
                Captura de Evidencias
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter leading-relaxed">
                Toma fotos del dispositivo con la cámara o elígelas de tu galería para transferirlas en tiempo real.
              </p>
            </div>

            {/* Inputs ocultos nativos */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleFilesAdded(e.target.files);
                e.target.value = '';
              }}
            />

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilesAdded(e.target.files);
                e.target.value = '';
              }}
            />

            {/* Botones de acción táctil directos (sin recuadro blanco y sin sombras) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="py-4 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none"
              >
                <Camera size={22} />
                <span>Tomar Foto</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="py-4 px-3 rounded-xl bg-white dark:bg-[#18181b] hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-98 text-neutral-800 dark:text-neutral-200 font-semibold text-xs flex flex-col items-center justify-center gap-1.5 border border-neutral-200/80 dark:border-neutral-700/80 transition-all cursor-pointer select-none"
              >
                <ImageIcon size={22} />
                <span>Elegir Galería</span>
              </button>
            </div>

            {/* Listado de Previsualización */}
            {previewUrls.length > 0 && (
              <div className="bg-white dark:bg-[#18181b] p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider font-outfit">
                    Fotos Seleccionadas ({previewUrls.length})
                  </span>
                  <SimpleButton
                    variant="danger"
                    size="xs"
                    icon={Trash2}
                    onClick={() => {
                      previewUrls.forEach((p) => URL.revokeObjectURL(p.url));
                      setSelectedFiles([]);
                      setPreviewUrls([]);
                    }}
                  >
                    Borrar todas
                  </SimpleButton>
                </div>

                <div className="grid grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto p-1">
                  {previewUrls.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 shadow-2xs group"
                    >
                      <img
                        src={item.url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer"
                        title="Descartar"
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white">
                        {item.size}MB
                      </span>
                    </div>
                  ))}
                </div>

                {/* Botón institucional para transferir fotos */}
                <Button
                  variant="primary"
                  size="md"
                  className="w-full mt-2"
                  disabled={isUploading}
                  isLoading={isUploading}
                  icon={Send}
                  onClick={handleSendPhotos}
                >
                  {isUploading
                    ? 'Transfiriendo a la PC...'
                    : `Enviar ${previewUrls.length} Foto${previewUrls.length === 1 ? '' : 's'} al Sistema`}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pie de página */}
      <footer className="text-center text-[11px] text-neutral-400 px-4 mt-auto">
        Franyer Mobile Center • Transmisión segura punto a punto
      </footer>
    </div>
  );
};

export default UploadMobilePage;
