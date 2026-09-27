import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const isTokenExpired = (tokenString) => {
  if (!tokenString || typeof tokenString !== 'string') return true;
  try {
    const base64Url = tokenString.split('.')[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const { exp } = JSON.parse(jsonPayload);
    if (!exp) return false;
    // Comprobar si el timestamp exp en segundos ya pasó
    return Date.now() >= exp * 1000;
  } catch (e) {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  // 1. Hidratación síncrona optimista de token
  const [token, setToken] = useState(() => {
    try {
      const storedToken = localStorage.getItem('siger_token') || sessionStorage.getItem('siger_token');
      if (storedToken && !isTokenExpired(storedToken)) {
        return storedToken;
      }
      if (storedToken) {
        localStorage.removeItem('siger_token');
        sessionStorage.removeItem('siger_token');
      }
    } catch (e) {
      console.warn('Error leyendo token inicial:', e);
    }
    return null;
  });

  // 2. Hidratación síncrona optimista de usuario
  const [user, setUser] = useState(() => {
    try {
      const storedToken = localStorage.getItem('siger_token') || sessionStorage.getItem('siger_token');
      if (storedToken && !isTokenExpired(storedToken)) {
        const storedUser = localStorage.getItem('siger_user') || sessionStorage.getItem('siger_user');
        if (storedUser) {
          return JSON.parse(storedUser);
        }
      } else {
        localStorage.removeItem('siger_user');
        sessionStorage.removeItem('siger_user');
      }
    } catch (e) {
      console.warn('Error hidratando usuario inicial:', e);
    }
    return null;
  });

  // 3. Estado loading inicial:
  // Si no hay token guardado (o ya expiró), no hay nada que esperar (loading = false).
  // Si ya tenemos token y usuario hidratados, la app arranca de inmediato (loading = false).
  // Solo si hay token pero falta el usuario en storage, dejamos loading = true mientras llega /auth/me.
  const [loading, setLoading] = useState(() => {
    try {
      const storedToken = localStorage.getItem('siger_token') || sessionStorage.getItem('siger_token');
      if (!storedToken || isTokenExpired(storedToken)) {
        return false;
      }
      const storedUser = localStorage.getItem('siger_user') || sessionStorage.getItem('siger_user');
      return !storedUser;
    } catch {
      return false;
    }
  });

  const [isValidatingSession, setIsValidatingSession] = useState(false);
  const [error, setError] = useState(null);

  // Inicializar estado revisando storage y revalidando en segundo plano
  const initializeAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('siger_token') || sessionStorage.getItem('siger_token');
      const storedUser = localStorage.getItem('siger_user') || sessionStorage.getItem('siger_user');

      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      // 1. Validar vigencia local del token
      if (isTokenExpired(storedToken)) {
        console.warn('El token almacenado ha expirado.');
        localStorage.removeItem('siger_token');
        localStorage.removeItem('siger_user');
        sessionStorage.removeItem('siger_token');
        sessionStorage.removeItem('siger_user');
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Error parseando usuario local:', e);
        }
      }

      // 2. Validar token y sesión activa contra el backend mediante /api/auth/me en segundo plano
      setIsValidatingSession(true);
      try {
        const response = await api.get('/auth/me');
        if (response.data?.success && response.data?.user) {
          setUser(response.data.user);
          // Actualizar storage con los datos más recientes
          if (localStorage.getItem('siger_token')) {
            localStorage.setItem('siger_user', JSON.stringify(response.data.user));
          } else {
            sessionStorage.setItem('siger_user', JSON.stringify(response.data.user));
          }
        }
      } catch (apiErr) {
        console.warn('Sesión no válida o expirada en el backend:', apiErr.response?.data?.message || apiErr.message);
        localStorage.removeItem('siger_token');
        localStorage.removeItem('siger_user');
        sessionStorage.removeItem('siger_token');
        sessionStorage.removeItem('siger_user');
        setUser(null);
        setToken(null);
      } finally {
        setIsValidatingSession(false);
      }
    } catch (err) {
      console.error('Error inicializando autenticación:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Función para Iniciar Sesión
   * @param {Object} credentials { usuario, password, rememberMe }
   */
  const login = async ({ usuario, correo, password, rememberMe = false, turnstileToken = null }) => {
    setLoading(true);
    setError(null);
    try {
      const payload = { 
        usuario: usuario || correo, 
        password 
      };
      if (turnstileToken) {
        payload.turnstileToken = turnstileToken;
      }
      const response = await api.post('/auth/login', payload, {
        headers: turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {}
      });

      if (response.data?.success) {
        const { token: receivedToken, user: receivedUser } = response.data;

        setToken(receivedToken);
        setUser(receivedUser);

        // Limpiar ambos antes de guardar
        localStorage.removeItem('siger_token');
        localStorage.removeItem('siger_user');
        sessionStorage.removeItem('siger_token');
        sessionStorage.removeItem('siger_user');
        sessionStorage.removeItem('siger_notif_last_unread');

        if (rememberMe) {
          localStorage.setItem('siger_token', receivedToken);
          localStorage.setItem('siger_user', JSON.stringify(receivedUser));
        } else {
          sessionStorage.setItem('siger_token', receivedToken);
          sessionStorage.setItem('siger_user', JSON.stringify(receivedUser));
        }

        return { success: true, user: receivedUser };
      } else {
        const msg = response.data?.message || 'Error desconocido al iniciar sesión.';
        setError(msg);
        return { success: false, message: msg };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'No fue posible conectar con el servidor. Verifique su conexión.';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Función para Cerrar Sesión
   */
  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('siger_token');
    localStorage.removeItem('siger_user');
    sessionStorage.removeItem('siger_token');
    sessionStorage.removeItem('siger_user');
    sessionStorage.removeItem('siger_notif_last_unread');
  };

  const clearError = () => setError(null);

  const value = {
    user,
    token,
    loading,
    isValidatingSession,
    error,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
