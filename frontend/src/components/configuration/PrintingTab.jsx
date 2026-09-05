import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateBranch } from '../../services/configuracion.service';
import LabelPreview, { SvgQRCode } from '../common/LabelPreview';
import Select from '../common/Select';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { sileo } from 'sileo';
import {
  Printer,
  Tag,
  Receipt,
  Save,
  Check,
  CheckCircle2,
  Sparkles,
  Layers,
  Settings2,
  Sliders,
  HelpCircle,
  Eye,
  FileCheck2,
  Building2,
  FileText,
  QrCode,
  Barcode,
  RotateCw,
  Maximize2
} from 'lucide-react';

const DEFAULT_CONFIG_TICKETS = {
  ancho_papel_mm: 80, // 80 | 58
  mostrar_logo: true,
  mostrar_datos_empresa: true,
  mostrar_datos_sucursal: true,
  mostrar_cliente: true,
  mostrar_equipo: true,
  mostrar_falla: true,
  mostrar_observaciones: true,
  mostrar_desglose_costos: true,
  mostrar_garantia: true,
  mostrar_qr_consulta: true,
  mostrar_mensaje_cortesia: true,
  terminos_garantia: 'Garantía válida únicamente presentando este comprobante. No cubre caídas, humedad, sellos rotos ni manipulación por terceros.',
  mensaje_cortesia: '¡Gracias por su preferencia! Su equipo está en manos de profesionales certificados.',
  tamano_fuente: 'md' // 'sm' | 'md' | 'lg'
};

