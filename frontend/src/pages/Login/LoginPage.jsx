import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoFmcWhite from '../../assets/logo-FMC White.png';
import logoFmcBlack from '../../assets/logo-FMC Black.png';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  Check
} from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    usuario: '',
    password: '',
    rememberMe: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientError, setClientError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (clientError) setClientError('');
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError('');
    clearError();

    if (!formData.usuario.trim()) {
      setClientError('Por favor, ingrese su nombre de usuario.');
      return;
    }

    if (!formData.password) {
      setClientError('Por favor, ingrese su contraseña.');
      return;
    }

    setIsSubmitting(true);
    const result = await login({
      usuario: formData.usuario.trim(),
      password: formData.password,
      rememberMe: formData.rememberMe
    });
    setIsSubmitting(false);

    if (result.success) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  const activeError = clientError || error;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden bg-[#FAFAFA] dark:bg-[#121212] transition-colors duration-200">

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[300px] h-[250px] bg-rose-600/5 dark:bg-rose-500/10 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        <div className="text-center mb-6">
          <img
            src={logoFmcBlack}
            alt="Franyer Mobile Center"
            className="h-14 w-auto mx-auto dark:hidden"
          />
          <img
            src={logoFmcWhite}
            alt="Franyer Mobile Center"
            className="h-14 w-auto mx-auto hidden dark:block"
          />
        </div>

        <div className="bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm transition-all duration-200">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-center text-zinc-900 dark:text-zinc-100">
              Iniciar Sesión
            </h2>
          </div>

          {activeError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <p className="font-medium text-xs leading-relaxed">{activeError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label
                htmlFor="usuario"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  autoComplete="username"
                  value={formData.usuario}
                  onChange={handleChange}
                  placeholder="ej. admin"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-dark-input border border-zinc-200 dark:border-dark-border rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-150 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
                >
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-11 py-2.5 bg-zinc-50 dark:bg-dark-input border border-zinc-200 dark:border-dark-border rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-150 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 focus:outline-none"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 bg-zinc-100 dark:bg-dark-input border border-zinc-300 dark:border-zinc-700 rounded peer-checked:bg-brand-600 peer-checked:border-brand-600 peer-focus:ring-2 peer-focus:ring-brand-500/30 transition-all flex items-center justify-center">
                    {formData.rememberMe && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                </div>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Recordar sesión en este equipo
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-brand-600/20 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-dark-card transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <span>Acceder al Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
          &copy; {new Date().getFullYear()} Franyer Mobile Center, S.R.L.
        </p>

      </div>
    </div>
  );
};

export default LoginPage;
