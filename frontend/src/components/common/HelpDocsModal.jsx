import React, { useState } from 'react';
import Modal from './Modal';
import AnimatedTabs from './AnimatedTabs';
import KeycapSequence from './KeycapSequence';
import packageJson from '../../../package.json';
import {
  ShieldQuestion,
  Keyboard,
  ShieldCheck,
  Workflow,
  Search,
  Wrench,
  Clock,
  ClipboardList,
  CheckCircle2,
  Shield,
  User,
  Users,
  DollarSign,
  PackageCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  X
} from 'lucide-react';

const TABS = [
  { id: 'shortcuts', label: 'Atajos de Teclado', icon: Keyboard },
  { id: 'roles', label: 'Roles y Permisos', icon: ShieldCheck },
  { id: 'flow', label: 'Flujo del Sistema', icon: Workflow }
];

const SHORTCUTS = [
  {
    category: 'Navegación y Búsqueda',
    items: [
      {
        keys: ['Ctrl', 'K'],
        description: 'Búsqueda global instantánea',
        detail: 'Abre y enfoca la búsqueda para encontrar órdenes, clientes o equipos desde cualquier pantalla.'
      },
      {
        keys: ['Alt', 'N'],
        description: 'Nueva orden de servicio',
        detail: 'Accede al wizard de recepción técnica de equipos de forma inmediata desde cualquier vista.'
      },
      {
        keys: ['Esc'],
        description: 'Cerrar diálogos y visores (LIFO)',
        detail: 'Cierra primero fotos ampliadas en visor y luego modales o menús activos sin perder tu trabajo.'
      },
      {
        keys: ['Tab'],
        description: 'Navegar entre campos',
        detail: 'Avanza secuencialmente a través de los inputs y botones interactivos.'
      }
    ]
  },
  {
    category: 'Operaciones en Formularios',
    items: [
      {
        keys: ['Ctrl', 'Enter'],
        description: 'Guardar y enviar formulario',
        detail: 'Confirma y envía fichas técnicas, diagnósticos o notas de recepción sin tener que usar el ratón.'
      },
      {
        keys: ['Enter'],
        description: 'Confirmar selección o búsqueda',
        detail: 'Ejecuta la acción principal en modales o confirma la consulta en inputs.'
      },
      {
        keys: ['Espacio'],
        description: 'Alternar casillas de verificación',
        detail: 'Marca o desmarca casillas en checklists de entrada, salida o componentes evaluados.'
      }
    ]
  }
];

const ROLES = [
  {
    name: 'Super Administrador',
    icon: ShieldCheck,
    scope: 'Alcance Global Multi-Sucursal',
    description: 'Control absoluto sobre toda la organización, sedes y configuración global.',
    capabilities: [
      'Visión consolidada y filtro multidivisión de todas las sucursales.',
      'Gestión financiera completa: ingresos, métricas de taller y reportes.',
      'Creación, edición y revocación de usuarios y asignación de roles.',
      'Configuración de la empresa, datos fiscales y parámetros del sistema.'
    ]
  },
  {
    name: 'Administrador de Sucursal',
    icon: Shield,
    scope: 'Limitado a su Sucursal Asignada',
    description: 'Responsable de la operación, rendimiento del equipo y finanzas de su sede.',
    capabilities: [
      'Supervisión del flujo completo de órdenes y personal de su sede.',
      'Acceso a métricas de ingresos, órdenes abiertas y tiempos de sucursal.',
      'Gestión de usuarios y colaboradores adscritos a su sucursal.',
      'Autorización de descuentos especiales y cierre de garantías locales.'
    ]
  },
  {
    name: 'Técnico Especialista',
    icon: Wrench,
    scope: 'Órdenes Asignadas y Banco de Trabajo',
    description: 'Enfocado en el diagnóstico, reparación y control de calidad de equipos.',
    capabilities: [
      'Mesa de trabajo y kanban interactivo de órdenes asignadas a él.',
      'Registro de diagnósticos técnicos, soluciones y costos de repuestos.',
      'Carga de evidencias fotográficas (PC, cámara o sincronización móvil).',
      'Sin acceso a caja, facturación ni métricas financieras globales.'
    ]
  },
  {
    name: 'Secretaria / Recepción',
    icon: ClipboardList,
    scope: 'Recepción, Clientes y Facturación',
    description: 'Front-desk de recepción, gestión de clientes y liquidación de servicios.',
    capabilities: [
      'Apertura ágil de órdenes de servicio en el wizard de 4 pasos.',
      'Directorio de clientes: registro, historial y contacto vía WhatsApp.',
      'Cobro de anticipos, liquidación de saldos y entrega de equipos.',
      'Impresión de tickets térmicos, comprobantes y stickers de serie.'
    ]
  }
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Recepción y Apertura',
    icon: ClipboardList,
    description: 'El cliente entrega el equipo. Se registran datos personales, especificaciones del dispositivo (marca, modelo, serie/IMEI), falla reportada, checklist de entrada, patrón o PIN y fotografías de evidencia.'
  },
  {
    step: '02',
    title: 'Diagnóstico & Presupuesto',
    icon: Search,
    description: 'El técnico asignado inspecciona el dispositivo en el banco de trabajo, determina las piezas requeridas y emite el presupuesto exacto y tiempo estimado de entrega para aprobación del cliente.'
  },
  {
    step: '03',
    title: 'En Reparación',
    icon: Wrench,
    description: 'Ejecución del servicio técnico, reemplazo de componentes y microelectrónica. Se registra la bitácora de avances y se adjuntan fotos del proceso para trazabilidad total.'
  },
  {
    step: '04',
    title: 'Control de Calidad',
    icon: CheckCircle2,
    description: 'Revisión técnica de post-reparación: verificación del checklist de salida (pantalla, táctil, carga, sonido, cámaras) para certificar que el equipo cumple con todos los estándares.'
  },
  {
    step: '05',
    title: 'Listo para Entrega',
    icon: PackageCheck,
    description: 'El equipo se resguarda en el área de retiro. El sistema envía una notificación automática al cliente avisando que su dispositivo está listo para ser recogido.'
  },
  {
    step: '06',
    title: 'Entregado & Garantía',
    icon: Sparkles,
    description: 'Recepción del pago pendiente o saldo, entrega del equipo con ticket térmico de liquidación y activación del período de garantía del servicio realizado.'
  }
];

