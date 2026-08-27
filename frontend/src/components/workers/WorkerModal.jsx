import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { createWorker, updateWorker } from '../../services/workers.service';
import { useAuth } from '../../context/AuthContext';
import { sileo } from 'sileo';
import { MorphIcon } from 'morphicons/react';
import { Eye, EyeOff } from 'lucide';

const INITIAL_FORM_STATE = {
  nombre: '',
  apellido: '',
  usuario: '',
  cedula: '',
  telefono: '',
  correo: '',
  password: '',
  rol_id: '',
  sucursal_id: '',
  foto_perfil_url: ''
};

const formatRoleName = (rolNombre) => {
  switch (rolNombre) {
    case 'SuperAdmin':
      return 'Super Admin';
    case 'Admin_Sucursal':
      return 'Admin Sucursal';
    case 'Secretaria':
      return 'Secretaria';
    case 'Tecnico':
      return 'Técnico';
    default:
      return rolNombre || 'Sin Rol';
  }
};

const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.sucursales)) return res.data.sucursales;
  if (Array.isArray(res?.sucursales)) return res.sucursales;
  if (Array.isArray(res?.data?.roles)) return res.data.roles;
  if (Array.isArray(res?.roles)) return res.roles;
  return [];
};

const WorkerModal = ({
  isOpen,
  onClose,
  worker,
  onSuccess,
  onSave,
  roles = [],
  sucursales = []
}) => {
  const { user: currentUser } = useAuth();
  const isBranchAdmin = currentUser?.rol_nombre === 'Admin_Sucursal';

  const sucursalesList = extractArray(sucursales);
  const rolesList = extractArray(roles);

  // RBAC: Administradores de sucursal solo pueden ver roles Técnico y Secretaria
  const availableRoles = useMemo(() => {
    if (isBranchAdmin) {
      return rolesList.filter((r) => ['Tecnico', 'Secretaria'].includes(r.nombre_rol || r.nombre));
    }
    return rolesList;
  }, [rolesList, isBranchAdmin]);

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = Boolean(worker && worker.id);
  const selectedRoleObj = availableRoles.find((r) => String(r.id) === String(formData.rol_id)) || rolesList.find((r) => String(r.id) === String(formData.rol_id));
  const isSuperAdminRole = selectedRoleObj?.nombre_rol === 'SuperAdmin';

  const hasChanges = !isEdit || Boolean(
    formData.nombre.trim() !== (worker?.nombre || '').trim() ||
    formData.apellido.trim() !== (worker?.apellido || '').trim() ||
    formData.usuario.trim().toLowerCase() !== (worker?.usuario || '').trim().toLowerCase() ||
    formData.cedula.replace(/\D/g, '') !== String(worker?.cedula || '').replace(/\D/g, '') ||
    formData.telefono.replace(/\D/g, '') !== String(worker?.telefono || '').replace(/\D/g, '') ||
    formData.correo.trim().toLowerCase() !== (worker?.correo || '').trim().toLowerCase() ||
    String(formData.rol_id || '') !== String(worker?.rol_id || '') ||
    String(formData.sucursal_id || '') !== String(worker?.sucursal_id || '') ||
    Boolean(formData.password && formData.password.trim().length > 0) ||
    (formData.foto_perfil_url || '').trim() !== (worker?.foto_perfil_url || '').trim()
  );

  useEffect(() => {
    if (worker && isEdit) {
      setFormData({
        nombre: worker.nombre || '',
        apellido: worker.apellido || '',
        usuario: worker.usuario ? String(worker.usuario).replace(/\s/g, '') : '',
        cedula: worker.cedula ? String(worker.cedula).replace(/\D/g, '') : '',
        telefono: worker.telefono ? String(worker.telefono).replace(/\D/g, '') : '',
        correo: worker.correo ? String(worker.correo).replace(/\s/g, '') : '',
        password: '',
        rol_id: worker.rol_id ? String(worker.rol_id) : '',
        sucursal_id: isBranchAdmin
          ? String(currentUser?.sucursal_id || worker.sucursal_id || '')
          : (worker.sucursal_id ? String(worker.sucursal_id) : ''),
        foto_perfil_url: worker.foto_perfil_url || ''
      });
    } else {
      setFormData({
        ...INITIAL_FORM_STATE,
        rol_id: availableRoles.length > 0 ? String(availableRoles[0].id) : '',
        sucursal_id: isBranchAdmin
          ? String(currentUser?.sucursal_id || '')
          : (sucursalesList.length > 0 ? String(sucursalesList[0].id) : '')
      });
    }
    setErrors({});
    setShowPassword(false);
  }, [worker, isEdit, isOpen, roles, sucursales, isBranchAdmin, currentUser]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'cedula' || name === 'telefono') {
      value = value.replace(/\D/g, '');
    }
    if (name === 'usuario' || name === 'correo' || name === 'password') {
      value = value.replace(/\s/g, '');
    }

    if (name === 'rol_id') {
      const selectedRole = rolesList.find((r) => String(r.id) === String(value));
      if (selectedRole?.nombre_rol === 'SuperAdmin') {
        setFormData((prev) => ({ ...prev, rol_id: value, sucursal_id: '' }));
        setErrors((prev) => ({ ...prev, rol_id: '', sucursal_id: '' }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleKeyDownNoSpace = (e) => {
    if (e.key === ' ' || e.keyCode === 32) {
      e.preventDefault();
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 1. Nombre (min 2, max 50)
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio.';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres.';
    } else if (formData.nombre.trim().length > 50) {
      newErrors.nombre = 'El nombre no puede exceder los 50 caracteres.';
    }

    // 2. Apellido (min 2, max 50)
    if (!formData.apellido.trim()) {
      newErrors.apellido = 'El apellido es obligatorio.';
    } else if (formData.apellido.trim().length < 2) {
      newErrors.apellido = 'El apellido debe tener al menos 2 caracteres.';
    } else if (formData.apellido.trim().length > 50) {
      newErrors.apellido = 'El apellido no puede exceder los 50 caracteres.';
    }

    // 3. Nombre de Usuario (sin espacios, min 6, max 50)
    if (!formData.usuario.trim()) {
      newErrors.usuario = 'El nombre de usuario es obligatorio.';
    } else if (/\s/.test(formData.usuario)) {
      newErrors.usuario = 'El nombre de usuario no puede contener espacios.';
    } else if (formData.usuario.trim().length < 6) {
      newErrors.usuario = 'El usuario debe tener al menos 6 caracteres.';
    } else if (formData.usuario.trim().length > 50) {
      newErrors.usuario = 'El nombre de usuario no puede exceder los 50 caracteres.';
    }

    // 4. Cédula de Identidad (solo dígitos, min 11, max 20)
    if (!formData.cedula.trim()) {
      newErrors.cedula = 'La cédula de identidad es obligatoria.';
    } else if (formData.cedula.trim().length < 11) {
      newErrors.cedula = 'La cédula debe contener al menos 11 dígitos numéricos.';
    } else if (formData.cedula.trim().length > 20) {
      newErrors.cedula = 'La cédula no puede exceder los 20 dígitos numéricos.';
    }

    // 5. Correo Electrónico (sin espacios, formato válido, max 100)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.correo.trim()) {
      newErrors.correo = 'El correo electrónico es obligatorio.';
    } else if (/\s/.test(formData.correo)) {
      newErrors.correo = 'El correo electrónico no puede contener espacios.';
    } else if (formData.correo.trim().length > 100) {
      newErrors.correo = 'El correo electrónico no puede exceder los 100 caracteres.';
    } else if (!emailRegex.test(formData.correo.trim())) {
      newErrors.correo = 'Ingrese un correo electrónico válido (ej. usuario@dominio.com).';
    }

    // 6. Teléfono / WhatsApp (solo dígitos, min 10, max 20)
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono de contacto es obligatorio.';
    } else if (formData.telefono.trim().length < 10) {
      newErrors.telefono = 'El teléfono debe contener al menos 10 dígitos numéricos.';
    } else if (formData.telefono.trim().length > 20) {
      newErrors.telefono = 'El teléfono no puede exceder los 20 dígitos numéricos.';
    }

    // 7. Rol en el Equipo
    if (!formData.rol_id) {
      newErrors.rol_id = 'Debe seleccionar un rol en el equipo.';
    }

    // Sucursal Asignada (requerida si no es SuperAdmin)
    if (!isSuperAdminRole && !formData.sucursal_id) {
      newErrors.sucursal_id = 'Debe seleccionar una sucursal para este rol.';
    }

    // 8. Contraseña (sin espacios, min 8, max 20)
    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = 'La contraseña de acceso es obligatoria.';
      } else if (/\s/.test(formData.password)) {
        newErrors.password = 'La contraseña no puede contener espacios.';
      } else if (formData.password.length < 8) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
      } else if (formData.password.length > 20) {
        newErrors.password = 'La contraseña no puede exceder los 20 caracteres.';
      }
    } else if (formData.password) {
      if (/\s/.test(formData.password)) {
        newErrors.password = 'La nueva contraseña no puede contener espacios.';
      } else if (formData.password.length < 8) {
        newErrors.password = 'La nueva contraseña debe tener al menos 8 caracteres.';
      } else if (formData.password.length > 20) {
        newErrors.password = 'La nueva contraseña no puede exceder los 20 caracteres.';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEdit && !hasChanges) {
      sileo.info({
        title: 'Sin cambios',
        description: 'No se detectaron cambios para actualizar.'
      });
      onClose();
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      usuario: formData.usuario.trim().toLowerCase(),
      cedula: formData.cedula.trim(),
      telefono: formData.telefono.trim(),
      correo: formData.correo.trim().toLowerCase(),
      rol_id: parseInt(formData.rol_id, 10),
      sucursal_id: isSuperAdminRole ? null : (formData.sucursal_id ? parseInt(formData.sucursal_id, 10) : null),
      foto_perfil_url: formData.foto_perfil_url.trim() || null
    };

    if (formData.password && formData.password.trim().length > 0) {
      payload.password = formData.password.trim();
    }

    setIsSubmitting(true);

    try {
      const apiCall = isEdit
        ? updateWorker(worker.id, payload)
        : createWorker(payload);

      await sileo.promise(apiCall, {
        loading: {
          title: isEdit ? 'Actualizando datos...' : 'Creando usuario...',
          description: 'Guardando los cambios en la base de datos'
        },
        success: (res) => ({
          title: 'Operación exitosa',
          description: res.message || (isEdit ? 'Usuario actualizado' : 'Usuario registrado correctamente')
        }),
        error: (err) => ({
          title: 'No se pudo completar',
          description: err.response?.data?.message || 'Ocurrió un error al procesar los datos'
        })
      });

      if (onSave) onSave();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al guardar usuario:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Editar Usuario: ${worker?.nombre} ${worker?.apellido}` : 'Registrar Nuevo Usuario'}
      description={
        isEdit
          ? 'Actualice la información del usuario. La contraseña es opcional.'
          : 'Complete el formulario para registrar un nuevo usuario en el sistema.'
      }
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
        {/* Cuerpo Scroleable */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {/* Fila 1: Nombre y Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                maxLength={50}
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej. Franyer"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${errors.nombre
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                  }`}
              />
              {errors.nombre && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.nombre}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="apellido"
                maxLength={50}
                value={formData.apellido}
                onChange={handleChange}
                placeholder="Ej. Fernández"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${errors.apellido
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                  }`}
              />
              {errors.apellido && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.apellido}</p>
              )}
            </div>
          </div>

          {/* Fila 2: Usuario y Cédula */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Nombre de Usuario <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 text-sm">
                  @
                </span>
                <input
                  type="text"
                  name="usuario"
                  maxLength={50}
                  value={formData.usuario}
                  onChange={handleChange}
                  onKeyDown={handleKeyDownNoSpace}
                  placeholder="usuario.login"
                  className={`w-full pl-8 pr-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${errors.usuario
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                    }`}
                />
              </div>
              {errors.usuario && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.usuario}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Cédula de Identidad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cedula"
                maxLength={20}
                value={formData.cedula}
                onChange={handleChange}
                placeholder="05600000001 (solo números)"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${errors.cedula
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                  }`}
              />
              {errors.cedula && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.cedula}</p>
              )}
            </div>
          </div>

          {/* Fila 3: Correo y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="correo"
                maxLength={100}
                value={formData.correo}
                onChange={handleChange}
                onKeyDown={handleKeyDownNoSpace}
                placeholder="correo@franyermobile.com"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${errors.correo
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                  }`}
              />
              {errors.correo && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.correo}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Teléfono / WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="telefono"
                maxLength={20}
                value={formData.telefono}
                onChange={handleChange}
                placeholder="8095550101 (solo números)"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${errors.telefono
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                  }`}
              />
              {errors.telefono && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.telefono}</p>
              )}
            </div>
          </div>

          {/* Fila 4: Rol y Sucursal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Rol en el Equipo <span className="text-red-500">*</span>
              </label>
              <select
                name="rol_id"
                value={formData.rol_id}
                onChange={handleChange}
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 transition-colors cursor-pointer ${errors.rol_id
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                  }`}
              >
                <option value="" disabled>Seleccione un rol</option>
                {availableRoles.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {formatRoleName(r.nombre_rol || r.nombre)}
                  </option>
                ))}
              </select>
              {errors.rol_id && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.rol_id}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Sucursal Asignada {!isSuperAdminRole && <span className="text-red-500">*</span>}
                {isBranchAdmin && <span className="text-[11px] text-neutral-400 font-normal ml-1">(Fijada a tu sede)</span>}
              </label>
              <select
                name="sucursal_id"
                disabled={isSuperAdminRole || isBranchAdmin}
                value={isBranchAdmin ? String(currentUser?.sucursal_id || '') : (isSuperAdminRole ? '' : formData.sucursal_id)}
                onChange={handleChange}
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:disabled:bg-neutral-800 ${errors.sucursal_id
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                  }`}
              >
                {isSuperAdminRole ? (
                  <option value="">Global / Sin Asignar (SuperAdmin)</option>
                ) : (
                  <option value="" disabled>Seleccione una sucursal</option>
                )}
                {sucursalesList.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.nombre_sucursal || s.nombre}
                  </option>
                ))}
              </select>
              {errors.sucursal_id && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.sucursal_id}</p>
              )}
            </div>
          </div>

          {/* Fila 5: Contraseña */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
              {isEdit ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'}{' '}
              {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                maxLength={20}
                value={formData.password}
                onChange={handleChange}
                onKeyDown={handleKeyDownNoSpace}
                placeholder={isEdit ? 'Dejar en blanco para mantener la actual (máx. 20 car.)' : 'Entre 8 y 20 caracteres'}
                className={`w-full pl-3.5 pr-11 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${errors.password
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Ver u ocultar contraseña"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <MorphIcon icon={showPassword ? EyeOff : Eye} size={18} spring="smooth" />
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.password}</p>
            )}
          </div>
        </div>

        {/* Footer Fijo Abajo */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 shrink-0 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-[#141416] flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-medium bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (isEdit && !hasChanges)}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkerModal;
