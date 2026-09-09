import React from 'react';
import LabelPreview from '../common/LabelPreview';

export const DEFAULT_CONFIG_ETIQUETAS = {
  preset: '50x30', // '50x30' | '40x25' | '60x40' | 'manual'
  ancho_mm: 50,
  alto_mm: 30,
  orientacion: 'horizontal', // 'horizontal' | 'vertical'
  incluir_nombre_empresa: true,
  incluir_codigo_ticket: true,
  incluir_cliente: true,
  incluir_telefono: true,
  incluir_equipo: true,
  incluir_falla: true,
  incluir_fecha: true,
  incluir_tecnico: false,
  incluir_metodo_desbloqueo: true,
  tamano_fuente: 'md' // 'sm' | 'md' | 'lg'
};

/**
 * Componente Fuente Única de Verdad para Stickers / Etiquetas Adhesivas de Taller
 * Conecta los datos reales de la orden con la configuración de etiquetas de la sucursal.
 *
 * @param {Object} props
 * @param {Object} [props.servicio]   - Datos de la orden creada o servicio a imprimir
 * @param {Object} [props.config]     - Configuración de etiquetas (ancho_mm, alto_mm, orientacion, etc.)
 * @param {Object} [props.branch]     - Datos de la sucursal activa
 * @param {Object} [props.companyData]- Datos de la empresa
 * @param {boolean} [props.isPrintable]- True cuando se envía a la cola de impresión física
 */
export const StickerTermico = ({
  servicio = null,
  config = {},
  branch = null,
  companyData = null,
  isPrintable = false,
  className = ''
}) => {
  const normConfig = {
    ...DEFAULT_CONFIG_ETIQUETAS,
    ...(config && typeof config === 'object' ? config : {})
  };

  // Mapear datos de la orden/servicio al formato esperado por LabelPreview
  const clienteNombre = servicio?.cliente_nombre || servicio?.nombre_cliente || (servicio?.cliente ? `${servicio.cliente.nombre || ''} ${servicio.cliente.apellido || ''}`.trim() : 'Carlos Mendoza');
  const clienteTel = servicio?.telefono_cliente || servicio?.telefono_cliente_libre || servicio?.cliente?.telefono || '829-555-0149';

  const labelData = {
    codigo_ticket: servicio?.codigo_ticket || 'FMC-2026-0089',
    nombre_empresa: companyData?.nombre_empresa || 'FRANYER MOBILE',
    nombre_sucursal: branch?.nombre_sucursal || 'Sucursal Principal',
    nombre_cliente: clienteNombre,
    telefono_cliente: clienteTel,
    marca_equipo: servicio?.marca_equipo || 'Samsung',
    modelo_equipo: servicio?.modelo_equipo || 'Galaxy S23 Ultra',
    falla_reportada: servicio?.falla_reportada || 'Cambio de pantalla y revisión táctil',
    fecha_ingreso: servicio?.created_at
      ? new Date(servicio.created_at).toLocaleDateString('es-DO')
      : new Date().toLocaleDateString('es-DO'),
    tecnico_asignado: servicio?.tecnico_nombre || (servicio?.tecnicos_asignados && servicio.tecnicos_asignados[0]?.nombre) || 'Técnico Taller',
    datos_acceso: servicio?.datos_acceso_equipo || servicio?.datos_acceso || { tipo: 'patron', valor: '1-2-5-8-9' }
  };

  return (
    <LabelPreview
      config={normConfig}
      data={labelData}
      isPrintable={isPrintable}
      className={className}
    />
  );
};

export default StickerTermico;
