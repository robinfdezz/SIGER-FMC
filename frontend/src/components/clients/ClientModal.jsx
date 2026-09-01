import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { createClient, updateClient } from '../../services/clients.service';
import { sileo } from 'sileo';
import { Loader2 } from 'lucide-react';

const INITIAL_FORM_STATE = {
  nombre: '',
  apellido: '',
  cedula_rnc: '',
  telefono: '',
  telefono_adicional: '',
  correo: '',
  direccion: ''
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ClientModal = ({
  isOpen,
  onClose,
  onSuccess,
  client = null
}) => {
  const { user } = useAuth();
  const canSave = ['SuperAdmin', 'Admin_Sucursal', 'Secretaria'].includes(user?.rol_nombre);

  const isEdit = Boolean(client && client.id);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar o resetear formulario
  useEffect(() => {
    if (client && isEdit) {
      setFormData({
        nombre: client.nombre || '',
        apellido: client.apellido || '',
        cedula_rnc: client.cedula_rnc || '',
        telefono: client.telefono ? String(client.telefono).replace(/\D/g, '') : '',
        telefono_adicional: client.telefono_adicional ? String(client.telefono_adicional).replace(/\D/g, '') : '',
        correo: client.correo || '',
        direccion: client.direccion || ''
      });
    } else {
      setFormData(INITIAL_FORM_STATE);
    }
    setErrors({});
  }, [client, isEdit, isOpen]);

  // Detección de cambios en edición
  const hasChanges = !isEdit || Boolean(
    formData.nombre.trim() !== (client?.nombre || '').trim() ||
    (formData.apellido || '').trim() !== (client?.apellido || '').trim() ||
    formData.cedula_rnc.trim() !== (client?.cedula_rnc || '').trim() ||
    formData.telefono.replace(/\D/g, '') !== String(client?.telefono || '').replace(/\D/g, '') ||
    (formData.telefono_adicional || '').replace(/\D/g, '') !== String(client?.telefono_adicional || '').replace(/\D/g, '') ||
    (formData.correo || '').trim().toLowerCase() !== (client?.correo || '').trim().toLowerCase() ||
    (formData.direccion || '').trim() !== (client?.direccion || '').trim()
  );

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Sanitización en tiempo real
    if (name === 'telefono' || name === 'telefono_adicional') {
      value = value.replace(/\D/g, '');
    }
    if (name === 'correo') {
      value = value.replace(/\s/g, '');
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

    // 1. Nombre (Obligatorio, min 2, max 100)
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre del cliente es obligatorio.';
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = 'El nombre debe tener al menos 2 caracteres.';
    } else if (formData.nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder los 100 caracteres.';
    }

    // 2. Apellido (Obligatorio, min 2, max 100)
    if (!formData.apellido.trim()) {
      newErrors.apellido = 'El apellido del cliente es obligatorio.';
    } else if (formData.apellido.trim().length < 2) {
      newErrors.apellido = 'El apellido debe tener al menos 2 caracteres.';
    } else if (formData.apellido.trim().length > 100) {
      newErrors.apellido = 'El apellido no puede exceder los 100 caracteres.';
    }

    // 3. Cédula o RNC (Obligatorio, min 9, max 20)
    if (!formData.cedula_rnc.trim()) {
      newErrors.cedula_rnc = 'La cédula o RNC es obligatoria.';
    } else if (formData.cedula_rnc.trim().length < 9) {
      newErrors.cedula_rnc = 'La cédula o RNC debe tener al menos 9 caracteres.';
    } else if (formData.cedula_rnc.trim().length > 20) {
      newErrors.cedula_rnc = 'La cédula o RNC no puede exceder los 20 caracteres.';
    }

    // 4. Teléfono Principal (Obligatorio, min 10, max 20)
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono principal es obligatorio.';
    } else if (formData.telefono.trim().length < 10) {
      newErrors.telefono = 'El teléfono debe contener al menos 10 dígitos.';
    } else if (formData.telefono.trim().length > 20) {
      newErrors.telefono = 'El teléfono no puede exceder los 20 dígitos.';
    }

    // 5. Teléfono Adicional (Opcional, min 10, max 20)
    if (formData.telefono_adicional.trim()) {
      if (formData.telefono_adicional.trim().length < 10) {
        newErrors.telefono_adicional = 'El teléfono adicional debe contener al menos 10 dígitos.';
      } else if (formData.telefono_adicional.trim().length > 20) {
        newErrors.telefono_adicional = 'El teléfono adicional no puede exceder los 20 dígitos.';
      }
    }

    // 6. Correo Electrónico (Opcional, formato válido, max 100)
    if (formData.correo.trim()) {
      if (formData.correo.trim().length > 100) {
        newErrors.correo = 'El correo no puede exceder los 100 caracteres.';
      } else if (!EMAIL_REGEX.test(formData.correo.trim())) {
        newErrors.correo = 'Ingrese un correo electrónico válido (ej. cliente@dominio.com).';
      }
    }

    // 7. Dirección (Opcional, max 500)
    if (formData.direccion && formData.direccion.trim().length > 500) {
      newErrors.direccion = 'La dirección no puede exceder los 500 caracteres.';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSave) {
      sileo.error({
        title: 'Acceso Denegado',
        description: 'No posee permisos para registrar o modificar datos de clientes.'
      });
      return;
    }

    if (isEdit && !hasChanges) {
      sileo.info({
        title: 'Sin cambios',
        description: 'No se detectaron modificaciones para actualizar.'
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
      cedula_rnc: formData.cedula_rnc.trim(),
      telefono: formData.telefono.trim(),
      telefono_adicional: formData.telefono_adicional.trim() || null,
      correo: formData.correo.trim() ? formData.correo.trim().toLowerCase() : null,
      direccion: formData.direccion.trim() || null
    };

    setIsSubmitting(true);

    sileo.promise(
      isEdit ? updateClient(client.id, payload) : createClient(payload),
      {
        loading: {
          title: isEdit ? 'Actualizando cliente...' : 'Registrando cliente...',
          description: 'Guardando los datos en la cartera de clientes...'
        },
        success: (res) => {
          setIsSubmitting(false);
          onSuccess(res.data);
          onClose();
          return {
            title: isEdit ? 'Cliente actualizado' : 'Cliente registrado',
            description: res.message || 'La operación se completó con éxito.'
          };
        },
        error: (err) => {
          setIsSubmitting(false);
          const errorMsg =
            err.response?.data?.message ||
            'Ocurrió un error al procesar la solicitud del cliente.';
          return {
            title: 'Error en la operación',
            description: errorMsg
          };
        }
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Editar Cliente: ${client?.nombre} ${client?.apellido}` : 'Registrar Nuevo Cliente'}
      description={
        isEdit
          ? 'Actualice la información del cliente.'
          : 'Complete el formulario para registrar un nuevo cliente en el sistema.'
      }
      maxWidth="max-w-2xl"
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
                maxLength={100}
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej. Juan"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.nombre
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
                maxLength={100}
                value={formData.apellido}
                onChange={handleChange}
                placeholder="Ej. Pérez"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.apellido
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                }`}
              />
              {errors.apellido && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.apellido}</p>
              )}
            </div>
          </div>

          {/* Fila 2: Cédula/RNC y Teléfono Principal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Cédula de Identidad o RNC <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cedula_rnc"
                maxLength={20}
                value={formData.cedula_rnc}
                onChange={handleChange}
                placeholder="Ej. 05600000001"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.cedula_rnc
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                }`}
              />
              {errors.cedula_rnc && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.cedula_rnc}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Teléfono Principal <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="telefono"
                maxLength={20}
                value={formData.telefono}
                onChange={handleChange}
                placeholder="8095550101 (solo números)"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.telefono
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                }`}
              />
              {errors.telefono && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.telefono}</p>
              )}
            </div>
          </div>

          {/* Fila 3: Teléfono Adicional y Correo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Teléfono Secundario / WhatsApp <span className="text-neutral-400 font-normal ml-1">(Opcional)</span>
              </label>
              <input
                type="tel"
                name="telefono_adicional"
                maxLength={20}
                value={formData.telefono_adicional}
                onChange={handleChange}
                placeholder="8295550202 (solo números)"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.telefono_adicional
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                }`}
              />
              {errors.telefono_adicional && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.telefono_adicional}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
                Correo Electrónico <span className="text-neutral-400 font-normal ml-1">(Opcional)</span>
              </label>
              <input
                type="email"
                name="correo"
                maxLength={100}
                value={formData.correo}
                onChange={handleChange}
                onKeyDown={handleKeyDownNoSpace}
                placeholder="cliente@ejemplo.com"
                className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                  errors.correo
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
                }`}
              />
              {errors.correo && (
                <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.correo}</p>
              )}
            </div>
          </div>

          {/* Fila 4: Dirección */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1 font-inter">
              Dirección de Residencia o Empresa <span className="text-neutral-400 font-normal ml-1">(Opcional)</span>
            </label>
            <textarea
              name="direccion"
              rows={2}
              maxLength={500}
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Calle, número, sector o referencia..."
              className={`w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 transition-colors resize-none ${
                errors.direccion
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-neutral-200 dark:border-neutral-800 focus:border-red-500 focus:ring-red-500/20'
              }`}
            />
            {errors.direccion && (
              <p className="text-[11px] text-red-500 mt-1 font-inter">{errors.direccion}</p>
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
            disabled={isSubmitting || !canSave || (isEdit && !hasChanges)}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientModal;
