import React from 'react';
import {
  X,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ExternalLink,
  Pencil,
  Hash,
  AtSign,
  Store,
  ShieldCheck,
  Shield,
  ClipboardList,
  Wrench,
  User
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import SimpleButton from '../common/SimpleButton';

/**
 * Mapeo de configuración visual según el rol
 */
const getRoleConfig = (rolNombre) => {
  const normalized = (rolNombre || '').toLowerCase().replace(/[\s_-]/g, '');
  if (normalized.includes('superadmin')) {
    return {
      label: 'Super Admin',
      icon: ShieldCheck,
      color: 'danger'
    };
  }
  if (normalized.includes('admin')) {
    return {
      label: 'Admin Sucursal',
      icon: Shield,
      color: 'warning'
    };
  }
  if (normalized.includes('secretaria')) {
    return {
      label: 'Secretaria',
      icon: ClipboardList,
      color: 'purple'
    };
  }
  if (normalized.includes('tecnic')) {
    return {
      label: 'Técnico',
      icon: Wrench,
      color: 'info'
    };
  }
  return {
    label: rolNombre || 'Sin Rol',
    icon: User,
    color: 'neutral'
  };
};

/**
 * Limpia y normaliza el teléfono para enlaces de WhatsApp
 */
const cleanPhoneForWa = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `1${digits}`;
  }
  return digits;
};

/**
 * Formatea un número de teléfono de 10 dígitos al formato legible
 */
const formatPhoneLegible = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

/**
 * Obtiene las iniciales del nombre y apellido
 */
const getInitials = (nombre = '', apellido = '') => {
  const n = String(nombre).trim().charAt(0).toUpperCase();
  const a = String(apellido).trim().charAt(0).toUpperCase();
  return `${n}${a}` || 'US';
};

