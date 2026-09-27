import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const LOADING_THRESHOLD_MS = 250;

export const isRoleAuthorized = (user, allowedRoles = []) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!user) return false;

  const roleName = String(user.rol_nombre || user.rol || user.role || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  const roleId = Number(user.rol_id);

  return allowedRoles.some((allowed) => {
    const norm = String(allowed).toLowerCase().replace(/[\s_-]/g, '');
    if (roleName === norm) return true;
    if (roleId === 1 && (norm === 'superadmin' || norm === 'admin')) return true;
    if (roleId === 2 && (norm === 'adminsucursal' || norm === 'admin')) return true;
    if (roleId === 3 && norm === 'secretaria') return true;
    if (roleId === 4 && norm === 'tecnico') return true;
    return false;
  });
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Umbral de retardo (delay/debounce): Solo mostrar el indicador visual invasivo
  // de pantalla completa si la verificación tarda más de 250ms.
  // Si se resuelve antes (común en recargas locales), no se muestra ningún parpadeo.
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);

  useEffect(() => {
    let timer;
    if (loading && !isAuthenticated) {
      timer = setTimeout(() => {
        setShowLoadingIndicator(true);
      }, LOADING_THRESHOLD_MS);
    } else {
      setShowLoadingIndicator(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, isAuthenticated]);

  // 1. Carga optimista: Si ya contamos con la sesión hidratada (token y usuario),
  // renderizamos de inmediato para que la transición sea instantánea mientras
  // la revalidación con el backend se ejecuta en segundo plano.
  if (isAuthenticated && user) {
    if (allowedRoles && allowedRoles.length > 0) {
      if (!isRoleAuthorized(user, allowedRoles)) {
        return <Navigate to="/dashboard" replace />;
      }
    }
    return children;
  }

  // 2. Si todavía está cargando/verificando la sesión sin contar con datos optimistas:
  if (loading) {
    // Si aún no transcurrieron los 250ms, no mostramos pantalla intermedia para evitar parpadeos
    if (!showLoadingIndicator) {
      return null;
    }

    // Pasados los 250ms en conexiones lentas, mostrar indicador visual sobrio
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg transition-colors duration-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 animate-pulse font-inter">
            Verificando sesión segura...
          </p>
        </div>
      </div>
    );
  }

  // 3. No está autenticado (y no está en loading)
  if (!isAuthenticated) {
    // Redirigir a login preservando la ruta previa
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Validación RBAC de roles permitidos para la ruta
  if (allowedRoles && allowedRoles.length > 0) {
    if (!isRoleAuthorized(user, allowedRoles)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
