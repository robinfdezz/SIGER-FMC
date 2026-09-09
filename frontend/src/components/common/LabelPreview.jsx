import React, { useMemo } from 'react';
import { User, Phone, Smartphone, AlertCircle } from 'lucide-react';
import { PatternLockSvg, UnlockMethodView } from './PatternLock';

export { PatternLockSvg, UnlockMethodView };

const DEFAULT_MOCK_DATA = {
  codigo_ticket: 'FMC-2026-0089',
  nombre_empresa: 'FRANYER MOBILE',
  nombre_sucursal: 'Sucursal SFM',
  nombre_cliente: 'Carlos Mendoza',
  cliente_nombre: 'Carlos Mendoza',
  telefono_cliente: '829-555-0149',
  cliente_telefono: '829-555-0149',
  marca_equipo: 'Samsung',
  modelo_equipo: 'Galaxy S23 Ultra',
  falla_reportada: 'Cambio de pantalla y revisión táctil',
  fecha_ingreso: '05/09/2026',
  tecnico_asignado: 'Carlos Técnico',
  datos_acceso: {
    tipo: 'patron',
    metodo: 'patron',
    patron: [0, 1, 4, 7, 8],
    valor: '1-2-5-8-9'
  }
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
  const accessData = data?.datos_acceso !== undefined
    ? data.datos_acceso
    : (data?.datos_acceso_equipo !== undefined ? data.datos_acceso_equipo : DEFAULT_MOCK_DATA.datos_acceso);

  const hasRealData = Boolean(data && Object.keys(data).length > 0 && (data.id || data.codigo_ticket));
  const fallbackNombre = hasRealData ? '' : DEFAULT_MOCK_DATA.nombre_cliente;
  const fallbackTel = hasRealData ? '' : DEFAULT_MOCK_DATA.telefono_cliente;

  const mergedData = {
    ...DEFAULT_MOCK_DATA,
    ...data,
    datos_acceso: accessData,
    nombre_cliente: data?.nombre_cliente || data?.cliente_nombre || fallbackNombre,
    cliente_nombre: data?.cliente_nombre || data?.nombre_cliente || fallbackNombre,
    telefono_cliente: data?.telefono_cliente || data?.cliente_telefono || fallbackTel,
    cliente_telefono: data?.cliente_telefono || data?.telefono_cliente || fallbackTel,
    tecnico_asignado: data?.tecnico_asignado ?? data?.tecnico_nombre ?? data?.tecnico ?? data?.tecnicos?.[0]?.nombre_completo ?? data?.tecnicos?.[0]?.nombre ?? (hasRealData ? 'Sin asignar' : DEFAULT_MOCK_DATA.tecnico_asignado)
  };

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

  // Escala tipográfica automática según medidas de la etiqueta y modo de visualización
  const fontSizeClasses = useMemo(() => {
    if (isPrintable) {
      if (isCompact) {
        return {
          title: 'text-[9px] leading-tight',
          code: 'text-[10.5px] leading-none',
          body: 'text-[8px] leading-tight',
          sub: 'text-[7.5px] leading-none'
        };
      }
      return {
        title: 'text-[10px] leading-tight',
        code: 'text-[12px] leading-none',
        body: 'text-[9px] leading-tight',
        sub: 'text-[8px] leading-none'
      };
    }
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
  }, [isPrintable, isCompact, isLarge, tamano_fuente]);

  const deviceText = [mergedData.marca_equipo, mergedData.modelo_equipo].filter(Boolean).join(' ');
  const showUnlock = Boolean(incluir_metodo_desbloqueo);
  const unlockSize = isPrintable ? (isCompact ? 34 : (effectiveHeightMm <= 30 ? 38 : 46)) : qrSize;

  const nombre = (incluir_cliente ? (mergedData.cliente_nombre || mergedData.nombre_cliente || '') : '').trim();
  const tel = (incluir_telefono ? (mergedData.cliente_telefono || mergedData.telefono_cliente || '') : '').trim();
  const textoCliente = [nombre, tel].filter(Boolean).join(' · ');

  return (
    <div
      className={`relative select-none ${isPrintable ? 'w-full h-full p-0' : 'transition-all flex items-center justify-center'} ${className}`}
      style={
        isPrintable
          ? {
              width: `${effectiveWidthMm}mm`,
              height: `${effectiveHeightMm}mm`,
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }
          : undefined
      }
    >
      {/* Contenedor del Sticker físico */}
      <div
        className={`flex flex-col justify-between overflow-hidden text-black transition-all ${
          isPrintable
            ? 'w-full h-full p-1.5 bg-white rounded-none border-0'
            : 'rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-md p-3.5 max-w-full'
        }`}
        style={
          isPrintable
            ? {
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                color: '#000000'
              }
            : {
                width: `${Math.min(previewWidthPx, 380)}px`,
                minHeight: `${Math.min(previewHeightPx, 240)}px`,
                backgroundColor: '#FEFDFD',
                color: '#111827',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              }
        }
      >
        {/* Cabecera del Sticker */}
        <div className={`flex items-start justify-between gap-2 ${isPrintable ? 'border-b border-neutral-400 pb-1 mb-1' : 'border-b border-neutral-200/90 pb-1.5 mb-1.5'}`}>
          <div className="min-w-0 flex-1">
            {incluir_nombre_empresa && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`font-extrabold uppercase tracking-wide text-black ${fontSizeClasses.title}`}>
                  {mergedData.nombre_empresa}
                </span>
                <span className="text-[8px] sm:text-[9px] font-medium text-neutral-600 shrink-0">
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
                  <span className={`text-neutral-600 font-medium ${fontSizeClasses.sub}`}>
                    ({mergedData.fecha_ingreso})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cuerpo del Sticker: Info del Cliente, Dispositivo y Método de Desbloqueo */}
        <div className="flex items-center justify-between gap-2 overflow-hidden flex-1 min-h-0">
          {/* Columna Izquierda: Datos del cliente, equipo, falla y técnico */}
          <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-0.5">
            {/* Cliente y Teléfono */}
            {Boolean(textoCliente) && (
              <div className="flex items-center gap-1 min-w-0 truncate">
                <User size={isPrintable ? 8.5 : 10} className="text-neutral-700 shrink-0" />
                <span className="text-[10px] font-bold text-neutral-800 truncate leading-tight">
                  {textoCliente}
                </span>
              </div>
            )}

            {/* Equipo / Modelo */}
            {incluir_equipo && (
              <div className="flex items-center gap-1 min-w-0 truncate">
                <Smartphone size={isPrintable ? 8.5 : 10} className="text-neutral-700 shrink-0" />
                <span className="text-[10px] font-bold text-neutral-900 truncate leading-tight">
                  {deviceText || 'Dispositivo sin especificar'}
                </span>
              </div>
            )}

            {/* Falla Reportada */}
            {incluir_falla && (
              <div className="flex items-start gap-1 min-w-0">
                <AlertCircle size={isPrintable ? 8.5 : 10} className="text-neutral-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-neutral-600 line-clamp-2 leading-tight font-medium">
                  {mergedData.falla_reportada}
                </p>
              </div>
            )}

            {/* Técnico Asignado */}
            {incluir_tecnico && (
              <div className="text-[8.5px] font-semibold text-neutral-700 truncate leading-tight pt-0.5">
                Téc: <span className="font-semibold text-neutral-900">{mergedData.tecnico_asignado}</span>
              </div>
            )}
          </div>

          {/* Renderizado del Método de Desbloqueo (Alineado a la derecha, shrink-0) */}
          {showUnlock && (
            <div className="shrink-0 flex items-center justify-end">
              <UnlockMethodView
                datosAcceso={mergedData.datos_acceso}
                size={unlockSize}
                isPrintable={isPrintable}
                className={isPrintable ? 'shadow-none border-neutral-300' : ''}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabelPreview;