/**
 * Formatea una fecha ISO a formato legible y conciso
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

export const UsuarioDetalleModal = ({
  isOpen,
  onClose,
  usuario = null,
  user = null,
  worker = null,
  onEdit = null
}) => {
  const target = usuario || user || worker;

  if (!isOpen || !target) return null;

  const fullName = `${target.nombre || ''} ${target.apellido || ''}`.trim() || 'Usuario Sin Nombre';
  const initials = getInitials(target.nombre, target.apellido);
  const formattedDate = formatDate(target.created_at);
  const roleConfig = getRoleConfig(target.rol_nombre);
  const RoleIcon = roleConfig.icon;

  const customHeader = (
    <div className="p-5 sm:p-6 pb-4 shrink-0 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-start justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        {/* Avatar cuadrado redondeado con iniciales o foto */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xl sm:text-2xl shrink-0 border border-red-200/60 dark:border-red-900/40 font-outfit shadow-xs overflow-hidden relative">
          {target.foto_perfil_url ? (
            <img
              src={target.foto_perfil_url}
              alt={fullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector('.user-avatar-fallback');
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          ) : null}
          <span className={`user-avatar-fallback ${target.foto_perfil_url ? 'hidden' : ''}`}>
            {initials}
          </span>
        </div>

        <div className="min-w-0 space-y-1">
          {/* Primera línea: Nombre + Badge Estado + Badge Rol */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold font-outfit text-neutral-900 dark:text-neutral-100 leading-tight break-words">
              {fullName}
            </h2>
            <Badge
              variant="minimal"
              color={roleConfig.color}
              icon={RoleIcon}
              size="sm"
              className="font-semibold"
            >
              {roleConfig.label}
            </Badge>
            <Badge
              variant="minimal"
              color={target.activo ? 'success' : 'neutral'}
              icon={target.activo ? CheckCircle2 : XCircle}
              size="sm"
              className="font-semibold"
            >
              {target.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>

          {/* Segunda línea: ID limpio y Fecha de Registro */}
          <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter mt-1">
            <span className="inline-flex items-center gap-1">
              <Hash size={13} className="shrink-0 text-neutral-400" />
              <span>ID: {target.id}</span>
            </span>
            <span className="text-neutral-300 dark:text-neutral-700 font-bold">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="shrink-0 text-neutral-400" />
              <span>Registrado: {formattedDate}</span>
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
        title="Cerrar modal"
        aria-label="Cerrar"
      >
        <X size={18} />
      </button>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-2.5 w-full">
      <Button
        variant="secondary"
        onClick={onClose}
      >
        Cerrar
      </Button>
      {onEdit && (
        <Button
          variant="primary"
          icon={Pencil}
          onClick={() => {
            onClose?.();
            onEdit(target);
          }}
        >
          Editar Usuario
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      customHeader={customHeader}
      footer={footer}
      size="lg"
      height="h-auto max-h-[90vh]"
      bodyClassName="p-5 sm:p-6"
    >
      <div className="space-y-4">
        {/* Título de Sección */}
        <div className="pb-1 border-b border-neutral-100 dark:border-neutral-800/80">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-outfit">
            INFORMACIÓN DEL COLABORADOR Y ACCESO
          </span>
        </div>

        {/* Cuadrícula de Datos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Nombre de Usuario / Username */}
          <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-inter">
              <AtSign size={13} className="text-red-500" />
              Nombre de Usuario
            </span>
            <p className="text-sm font-bold font-mono text-neutral-800 dark:text-neutral-200 tracking-wide">
              {target.usuario ? `@${target.usuario}` : (
                <span className="text-neutral-400 dark:text-neutral-500 font-normal italic font-inter text-xs">
                  No asignado
                </span>
              )}
            </p>
          </div>

          {/* 2. Cédula de Identidad / Documento */}
          <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-inter">
              <CreditCard size={13} className="text-red-500" />
              Cédula / Documento
            </span>
            <p className="text-sm font-bold font-mono text-neutral-800 dark:text-neutral-200 tracking-wide">
              {target.cedula || (
                <span className="text-neutral-400 dark:text-neutral-500 font-normal italic font-inter text-xs">
                  Sin documento
                </span>
              )}
            </p>
          </div>

          {/* 3. Teléfono de Contacto */}
          <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-inter">
              <Phone size={13} className="text-red-500" />
              Teléfono de Contacto
            </span>
            {target.telefono ? (
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-sm font-bold font-mono text-neutral-800 dark:text-neutral-200">
                  {formatPhoneLegible(target.telefono)}
                </span>
                <SimpleButton
                  icon={MessageSquare}
                  variant="success"
                  size="xs"
                  onClick={() => window.open(`https://wa.me/${cleanPhoneForWa(target.telefono)}`, '_blank', 'noopener,noreferrer')}
                  title="Abrir chat en WhatsApp"
                >
                  WhatsApp
                </SimpleButton>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic pt-0.5">No registrado</p>
            )}
          </div>

          {/* 4. Correo Electrónico */}
          <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-inter">
              <Mail size={13} className="text-red-500" />
              Correo Electrónico
            </span>
            {target.correo ? (
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-sm font-medium font-inter text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">
                  {target.correo}
                </span>
                <SimpleButton
                  icon={ExternalLink}
                  size="xs"
                  onClick={() =>
                    window.open(
                      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(target.correo)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  title="Redactar correo en Gmail (nueva pestaña)"
                >
                  Redactar
                </SimpleButton>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic pt-0.5">No registrado</p>
            )}
          </div>

          {/* 5. Rol en el Sistema */}
          <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-inter">
              <RoleIcon size={13} className="text-red-500" />
              Rol en el Sistema
            </span>
            <div className="pt-0.5">
              <Badge
                variant="minimal"
                color={roleConfig.color}
                icon={RoleIcon}
                className="font-semibold text-xs"
              >
                {roleConfig.label}
              </Badge>
            </div>
          </div>

          {/* 6. Sucursal / Sede Asignada */}
          <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-inter">
              <Store size={13} className="text-red-500" />
              Sucursal / Sede Asignada
            </span>
            <p className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 font-inter pt-0.5">
              {target.sucursal_nombre || 'Todas las Sucursales (Global)'}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UsuarioDetalleModal;
