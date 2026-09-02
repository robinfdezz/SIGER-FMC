import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { updateBranch } from '../../services/configuracion.service';
import { sileo } from 'sileo';
import { Building2, Phone, MapPin, Hash } from 'lucide-react';

const INITIAL_FORM_STATE = {
  codigo_sucursal: '',
  nombre_sucursal: '',
  telefono: '',
  direccion: ''
};

export const BranchModal = ({
  isOpen,
  onClose,
  onSuccess,
  branch = null
}) => {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (branch && isOpen) {
      setFormData({
        codigo_sucursal: branch.codigo_sucursal || '',
        nombre_sucursal: branch.nombre_sucursal || '',
        telefono: branch.telefono ? String(branch.telefono).replace(/\D/g, '') : '',
        direccion: branch.direccion || ''
      });
    } else {
      setFormData(INITIAL_FORM_STATE);
    }
    setErrors({});
  }, [branch, isOpen]);

  // Detección de modificaciones
  const hasChanges = Boolean(
    formData.codigo_sucursal.trim().toUpperCase() !== (branch?.codigo_sucursal || '').trim().toUpperCase() ||
    formData.nombre_sucursal.trim() !== (branch?.nombre_sucursal || '').trim() ||
    formData.telefono.replace(/\D/g, '') !== String(branch?.telefono || '').replace(/\D/g, '') ||
    formData.direccion.trim() !== (branch?.direccion || '').trim()
  );

  const handleChange = (field, value) => {
    let processedValue = value;
    if (field === 'codigo_sucursal') {
      processedValue = value.toUpperCase().slice(0, 10);
    } else if (field === 'telefono') {
      processedValue = value.replace(/\D/g, '').slice(0, 20);
    }

    setFormData((prev) => ({ ...prev, [field]: processedValue }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    const cleanCode = formData.codigo_sucursal.trim().toUpperCase();
    if (!cleanCode) {
      newErrors.codigo_sucursal = 'El código de la sucursal es obligatorio.';
    } else if (cleanCode.length > 10) {
      newErrors.codigo_sucursal = 'El código no puede superar los 10 caracteres.';
    }

    const cleanNombre = formData.nombre_sucursal.trim();
    if (!cleanNombre) {
      newErrors.nombre_sucursal = 'El nombre de la sucursal es obligatorio.';
    } else if (cleanNombre.length < 2) {
      newErrors.nombre_sucursal = 'Debe tener al menos 2 caracteres.';
    } else if (cleanNombre.length > 100) {
      newErrors.nombre_sucursal = 'No puede exceder los 100 caracteres.';
    }

    const cleanTel = formData.telefono.replace(/\D/g, '');
    if (!cleanTel) {
      newErrors.telefono = 'El teléfono es obligatorio.';
    } else if (cleanTel.length < 10) {
      newErrors.telefono = 'Debe contener al menos 10 dígitos numéricos.';
    } else if (cleanTel.length > 20) {
      newErrors.telefono = 'No puede exceder los 20 dígitos numéricos.';
    }

    const cleanDireccion = formData.direccion.trim();
    if (!cleanDireccion) {
      newErrors.direccion = 'La dirección física de la sede es obligatoria.';
    } else if (cleanDireccion.length < 3) {
      newErrors.direccion = 'Debe tener al menos 3 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate() || !branch) return;

    setIsSubmitting(true);

    try {
      const payload = {
        codigo_sucursal: formData.codigo_sucursal.trim().toUpperCase(),
        nombre_sucursal: formData.nombre_sucursal.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim()
      };

      const res = await updateBranch(branch.id, payload);

      sileo.success({
        title: 'Sucursal actualizada',
        description: res.message || `La sucursal ${payload.nombre_sucursal} ha sido modificada correctamente.`
      });

      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (error) {
      console.error('Error al actualizar sucursal:', error);
      const errorMsg = error.response?.data?.message || 'No se pudo actualizar la sucursal.';
      sileo.error({
        title: 'Error al guardar',
        description: errorMsg
      });
      setErrors((prev) => ({
        ...prev,
        general: errorMsg
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Sucursal: ${branch?.nombre_sucursal || ''}`}
      description="Modifique la información operativa y de contacto de esta sede física."
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
        {/* Form Body con Scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errors.general && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Código de Sucursal */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Código de Sucursal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Hash size={16} />
                </div>
                <input
                  type="text"
                  value={formData.codigo_sucursal}
                  onChange={(e) => handleChange('codigo_sucursal', e.target.value)}
                  placeholder="SUC-01"
                  maxLength={10}
                  disabled={isSubmitting}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 transition-all font-mono uppercase ${
                    errors.codigo_sucursal
                      ? 'border-red-500 focus:ring-red-500/20'
                      : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-neutral-900/10'
                  }`}
                />
              </div>
              {errors.codigo_sucursal && (
                <p className="text-xs text-red-500 mt-1">{errors.codigo_sucursal}</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Teléfono de Contacto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  placeholder="8095550100"
                  maxLength={20}
                  disabled={isSubmitting}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 transition-all ${
                    errors.telefono
                      ? 'border-red-500 focus:ring-red-500/20'
                      : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-neutral-900/10'
                  }`}
                />
              </div>
              {errors.telefono && (
                <p className="text-xs text-red-500 mt-1">{errors.telefono}</p>
              )}
            </div>
          </div>

          {/* Nombre de la Sucursal */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Nombre de la Sucursal <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Building2 size={16} />
              </div>
              <input
                type="text"
                value={formData.nombre_sucursal}
                onChange={(e) => handleChange('nombre_sucursal', e.target.value)}
                placeholder="Franyer Mobile Center - San Francisco"
                maxLength={100}
                disabled={isSubmitting}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 transition-all ${
                  errors.nombre_sucursal
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-neutral-900/10'
                }`}
              />
            </div>
            {errors.nombre_sucursal && (
              <p className="text-xs text-red-500 mt-1">{errors.nombre_sucursal}</p>
            )}
          </div>

          {/* Dirección Física */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Dirección Física <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none text-neutral-400">
                <MapPin size={16} />
              </div>
              <textarea
                value={formData.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                placeholder="Av. Presidente Antonio Guzmán Fernández #12, SFM"
                rows={3}
                disabled={isSubmitting}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 transition-all resize-none ${
                  errors.direccion
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-neutral-900/10'
                }`}
              />
            </div>
            {errors.direccion && (
              <p className="text-xs text-red-500 mt-1">{errors.direccion}</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 flex items-center justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !hasChanges}
            isLoading={isSubmitting}
          >
            Guardar Cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default BranchModal;
