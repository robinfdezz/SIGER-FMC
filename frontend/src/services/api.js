import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor para inyectar automáticamente el Bearer Token
api.interceptors.request.use(
  (config) => {
    // Buscar token en localStorage (si marcó Recordar) o en sessionStorage
    const token = localStorage.getItem('siger_token') || sessionStorage.getItem('siger_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para capturar expiración de sesión (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      // Si la petición no proviene de /auth/login y la sesión expiró, limpiar storage y redirigir
      if (!isLoginRequest && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('siger_token');
        sessionStorage.removeItem('siger_token');
        localStorage.removeItem('siger_user');
        sessionStorage.removeItem('siger_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
