import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { uploadCompanyLogo, updateCompanyProfile } from '../../services/configuracion.service';
import SingleImageDropzone from '../common/SingleImageDropzone';
import Button from '../common/Button';
import { sileo } from 'sileo';
import {
  Building2,
  Image as ImageIcon,
  FileText,
  Phone,
  Mail,
  MapPin,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CompanyProfileTab = ({ companyData, onRefresh }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.rol_nombre === 'SuperAdmin';

  const [formData, setFormData] = useState({
    nombre_empresa: '',
    rnc: '',
    telefono_principal: '',
    correo_contacto: '',
    direccion_fiscal: '',
    logo_url: null,
    logo_public_id: null
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (companyData) {
      setFormData({
        nombre_empresa: companyData.nombre_empresa || '',
        rnc: companyData.rnc || '',
        telefono_principal: companyData.telefono_principal ? String(companyData.telefono_principal).replace(/\D/g, '') : '',
        correo_contacto: companyData.correo_contacto || '',
        direccion_fiscal: companyData.direccion_fiscal || '',
        logo_url: companyData.logo_url || null,
        logo_public_id: companyData.logo_public_id || null
      });
      setLogoFile(null);
      setLogoPreview(null);
      setLogoRemoved(false);
      setErrors({});
    }
  }, [companyData]);

  // Detección de cambios
  const hasChanges = Boolean(
    logoFile ||
    logoRemoved ||
    formData.nombre_empresa.trim() !== (companyData?.nombre_empresa || '').trim() ||
    formData.rnc.trim() !== (companyData?.rnc || '').trim() ||
    formData.telefono_principal.replace(/\D/g, '') !== String(companyData?.telefono_principal || '').replace(/\D/g, '') ||
    formData.correo_contacto.trim().toLowerCase() !== (companyData?.correo_contacto || '').trim().toLowerCase() ||
    formData.direccion_fiscal.trim() !== (companyData?.direccion_fiscal || '').trim()
  );

  const handleChange = (field, value) => {
    if (!isSuperAdmin) return;

    let processedValue = value;
    if (field === 'telefono_principal') {
      processedValue = value.replace(/\D/g, '').slice(0, 20);
    }

    setFormData((prev) => ({ ...prev, [field]: processedValue }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleLogoChange = (file) => {
    if (!isSuperAdmin) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoRemoved(false);
  };

  const handleLogoRemove = () => {
    if (!isSuperAdmin) return;
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemoved(true);
    setFormData((prev) => ({ ...prev, logo_url: null, logo_public_id: null }));
  };

  const validate = () => {
    const newErrors = {};

    const cleanNombre = formData.nombre_empresa.trim();
    if (!cleanNombre) {
      newErrors.nombre_empresa = 'El nombre o razón social es obligatorio.';
    } else if (cleanNombre.length < 2) {
      newErrors.nombre_empresa = 'Debe contener al menos 2 caracteres.';
    } else if (cleanNombre.length > 100) {
      newErrors.nombre_empresa = 'No puede exceder los 100 caracteres.';
    }

    const cleanRnc = formData.rnc.trim();
    if (!cleanRnc) {
      newErrors.rnc = 'El Registro Nacional de Contribuyente (RNC) es obligatorio.';
    } else {
      const rncDigits = cleanRnc.replace(/\D/g, '');
      if (rncDigits.length !== 9 && rncDigits.length !== 11) {
        newErrors.rnc = 'El RNC debe contener exactamente 9 dígitos (institucional) u 11 dígitos (persona física).';
      } else if (cleanRnc.length > 20) {
        newErrors.rnc = 'El RNC no puede exceder los 20 caracteres.';
      }
    }

    const cleanTel = formData.telefono_principal.replace(/\D/g, '');
    if (!cleanTel) {
      newErrors.telefono_principal = 'El teléfono de contacto es obligatorio.';
    } else if (cleanTel.length < 10) {
      newErrors.telefono_principal = 'Debe contener al menos 10 dígitos numéricos.';
    } else if (cleanTel.length > 20) {
      newErrors.telefono_principal = 'No puede exceder los 20 dígitos numéricos.';
    }

    const cleanEmail = formData.correo_contacto.trim().toLowerCase();
    if (!cleanEmail) {
      newErrors.correo_contacto = 'El correo de contacto es obligatorio.';
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      newErrors.correo_contacto = 'Ingrese un correo electrónico válido.';
    } else if (cleanEmail.length > 100) {
      newErrors.correo_contacto = 'No puede exceder los 100 caracteres.';
    }

    const cleanDireccion = formData.direccion_fiscal.trim();
    if (!cleanDireccion) {
      newErrors.direccion_fiscal = 'La dirección fiscal es obligatoria.';
    } else if (cleanDireccion.length < 3) {
      newErrors.direccion_fiscal = 'Debe contener al menos 3 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isSuperAdmin) return;
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      let finalLogoUrl = formData.logo_url;
      let finalLogoPublicId = formData.logo_public_id;

      // 1. Subir logotipo nuevo a Cloudinary si se seleccionó un archivo
      if (logoFile) {
        const uploadRes = await uploadCompanyLogo(logoFile);
        finalLogoUrl = uploadRes.logo_url;
        finalLogoPublicId = uploadRes.logo_public_id;
      } else if (logoRemoved) {
        finalLogoUrl = null;
        finalLogoPublicId = null;
      }

      // 2. Enviar actualización al backend
      const payload = {
        nombre_empresa: formData.nombre_empresa.trim(),
        rnc: formData.rnc.trim(),
        telefono_principal: formData.telefono_principal.trim(),
        correo_contacto: formData.correo_contacto.trim().toLowerCase(),
        direccion_fiscal: formData.direccion_fiscal.trim(),
        logo_url: finalLogoUrl,
        logo_public_id: finalLogoPublicId
      };

      const res = await updateCompanyProfile(payload);

      sileo.success({
        title: 'Perfil de empresa actualizado',
        description: res.message || 'La información de la compañía ha sido guardada exitosamente.'
      });

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error al guardar perfil de empresa:', error);
      const errorMsg = error.response?.data?.message || 'No se pudo guardar la información de la empresa.';
      sileo.error({
        title: 'Error al actualizar',
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
    <div className="space-y-6">
      {/* Banner de Modo Solo Lectura para Admin Sucursal */}
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
          <div className="p-1 rounded-lg bg-amber-500/20 shrink-0 mt-0.5">
            <Lock size={18} />
          </div>
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">Modo de Solo Lectura</p>
            <p className="opacity-90 mt-0.5 font-inter">
              Como Administrador de Sucursal, solo puede consultar los datos fiscales y el logotipo de la compañía. La edición está reservada para el Super Administrador.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Contenedor Principal en 2 Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Logotipo Oficial */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                    <ImageIcon size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
                    Logotipo Oficial
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 font-inter">
                  Imagen institucional mostrada en facturas, recibos impresos y portal de seguimiento.
                </p>

                <SingleImageDropzone
                  value={formData.logo_url}
                  preview={logoPreview}
                  onChange={handleLogoChange}
                  onRemove={handleLogoRemove}
                  disabled={!isSuperAdmin || isSubmitting}
                  maxSizeMB={5}
                  label={
                    formData.logo_url || logoPreview
                      ? 'Haz clic para cambiar el logotipo'
                      : 'Arrastra el logo o haz clic para subir'
                  }
                  description="JPG, PNG o WEBP · Máx. 5MB"
                  initials="FMC"
                  className="w-full"
                />
              </div>

              {formData.logo_url && (
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 size={14} /> Logotipo activo en Cloudinary
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Formulario de Datos Fiscales y Contacto */}
          <div className="lg:col-span-8">
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-3 mb-4">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
                  Datos Fiscales y de Contacto
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-inter">
                  Parámetros generales de la empresa matriz registrados en el sistema.
                </p>
              </div>

              {errors.general && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm">
                  {errors.general}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre de la Empresa */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Razón Social / Nombre <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Building2 size={16} />
                    </div>
                    <input
                      type="text"
                      value={formData.nombre_empresa}
                      onChange={(e) => handleChange('nombre_empresa', e.target.value)}
                      placeholder="Franyer Mobile Center, S.R.L."
                      maxLength={100}
                      disabled={!isSuperAdmin || isSubmitting}
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 transition-all disabled:bg-neutral-100 dark:disabled:bg-neutral-800/60 disabled:cursor-not-allowed ${
                        errors.nombre_empresa
                          ? 'border-red-500 focus:ring-red-500/20'
                          : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-neutral-900/10'
                      }`}
                    />
                  </div>
                  {errors.nombre_empresa && (
                    <p className="text-xs text-red-500 mt-1">{errors.nombre_empresa}</p>
                  )}
                </div>

                {/* RNC */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    RNC / Cédula Fiscal <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <FileText size={16} />
                    </div>
                    <input
                      type="text"
                      value={formData.rnc}
                      onChange={(e) => handleChange('rnc', e.target.value)}
                      placeholder="133-18964-1"
                      maxLength={20}
                      disabled={!isSuperAdmin || isSubmitting}
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 transition-all font-mono disabled:bg-neutral-100 dark:disabled:bg-neutral-800/60 disabled:cursor-not-allowed ${
                        errors.rnc
                          ? 'border-red-500 focus:ring-red-500/20'
                          : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-neutral-900/10'
                      }`}
                    />
                  </div>
                  {errors.rnc && (
                    <p className="text-xs text-red-500 mt-1">{errors.rnc}</p>
                  )}
                </div>

                {/* Teléfono Principal */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Teléfono Principal <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Phone size={16} />
                    </div>
                    <input
                      type="tel"
                      value={formData.telefono_principal}
                      onChange={(e) => handleChange('telefono_principal', e.target.value)}
                      placeholder="8493421998"
                      maxLength={20}
                      disabled={!isSuperAdmin || isSubmitting}
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 transition-all disabled:bg-neutral-100 dark:disabled:bg-neutral-800/60 disabled:cursor-not-allowed ${
                        errors.telefono_principal
                          ? 'border-red-500 focus:ring-red-500/20'
                          : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-neutral-900/10'
                      }`}
                    />
                  </div>
                  {errors.telefono_principal && (
                    <p className="text-xs text-red-500 mt-1">{errors.telefono_principal}</p>
                  )}
                </div>

                {/* Correo de Contacto */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      value={formData.correo_contacto}
                      onChange={(e) => handleChange('correo_contacto', e.target.value)}
                      placeholder="contacto@franyermobile.com"
                      maxLength={100}
                      disabled={!isSuperAdmin || isSubmitting}
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 transition-all disabled:bg-neutral-100 dark:disabled:bg-neutral-800/60 disabled:cursor-not-allowed ${
                        errors.correo_contacto
                          ? 'border-red-500 focus:ring-red-500/20'
                          : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-neutral-900/10'
                      }`}
                    />
                  </div>
                  {errors.correo_contacto && (
                    <p className="text-xs text-red-500 mt-1">{errors.correo_contacto}</p>
                  )}
                </div>
              </div>

              {/* Dirección Fiscal */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Dirección Fiscal Matriz <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute top-2.5 left-3 pointer-events-none text-neutral-400">
                    <MapPin size={16} />
                  </div>
                  <textarea
                    value={formData.direccion_fiscal}
                    onChange={(e) => handleChange('direccion_fiscal', e.target.value)}
                    placeholder="San Francisco de Macorís, Provincia Duarte, República Dominicana"
                    rows={3}
                    disabled={!isSuperAdmin || isSubmitting}
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 transition-all resize-none disabled:bg-neutral-100 dark:disabled:bg-neutral-800/60 disabled:cursor-not-allowed ${
                      errors.direccion_fiscal
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-neutral-200 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 focus:ring-neutral-900/10'
                    }`}
                  />
                </div>
                {errors.direccion_fiscal && (
                  <p className="text-xs text-red-500 mt-1">{errors.direccion_fiscal}</p>
                )}
              </div>

              {/* Botón de Guardado (Solo SuperAdmin) */}
              {isSuperAdmin && (
                <div className="pt-4 flex items-center justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isSubmitting || !hasChanges}
                    isLoading={isSubmitting}
                    icon={Save}
                  >
                    Guardar Cambios
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CompanyProfileTab;