const DEFAULT_CONFIG_ETIQUETAS = {
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

const SIZE_PRESETS = [
  { id: '50x30', label: '50 × 30 mm', ancho: 50, alto: 30 },
  { id: '40x25', label: '40 × 25 mm', ancho: 40, alto: 25 },
  { id: '60x40', label: '60 × 40 mm', ancho: 60, alto: 40 },
  { id: 'manual', label: 'Personalizado', ancho: 50, alto: 30 }
];

/**
 * Componente visual de vista previa para Comprobante Térmico POS (80mm / 58mm)
 */
const ThermalTicketPreview = ({ config, branch, companyData }) => {
  const is58mm = Number(config.ancho_papel_mm) === 58;

  return (
    <div className="flex justify-center select-none">
      <div
        className={`bg-white text-black px-4 pt-7 pb-8 rounded-xl shadow-md border border-neutral-300 dark:border-neutral-700 transition-all font-mono text-xs ${
          is58mm ? 'w-[260px]' : 'w-[320px]'
        }`}
        style={{
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Cabecera del Ticket */}
        <div className="text-center space-y-1 border-b border-dashed border-neutral-400 pb-3 mb-2">
          {config.mostrar_logo && companyData?.logo_url && (
            <div className="flex justify-center mb-1">
              <img
                src={companyData.logo_url}
                alt={companyData?.nombre_empresa || 'Logotipo'}
                className="max-h-12 max-w-[140px] mx-auto mb-2 object-contain grayscale contrast-150"
              />
            </div>
          )}

          {config.mostrar_datos_empresa && (
            <>
              <div className="font-bold uppercase text-[13px]">
                {companyData?.nombre_empresa || 'FRANYER MOBILE CENTER, S.R.L.'}
              </div>
              <div className="text-[10px] text-neutral-600">
                RNC: {companyData?.rnc || '133-18964-1'}
              </div>
            </>
          )}

          {config.mostrar_datos_sucursal && (
            <div className="text-[10.5px] text-neutral-700 font-sans mt-0.5">
              <span className="font-semibold">{branch?.nombre_sucursal || 'Sucursal Principal'}</span>
              <br />
              <span className="text-[9.5px]">{branch?.direccion || 'San Francisco de Macorís'}</span>
              <br />
              <span className="text-[9.5px]">Tel: {branch?.telefono || '849-342-1998'}</span>
            </div>
          )}
        </div>

        {/* Metadatos de la Orden */}
        <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10.5px] space-y-0.5">
          <div className="flex justify-between font-bold text-xs text-neutral-900">
            <span>TICKET:</span>
            <span>FMC-2026-0089</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Fecha Recepción:</span>
            <span>05/09/2026 10:30 AM</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Estado:</span>
            <span className="font-semibold uppercase text-neutral-800">Recibido en Taller</span>
          </div>
        </div>

        {/* Datos del Cliente */}
        {config.mostrar_cliente && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10px] space-y-0.5">
            <div className="font-bold text-[10.5px] uppercase">Cliente:</div>
            <div className="text-neutral-800 font-sans font-semibold">Carlos Manuel Mendoza</div>
            <div className="flex justify-between text-neutral-600">
              <span>Tel: 829-555-0149</span>
              <span>Céd: 056-0012345-6</span>
            </div>
          </div>
        )}

        {/* Datos del Dispositivo y Falla */}
        {(config.mostrar_equipo || config.mostrar_falla || config.mostrar_observaciones) && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10px] space-y-1">
            {config.mostrar_equipo && (
              <div>
                <span className="font-bold">Equipo: </span>
                <span className="font-sans font-semibold">Samsung Galaxy S23 Ultra</span>
                <div className="text-[9px] text-neutral-500">IMEI/Serie: 354892019482019</div>
              </div>
            )}

            {config.mostrar_falla && (
              <div>
                <span className="font-bold">Falla: </span>
                <span className="text-neutral-700">Pantalla rota sin imagen tras fuerte impacto.</span>
              </div>
            )}

            {config.mostrar_observaciones && (
              <div className="text-[9px] text-neutral-600 italic">
                Obs: Rayones menores en bisel, protector de cámara puesto.
              </div>
            )}
          </div>
        )}

        {/* Desglose Financiero */}
        {config.mostrar_desglose_costos && (
          <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 text-[10.5px] space-y-1">
            <div className="flex justify-between">
              <span>Costo Estimado:</span>
              <span>RD$ 4,500.00</span>
            </div>
            <div className="flex justify-between text-neutral-900 font-semibold">
              <span>Anticipo Recibido:</span>
              <span>- RD$ 1,500.00</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-neutral-300">
              <span>SALDO PENDIENTE:</span>
              <span>RD$ 3,000.00</span>
            </div>
          </div>
        )}

        {/* Código QR de Consulta Web */}
        {config.mostrar_qr_consulta && (
          <div className="text-center my-3 flex flex-col items-center">
            <div className="p-2 border border-neutral-300 rounded-lg bg-white w-40 h-40 flex items-center justify-center mx-auto shrink-0">
              <SvgQRCode className="w-full h-full text-black" />
            </div>
            <div className="mt-3 text-center space-y-0.5">
              <span className="block text-[9px] text-neutral-600 font-sans">
                Escanea para consultar el estado en vivo
              </span>
              <div className="font-mono font-bold text-[10px] text-neutral-900">
                Código: FMC-2026-0089
              </div>
              <div className="font-mono text-[10px] text-neutral-700 tracking-tight">
                www.franyermobile.com/status
              </div>
            </div>
          </div>
        )}

        {/* Cláusula de Garantía */}
        {config.mostrar_garantia && config.terminos_garantia && (
          <div className="border-t border-dashed border-neutral-400 pt-2 mb-2 text-[8.5px] text-neutral-600 text-center leading-tight font-sans">
            <div className="font-bold uppercase text-[9px] text-neutral-800 mb-0.5">
              Condiciones de Garantía
            </div>
            {config.terminos_garantia}
          </div>
        )}

        {/* Mensaje de Cortesía */}
        {config.mostrar_mensaje_cortesia && config.mensaje_cortesia && (
          <div className="text-center text-[9.5px] font-sans font-semibold text-neutral-800 pt-1">
            {config.mensaje_cortesia}
          </div>
        )}

        {/* Simulación de Corte de Papel */}
        <div className="mt-3 pt-2 border-t-2 border-dotted border-neutral-400 text-center text-[8px] text-neutral-400 uppercase tracking-widest font-mono">
          - - - CORTE DE TICKET - - -
        </div>
      </div>
    </div>
  );
};

