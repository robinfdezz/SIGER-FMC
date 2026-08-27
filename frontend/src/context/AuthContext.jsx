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
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inicializar estado revisando storage (localStorage o sessionStorage)
  const initializeAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('siger_token') || sessionStorage.getItem('siger_token');
      const storedUser = localStorage.getItem('siger_user') || sessionStorage.getItem('siger_user');

      if (storedToken) {
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

        // 2. Validar token y sesión activa contra el backend mediante /api/auth/me
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
        }
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
  const login = async ({ usuario, correo, password, rememberMe = false }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { 
        usuario: usuario || correo, 
        password 
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
  };

  const clearError = () => setError(null);

  const value = {
    user,
    token,
    loading,
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
