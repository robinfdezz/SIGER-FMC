import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { createWorker, updateWorker } from '../../services/workers.service';
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

  const sucursalesList = extractArray(sucursales);
  const rolesList = extractArray(roles);

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = Boolean(worker && worker.id);
  const selectedRoleObj = rolesList.find((r) => String(r.id) === String(formData.rol_id));
  const isSuperAdminRole = selectedRoleObj?.nombre_rol === 'SuperAdmin';

  useEffect(() => {
    if (worker && isEdit) {
      setFormData({
        nombre: worker.nombre || '',
        apellido: worker.apellido || '',
        usuario: worker.usuario || '',
        cedula: worker.cedula || '',
        telefono: worker.telefono || '',
        correo: worker.correo || '',
        password: '',
        rol_id: worker.rol_id ? String(worker.rol_id) : '',
        sucursal_id: worker.sucursal_id ? String(worker.sucursal_id) : '',
        foto_perfil_url: worker.foto_perfil_url || ''
      });
    } else {
      setFormData({
        ...INITIAL_FORM_STATE,
        rol_id: rolesList.length > 0 ? String(rolesList[0].id) : '',
        sucursal_id: sucursalesList.length > 0 ? String(sucursalesList[0].id) : ''
      });
    }
    setShowPassword(false);
  }, [worker, isEdit, isOpen, roles, sucursales]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.usuario.trim()) {
      sileo.error({
        title: 'Campos requeridos',
        description: 'Por favor complete el nombre, apellido y nombre de usuario.'
      });
      return;
    }

    if (!isEdit && !formData.password.trim()) {
      sileo.error({
        title: 'Contraseña obligatoria',
        description: 'Debe ingresar una contraseña para el nuevo usuario.'
      });
      return;
    }

    const payload = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      usuario: formData.usuario.trim(),
      cedula: formData.cedula.trim(),
      telefono: formData.telefono.trim(),
      correo: formData.correo.trim(),
      rol_id: parseInt(formData.rol_id, 10),
      sucursal_id: formData.sucursal_id ? parseInt(formData.sucursal_id, 10) : null,
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
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Fila 1: Nombre y Apellido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej. Franyer"
              className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
              Apellido <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="apellido"
              required
              value={formData.apellido}
              onChange={handleChange}
              placeholder="Ej. Fernández"
              className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            />
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
                required
                value={formData.usuario}
                onChange={handleChange}
                placeholder="usuario.login"
                className="w-full pl-8 pr-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
              Cédula de Identidad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cedula"
              required
              value={formData.cedula}
              onChange={handleChange}
              placeholder="056-0000000-1"
              className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            />
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
              required
              value={formData.correo}
              onChange={handleChange}
              placeholder="correo@franyermobile.com"
              className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
              Teléfono / WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="telefono"
              required
              value={formData.telefono}
              onChange={handleChange}
              placeholder="809-555-0101"
              className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            />
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
              required
              value={formData.rol_id}
              onChange={handleChange}
              className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
            >
              {rolesList.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {formatRoleName(r.nombre_rol || r.nombre)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
              Sucursal Asignada {!isSuperAdminRole && <span className="text-red-500">*</span>}
            </label>
            <select
              name="sucursal_id"
              required={!isSuperAdminRole}
              value={formData.sucursal_id}
              onChange={handleChange}
              className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors cursor-pointer"
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
              required={!isEdit}
              value={formData.password}
              onChange={handleChange}
              placeholder={isEdit ? 'Dejar en blanco para mantener la actual' : 'Contraseña inicial'}
              className="w-full pl-3.5 pr-11 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
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
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
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
            disabled={isSubmitting}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkerModal;