export const HelpDocsModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('shortcuts');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Centro de Ayuda y Documentación"
      description="Guía rápida sobre atajos, roles de usuario y flujo operativo en SIGER-FMC"
      icon={<ShieldQuestion size={24} className="text-neutral-600 dark:text-neutral-400 shrink-0" />}
      maxWidth="max-w-6xl xl:max-w-7xl"
      height="h-[88vh] max-h-[840px]"
      bodyClassName="p-0 flex flex-col min-h-0 overflow-hidden"
    >
      {/* Barra de Pestañas (Tabs) homologada con Configuración */}
      <div className="px-5 sm:px-7 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 shrink-0 flex items-center justify-start">
        <AnimatedTabs
          items={TABS}
          value={activeTab}
          onChange={setActiveTab}
          size="sm"
          className="w-full sm:w-fit"
        />
      </div>

      {/* Contenido Dinámico de la Pestaña */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
        {/* TAB 1: ATAJOS DE TECLADO */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SHORTCUTS.map((cat, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-neutral-50/60 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 space-y-2.5"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-outfit px-1">
                    {cat.category}
                  </h4>
                  <div className="space-y-1">
                    {cat.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="group hover:bg-white dark:hover:bg-neutral-800/70 rounded-xl p-2.5 transition-colors cursor-default flex items-start justify-between gap-3 border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/70"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                            {item.description}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {item.detail}
                          </p>
                        </div>
                        <KeycapSequence keys={item.keys} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ROLES Y PERMISOS */}
        {activeTab === 'roles' && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Cada usuario cuenta con un perfil específico diseñado para maximizar la seguridad y la concentración en sus responsabilidades:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {ROLES.map((role, idx) => {
                const RoleIcon = role.icon;
                return (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group"
                  >
                    {/* Marca de agua decorativa ampliada, centrada verticalmente y con opacidad ultra sutil */}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-12 sm:-left-16 pointer-events-none select-none z-0 text-neutral-900 dark:text-neutral-100 opacity-[0.03] dark:opacity-[0.022] -rotate-6 transition-transform duration-300 group-hover:scale-105">
                      <RoleIcon size={215} strokeWidth={1.2} />
                    </div>

                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <RoleIcon size={19} className="text-neutral-600 dark:text-neutral-300 shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-outfit truncate">
                            {role.name}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500 font-medium truncate">
                            {role.scope}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {role.description}
                      </p>

                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block font-outfit">
                          Atribuciones Principales
                        </span>
                        <ul className="space-y-1.5">
                          {role.capabilities.map((cap, capIdx) => (
                            <li key={capIdx} className="text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0 mt-1.5" />
                              <span>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: FLUJO DEL SISTEMA */}
        {activeTab === 'flow' && (
          <div className="space-y-5 animate-fade-in">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Ciclo de vida estándar de una orden de servicio en el taller de Franyer Mobile Center:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {WORKFLOW_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group"
                  >
                    {/* Marca de agua decorativa en fondo izquierdo */}
                    <div className="absolute -left-4 -top-4 pointer-events-none select-none z-0 text-neutral-900 dark:text-neutral-100 opacity-[0.045] dark:opacity-[0.035] -rotate-6 transition-transform duration-300 group-hover:scale-105">
                      <StepIcon size={112} strokeWidth={1.4} />
                    </div>

                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StepIcon size={19} className="text-neutral-600 dark:text-neutral-300 shrink-0" />
                          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-outfit truncate">
                            {step.title}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 shrink-0">
                          {step.step}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer del Modal */}
      <div className="p-3 sm:p-4 px-5 sm:px-7 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 shrink-0 flex items-center justify-between">
        <span className="text-xs font-mono font-medium text-neutral-400 dark:text-neutral-500 select-none tracking-tight">
          v{packageJson.version}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
};

export default HelpDocsModal;
