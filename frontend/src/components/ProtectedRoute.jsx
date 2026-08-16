import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg transition-colors duration-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 animate-pulse">
            Verificando sesión segura...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirigir a login preservando la ruta previa
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