export const PrintingTab = ({ branches = [], companyData, onRefresh }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.rol_nombre === 'SuperAdmin';
  const userBranchId = user?.sucursal_id;

  // Selección de sucursal
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (!isSuperAdmin && userBranchId) return userBranchId;
    return branches.length > 0 ? branches[0].id : null;
  });

  const activeBranch = useMemo(() => {
    return branches.find((b) => b.id === Number(selectedBranchId)) || branches[0] || null;
  }, [branches, selectedBranchId]);

  // Modos de vista previa: 'etiqueta' (Sticker) | 'ticket' (Térmico)
  const [previewMode, setPreviewMode] = useState('etiqueta');

  // Estados de configuración para tickets y etiquetas
  const [ticketsConfig, setTicketsConfig] = useState(DEFAULT_CONFIG_TICKETS);
  const [etiquetasConfig, setEtiquetasConfig] = useState(DEFAULT_CONFIG_ETIQUETAS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincronizar estado cuando cambia la sucursal seleccionada
  useEffect(() => {
    if (activeBranch) {
      const branchTickets = activeBranch.config_tickets && typeof activeBranch.config_tickets === 'object' && Object.keys(activeBranch.config_tickets).length > 0
        ? activeBranch.config_tickets
        : {};

      const branchEtiquetas = activeBranch.config_etiquetas && typeof activeBranch.config_etiquetas === 'object' && Object.keys(activeBranch.config_etiquetas).length > 0
        ? activeBranch.config_etiquetas
        : {};

      const cleanBranchEtiquetas = {
        ...DEFAULT_CONFIG_ETIQUETAS,
        ...branchEtiquetas
      };
      delete cleanBranchEtiquetas.formato_codigo;

      setTicketsConfig({
        ...DEFAULT_CONFIG_TICKETS,
        ...branchTickets
      });

      setEtiquetasConfig(cleanBranchEtiquetas);
    }
  }, [activeBranch]);

  // Verificar si hay modificaciones pendientes
  const hasChanges = useMemo(() => {
    if (!activeBranch) return false;
    const origTickets = activeBranch.config_tickets || {};
    const origEtiquetas = { ...(activeBranch.config_etiquetas || {}) };
    delete origEtiquetas.formato_codigo;

    return (
      JSON.stringify(ticketsConfig) !== JSON.stringify({ ...DEFAULT_CONFIG_TICKETS, ...origTickets }) ||
      JSON.stringify(etiquetasConfig) !== JSON.stringify({ ...DEFAULT_CONFIG_ETIQUETAS, ...origEtiquetas })
    );
  }, [ticketsConfig, etiquetasConfig, activeBranch]);

  // Manejadores para Ticket Térmico
  const handleTicketChange = (field, value) => {
    setTicketsConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Manejadores para Etiquetas Adhesivas
  const handleEtiquetaChange = (field, value) => {
    setEtiquetasConfig((prev) => {
      const updated = { ...prev, [field]: value };
      // Si cambia el preset, actualizar dimensiones automáticamente
      if (field === 'preset') {
        const found = SIZE_PRESETS.find((p) => p.id === value);
        if (found && value !== 'manual') {
          updated.ancho_mm = found.ancho;
          updated.alto_mm = found.alto;
        }
      }
      return updated;
    });
  };

  // Guardar configuraciones en la sucursal activa
  const handleSave = async () => {
    if (!activeBranch) return;

    setIsSubmitting(true);
    try {
      const payload = {
        telefono: activeBranch.telefono,
        direccion: activeBranch.direccion,
        config_tickets: ticketsConfig,
        config_etiquetas: etiquetasConfig
      };

      if (isSuperAdmin) {
        payload.codigo_sucursal = activeBranch.codigo_sucursal;
        payload.nombre_sucursal = activeBranch.nombre_sucursal;
      }

      const res = await updateBranch(activeBranch.id, payload);

      sileo.success({
        title: 'Configuración guardada',
        description: `Las preferencias de impresión para ${activeBranch.nombre_sucursal} han sido actualizadas con éxito.`
      });

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error al guardar configuración de impresión:', error);
      const msg = error.response?.data?.message || 'No se pudo guardar la configuración de impresión.';
      sileo.error({
        title: 'Error al guardar',
        description: msg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Impresión de prueba
  const handleTestPrint = () => {
    sileo.info({
      title: 'Impresión de prueba',
      description: `Generando documento de prueba para ${previewMode === 'etiqueta' ? 'Sticker adhesivo' : 'Comprobante térmico'}...`
    });

    // Abrir diálogo de impresión nativo del navegador
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const branchOptions = branches.map((b) => ({
    id: b.id,
    label: `${b.codigo_sucursal} - ${b.nombre_sucursal}`,
    supportingText: b.direccion
  }));

  return (
    <div className="space-y-6">
      {/* Selector de Sucursal para SuperAdmin o Badge Informativo para Admin_Sucursal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <Printer size={18} />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
              Configuración de Formatos de Impresión
            </h3>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-inter">
            Personalice el diseño, campos visibles y dimensiones de los comprobantes térmicos y stickers de taller por sucursal.
          </p>
        </div>

        {/* Selector de Sede */}
        <div className="w-full sm:w-72 shrink-0">
          {isSuperAdmin && branches.length > 1 ? (
            <Select
              label="Sucursal a Configurar"
              items={branchOptions}
              value={selectedBranchId}
              onChange={(val) => setSelectedBranchId(val)}
              placeholder="Seleccionar sucursal..."
              className="w-full"
            />
          ) : (
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider mb-1">
                Sede Activa
              </span>
              <Badge variant="neutral" icon={Building2} size="md">
                {activeBranch ? `${activeBranch.codigo_sucursal} · ${activeBranch.nombre_sucursal}` : 'Cargando sede...'}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Grid Principal de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Formularios de Configuración (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECCIÓN 1: Etiquetas Adhesivas (Stickers de Taller) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <Tag size={17} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
                    Stickers Adhesivos de Taller
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter">
                    Etiquetas térmicas fijadas en los dispositivos recibidos para trazabilidad física.
                  </p>
                </div>
              </div>
            </div>

            {/* Selector de Presets de Tamaño */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Preset de Tamaño de Etiqueta
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleEtiquetaChange('preset', preset.id)}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-semibold ${
                      etiquetasConfig.preset === preset.id
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimensiones Manuales si el preset es manual */}
            {etiquetasConfig.preset === 'manual' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Ancho (mm)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={100}
                    value={etiquetasConfig.ancho_mm}
                    onChange={(e) => handleEtiquetaChange('ancho_mm', parseInt(e.target.value, 10) || 50)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Alto (mm)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={80}
                    value={etiquetasConfig.alto_mm}
                    onChange={(e) => handleEtiquetaChange('alto_mm', parseInt(e.target.value, 10) || 30)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Orientación del Sticker */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Orientación del Sticker
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEtiquetaChange('orientacion', 'horizontal')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    etiquetasConfig.orientacion === 'horizontal'
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  Horizontal
                </button>
                <button
                  type="button"
                  onClick={() => handleEtiquetaChange('orientacion', 'vertical')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    etiquetasConfig.orientacion === 'vertical'
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  Vertical
                </button>
              </div>
            </div>

            {/* Toggles de Campos Visibles en el Sticker */}
            <div className="space-y-2.5 pt-2">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Campos a Imprimir en el Sticker
              </label>

              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {[
                  { key: 'incluir_nombre_empresa', label: 'Nombre de Empresa / Sede' },
                  { key: 'incluir_codigo_ticket', label: 'Código de Ticket (#)' },
                  { key: 'incluir_cliente', label: 'Nombre del Cliente' },
                  { key: 'incluir_telefono', label: 'Teléfono de Contacto' },
                  { key: 'incluir_equipo', label: 'Marca y Modelo de Equipo' },
                  { key: 'incluir_falla', label: 'Falla o Problema Reportado' },
                  { key: 'incluir_fecha', label: 'Fecha de Recepción' },
                  { key: 'incluir_tecnico', label: 'Técnico Asignado' },
                  { key: 'incluir_metodo_desbloqueo', label: 'Método de Desbloqueo (PIN/Patrón)' }
                ].map((item) => {
                  const isChecked = Boolean(etiquetasConfig[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleEtiquetaChange(item.key, !isChecked)}
                      className={`rounded-xl py-2 px-3.5 sm:px-4 text-xs font-semibold transition-all cursor-pointer select-none border text-center ${
                        isChecked
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-600 text-rose-700 dark:text-rose-300 shadow-2xs'
                          : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Comprobantes Térmicos (Tickets POS) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <Receipt size={17} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
                    Comprobantes Térmicos
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter">
                    Recibo entregado al cliente al ingresar su equipo al taller técnico.
                  </p>
                </div>
              </div>
            </div>

            {/* Ancho de Rollo Térmico */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                Ancho de Rollo de Impresora Térmica
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTicketChange('ancho_papel_mm', 80)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                    Number(ticketsConfig.ancho_papel_mm) === 80
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  80 mm
                </button>

                <button
                  type="button"
                  onClick={() => handleTicketChange('ancho_papel_mm', 58)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                    Number(ticketsConfig.ancho_papel_mm) === 58
                      ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  58 mm
                </button>
              </div>
            </div>

            {/* Toggles de Contenido del Ticket */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                Secciones Visibles en el Ticket
              </label>

              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {[
                  { key: 'mostrar_logo', label: 'Logotipo de la Empresa' },
                  { key: 'mostrar_datos_empresa', label: 'Razón Social y RNC' },
                  { key: 'mostrar_datos_sucursal', label: 'Dirección y Teléfono de Sede' },
                  { key: 'mostrar_cliente', label: 'Datos del Cliente (Nombre/Tel/Céd)' },
                  { key: 'mostrar_equipo', label: 'Equipo y Número de Serie / IMEI' },
                  { key: 'mostrar_falla', label: 'Diagnóstico / Falla Inicial' },
                  { key: 'mostrar_observaciones', label: 'Observaciones Estéticas' },
                  { key: 'mostrar_desglose_costos', label: 'Desglose Financiero y Anticipo' },
                  { key: 'mostrar_qr_consulta', label: 'Código QR para Rastreo Online' },
                  { key: 'mostrar_garantia', label: 'Cláusula de Garantía' }
                ].map((item) => {
                  const isChecked = Boolean(ticketsConfig[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleTicketChange(item.key, !isChecked)}
                      className={`rounded-xl py-2 px-3.5 sm:px-4 text-xs font-semibold transition-all cursor-pointer select-none border text-center ${
                        isChecked
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-600 text-rose-700 dark:text-rose-300 shadow-2xs'
                          : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cláusula de Términos de Garantía */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Términos y Cláusula de Garantía
              </label>
              <textarea
                value={ticketsConfig.terminos_garantia}
                onChange={(e) => handleTicketChange('terminos_garantia', e.target.value)}
                rows={3}
                placeholder="Garantía válida únicamente con este comprobante..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-neutral-100/10 resize-none font-inter"
              />
            </div>

            {/* Mensaje de Despedida / Cortesía */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Mensaje de Cortesía al Pie
              </label>
              <input
                type="text"
                value={ticketsConfig.mensaje_cortesia}
                onChange={(e) => handleTicketChange('mensaje_cortesia', e.target.value)}
                placeholder="¡Gracias por confiar en Franyer Mobile Center!"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-neutral-100/10 font-inter"
              />
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Vista Previa Fija en Vivo y Acciones (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
            {/* Header de Vista Previa con Selector Centrado */}
            <div className="flex justify-center border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
              <div className="flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode('etiqueta')}
                  className={`px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    previewMode === 'etiqueta'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  Sticker Taller
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('ticket')}
                  className={`px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    previewMode === 'ticket'
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  Ticket Térmico
                </button>
              </div>
            </div>

            {/* Contenedor del Preview Visual */}
            <div className="p-4 sm:p-6 rounded-xl bg-neutral-100/80 dark:bg-neutral-950/60 border border-neutral-200/60 dark:border-neutral-800/80 flex items-center justify-center min-h-[290px] overflow-hidden">
              {previewMode === 'etiqueta' ? (
                <div className="w-full flex justify-center">
                  <LabelPreview
                    config={etiquetasConfig}
                    data={{
                      nombre_sucursal: activeBranch?.nombre_sucursal || 'Sucursal SFM',
                      nombre_empresa: companyData?.nombre_empresa || 'FRANYER MOBILE'
                    }}
                  />
                </div>
              ) : (
                <div className="w-full flex justify-center">
                  <ThermalTicketPreview
                    config={ticketsConfig}
                    branch={activeBranch}
                    companyData={companyData}
                  />
                </div>
              )}
            </div>

            {/* Metadatos informativos bajo la vista previa */}
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between">
              <span>Sede: <strong>{activeBranch?.nombre_sucursal || 'N/A'}</strong></span>
              <span>
                {previewMode === 'etiqueta'
                  ? `${etiquetasConfig.ancho_mm}×${etiquetasConfig.alto_mm}mm (${etiquetasConfig.orientacion})`
                  : `${ticketsConfig.ancho_papel_mm}mm Rollo POS`}
              </span>
            </div>

            {/* Botones de Acción */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleTestPrint}
                icon={Printer}
                className="w-full sm:flex-1"
              >
                Imprimir Prueba
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSave}
                disabled={isSubmitting || !hasChanges}
                isLoading={isSubmitting}
                icon={Save}
                className="w-full sm:flex-1"
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingTab;
