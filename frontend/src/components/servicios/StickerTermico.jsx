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

export const DEFAULT_MOCK_STICKER_SERVICE = {
  codigo_ticket: 'FMC-2026-0089',
  fecha_recepcion: '2026-09-09T16:00:00.000Z',
  created_at: '2026-09-09T16:00:00.000Z',
  nombre_cliente: 'Carlos Mendoza',
  telefono_cliente: '829-555-0149',
  marca_equipo: 'Samsung',
  modelo_equipo: 'Galaxy S23 Ultra',
  falla_reportada: 'Cambio de pantalla y revisión táctil',
  tecnico_nombre: 'Carlos Técnico',
  tecnico_asignado: 'Carlos Técnico',
  datos_acceso_equipo: {
    tipo: 'patron',
    metodo: 'patron',
    patron: [0, 1, 4, 7, 8],
    valor: '1-2-5-8-9'
  }
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

  const s = servicio || DEFAULT_MOCK_STICKER_SERVICE;

  // Mapear datos de la orden/servicio al formato esperado por LabelPreview
  const clienteNombre = s.cliente_nombre || s.nombre_cliente || (s.cliente ? `${s.cliente.nombre || ''} ${s.cliente.apellido || ''}`.trim() : '');
  const clienteTel = s.cliente_telefono || s.telefono_cliente || s.telefono_cliente_libre || s.cliente?.telefono || '';

  const labelData = {
    codigo_ticket: s.codigo_ticket || 'FMC-2026-0089',
    nombre_empresa: companyData?.nombre_empresa || 'FRANYER MOBILE',
    nombre_sucursal: branch?.nombre_sucursal || 'Sucursal Principal',
    nombre_cliente: clienteNombre,
    cliente_nombre: clienteNombre,
    telefono_cliente: clienteTel,
    cliente_telefono: clienteTel,
    marca_equipo: s.marca_equipo || '',
    modelo_equipo: s.modelo_equipo || '',
    falla_reportada: s.falla_reportada || '',
    fecha_ingreso: s.created_at
      ? new Date(s.created_at).toLocaleDateString('es-DO')
      : new Date().toLocaleDateString('es-DO'),
    tecnico_asignado: s.tecnico_nombre ?? s.tecnico ?? s.tecnicos?.[0]?.nombre_completo ?? s.tecnicos?.[0]?.nombre ?? (s.tecnicos_asignados && s.tecnicos_asignados[0]?.nombre) ?? 'Sin asignar',
    datos_acceso: s.datos_acceso_equipo ?? s.datos_acceso ?? { tipo: 'ninguno', valor: null }
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
