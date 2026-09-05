import React, { useMemo } from 'react';
import { User, Phone, Smartphone, AlertCircle } from 'lucide-react';
import { PatternLockSvg, UnlockMethodView } from './PatternLock';

export { PatternLockSvg, UnlockMethodView };

const DEFAULT_MOCK_DATA = {
  codigo_ticket: 'FMC-2026-0089',
  nombre_empresa: 'FRANYER MOBILE',
  nombre_sucursal: 'Sucursal SFM',
  nombre_cliente: 'Carlos Mendoza',
  telefono_cliente: '829-555-0149',
  marca_equipo: 'Samsung',
  modelo_equipo: 'Galaxy S23 Ultra',
  falla_reportada: 'Cambio de pantalla y revisión táctil',
  fecha_ingreso: '05/09/2026',
  tecnico_asignado: 'Técnico Taller 01',
  datos_acceso: { tipo: 'patron', valor: '1-2-5-8-9' }
};

/**
 * Componente vector SVG de Código QR estilizado con módulos cuadrados nítidos.
 */
export const SvgQRCode = ({ size, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 33 33"
    fill="currentColor"
    className={`shrink-0 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    shapeRendering="crispEdges"
  >
    {/* Fondo blanco base */}
    <rect x="0" y="0" width="33" height="33" fill="white" />

    {/* Finder Pattern Top-Left */}
    <rect x="0" y="0" width="7" height="7" fill="black" />
    <rect x="1" y="1" width="5" height="5" fill="white" />
    <rect x="2" y="2" width="3" height="3" fill="black" />

    {/* Finder Pattern Top-Right */}
    <rect x="26" y="0" width="7" height="7" fill="black" />
    <rect x="27" y="1" width="5" height="5" fill="white" />
    <rect x="28" y="2" width="3" height="3" fill="black" />

    {/* Finder Pattern Bottom-Left */}
    <rect x="0" y="26" width="7" height="7" fill="black" />
    <rect x="1" y="27" width="5" height="5" fill="white" />
    <rect x="2" y="28" width="3" height="3" fill="black" />

    {/* Alignment Pattern */}
    <rect x="20" y="20" width="5" height="5" fill="black" />
    <rect x="21" y="21" width="3" height="3" fill="white" />
    <rect x="22" y="22" width="1" height="1" fill="black" />

    {/* Timing Patterns & Data Modules */}
    <rect x="8" y="2" width="2" height="2" fill="black" />
    <rect x="12" y="2" width="2" height="2" fill="black" />
    <rect x="16" y="2" width="2" height="2" fill="black" />
    <rect x="20" y="2" width="2" height="2" fill="black" />
    <rect x="2" y="8" width="2" height="2" fill="black" />
    <rect x="2" y="12" width="2" height="2" fill="black" />
    <rect x="2" y="16" width="2" height="2" fill="black" />
    <rect x="2" y="20" width="2" height="2" fill="black" />

    {/* Inner Data Matrix Grid */}
    <rect x="9" y="9" width="3" height="3" fill="black" />
    <rect x="14" y="9" width="2" height="2" fill="black" />
    <rect x="18" y="9" width="3" height="2" fill="black" />
    <rect x="23" y="9" width="2" height="3" fill="black" />
    <rect x="9" y="14" width="2" height="3" fill="black" />
    <rect x="13" y="13" width="3" height="3" fill="black" />
    <rect x="18" y="13" width="2" height="2" fill="black" />
    <rect x="22" y="14" width="3" height="2" fill="black" />
    <rect x="9" y="19" width="3" height="2" fill="black" />
    <rect x="14" y="18" width="2" height="3" fill="black" />
    <rect x="18" y="17" width="3" height="3" fill="black" />
    <rect x="23" y="18" width="2" height="2" fill="black" />
    <rect x="9" y="23" width="2" height="3" fill="black" />
    <rect x="13" y="23" width="3" height="2" fill="black" />
    <rect x="18" y="22" width="2" height="3" fill="black" />
    <rect x="26" y="9" width="2" height="4" fill="black" />
    <rect x="29" y="15" width="2" height="3" fill="black" />
    <rect x="26" y="26" width="2" height="2" fill="black" />
    <rect x="29" y="28" width="3" height="3" fill="black" />
  </svg>
);


/**
 * Componente modular LabelPreview para stickers adhesivos de taller.
 *
 * @param {Object} props
 * @param {Object} props.config - Configuración de la etiqueta (ancho_mm, alto_mm, orientacion, formato_codigo, incluir_*, tamano_fuente)
 * @param {Object} [props.data] - Datos de la orden/ticket para renderizado
 * @param {boolean} [props.isPrintable] - Si se está renderizando para impresión real
 * @param {string} [props.className] - Clases adicionales
 */
export const LabelPreview = ({
  config = {},
  data = {},
  isPrintable = false,
  className = ''
}) => {
  const mergedData = { ...DEFAULT_MOCK_DATA, ...data };

  const {
    ancho_mm = 50,
    alto_mm = 30,
    orientacion = 'horizontal',
    incluir_nombre_empresa = true,
    incluir_codigo_ticket = true,
    incluir_cliente = true,
    incluir_telefono = true,
    incluir_equipo = true,
    incluir_falla = true,
    incluir_fecha = true,
    incluir_tecnico = false,
    incluir_metodo_desbloqueo = true,
    tamano_fuente = 'md' // 'sm' | 'md' | 'lg'
  } = config;

  // Relación de escala: mm a px aproximado para visualización
  const isVertical = orientacion === 'vertical';
  const effectiveWidthMm = isVertical ? Math.min(ancho_mm, alto_mm) : Math.max(ancho_mm, alto_mm);
  const effectiveHeightMm = isVertical ? Math.max(ancho_mm, alto_mm) : Math.min(ancho_mm, alto_mm);

  // Escala visual calculada
  const baseScale = 6.2;
  const previewWidthPx = Math.round(effectiveWidthMm * baseScale);
  const previewHeightPx = Math.round(effectiveHeightMm * baseScale);

  // Discriminación de dimensiones compactas / grandes
  const isCompact = effectiveHeightMm <= 25 || effectiveWidthMm <= 40;
  const isLarge = effectiveHeightMm >= 40 || effectiveWidthMm >= 60;

  // Tamaño dinámico del Código o Método de Desbloqueo según las medidas de la etiqueta
  const qrSize = useMemo(() => {
    if (isCompact) return 50;
    if (isLarge) return 105;
    return 75;
  }, [isCompact, isLarge]);

  // Escala tipográfica automática según medidas de la etiqueta
  const fontSizeClasses = useMemo(() => {
    if (isCompact) {
      return {
        title: 'text-[10px] leading-tight',
        code: 'text-[11px] leading-none',
        body: 'text-[9px] leading-tight',
        sub: 'text-[8px] leading-none'
      };
    }
    if (isLarge) {
      return {
        title: 'text-[14px] leading-tight',
        code: 'text-[16px] leading-none',
        body: 'text-[12px] leading-tight',
        sub: 'text-[10.5px] leading-none'
      };
    }
    if (tamano_fuente === 'sm') {
      return {
        title: 'text-[11px] leading-tight',
        code: 'text-[12px] leading-none',
        body: 'text-[9.5px] leading-tight',
        sub: 'text-[8.5px] leading-none'
      };
    }
    if (tamano_fuente === 'lg') {
      return {
        title: 'text-[13px] leading-tight',
        code: 'text-[14px] leading-none',
        body: 'text-[11px] leading-tight',
        sub: 'text-[10px] leading-none'
      };
    }
    return {
      title: 'text-[12px] leading-tight',
      code: 'text-[13px] leading-none',
      body: 'text-[10px] leading-tight',
      sub: 'text-[9px] leading-none'
    };
  }, [isCompact, isLarge, tamano_fuente]);

  const deviceText = [mergedData.marca_equipo, mergedData.modelo_equipo].filter(Boolean).join(' ');

  const showUnlock = Boolean(incluir_metodo_desbloqueo);

  return (
    <div
      className={`relative select-none transition-all flex items-center justify-center ${className}`}
      style={
        isPrintable
          ? {
              width: `${effectiveWidthMm}mm`,
              height: `${effectiveHeightMm}mm`,
              padding: '2mm',
              backgroundColor: '#FEFDFD',
              color: '#000000',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }
          : undefined
      }
    >
      {/* Contenedor del Sticker físico */}
      <div
        className="rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-md p-3.5 flex flex-col justify-between overflow-hidden text-neutral-900 transition-all max-w-full"
        style={{
          width: isPrintable ? '100%' : `${Math.min(previewWidthPx, 380)}px`,
          minHeight: isPrintable ? '100%' : `${Math.min(previewHeightPx, 240)}px`,
          backgroundColor: '#FEFDFD',
          color: '#111827',
          boxShadow: isPrintable ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Cabecera del Sticker */}
        <div className="flex items-start justify-between gap-2 border-b border-neutral-200/90 pb-1.5 mb-1.5">
          <div className="min-w-0 flex-1">
            {incluir_nombre_empresa && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`font-extrabold uppercase tracking-wide text-neutral-900 ${fontSizeClasses.title}`}>
                  {mergedData.nombre_empresa}
                </span>
                <span className="text-[9px] font-medium text-neutral-500 shrink-0">
                  • {mergedData.nombre_sucursal}
                </span>
              </div>
            )}

            {incluir_codigo_ticket && (
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`font-mono font-black tracking-wider text-black ${fontSizeClasses.code}`}>
                  {mergedData.codigo_ticket}
                </span>
                {incluir_fecha && (
                  <span className={`text-neutral-500 font-medium ${fontSizeClasses.sub}`}>
                    ({mergedData.fecha_ingreso})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cuerpo del Sticker: Info del Cliente, Dispositivo y Método de Desbloqueo */}
        <div className="flex items-center justify-between gap-3 flex-1 min-h-0">
          {/* Datos descriptivos sin recortar */}
          <div className="space-y-1 min-w-0 flex-1">
            {/* Cliente y Teléfono */}
            {(incluir_cliente || incluir_telefono) && (
              <div className="flex items-start gap-1.5 min-w-0">
                <User size={11} className="text-neutral-600 shrink-0 mt-0.5" />
                <span className={`font-bold text-neutral-900 break-words leading-tight line-clamp-2 ${fontSizeClasses.body}`}>
                  {incluir_cliente ? mergedData.nombre_cliente : ''}
                  {incluir_cliente && incluir_telefono && ' · '}
                  {incluir_telefono ? (
                    <span className="font-mono font-semibold text-neutral-700">{mergedData.telefono_cliente}</span>
                  ) : ''}
                </span>
              </div>
            )}

            {/* Equipo / Modelo */}
            {incluir_equipo && (
              <div className="flex items-start gap-1.5 min-w-0">
                <Smartphone size={11} className="text-neutral-600 shrink-0 mt-0.5" />
                <span className={`font-semibold text-neutral-900 break-words leading-tight line-clamp-2 ${fontSizeClasses.body}`}>
                  {deviceText || 'Dispositivo sin especificar'}
                </span>
              </div>
            )}

            {/* Falla Reportada */}
            {incluir_falla && (
              <div className="flex items-start gap-1.5 min-w-0">
                <AlertCircle size={11} className="text-neutral-600 shrink-0 mt-0.5" />
                <p className={`text-neutral-800 break-words leading-tight line-clamp-2 font-medium ${fontSizeClasses.body}`}>
                  {mergedData.falla_reportada}
                </p>
              </div>
            )}

            {/* Técnico Asignado */}
            {incluir_tecnico && (
              <div className={`text-neutral-600 font-medium break-words leading-tight pt-0.5 ${fontSizeClasses.sub}`}>
                Téc: <span className="font-semibold text-neutral-800">{mergedData.tecnico_asignado}</span>
              </div>
            )}
          </div>

          {/* Renderizado del Método de Desbloqueo */}
          {showUnlock && (
            <UnlockMethodView datosAcceso={mergedData.datos_acceso} qrSize={qrSize} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LabelPreview;
