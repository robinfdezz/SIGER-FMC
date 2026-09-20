import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import WorkersPage from './pages/WorkersPage';
import ClientsPage from './pages/ClientsPage';
import ConfigurationPage from './pages/ConfigurationPage';
import ServiciosPage from './pages/ServiciosPage';
import NuevaOrdenPage from './pages/NuevaOrdenPage';
import EstadoOrdenPage from './pages/EstadoOrdenPage';
import BancoTrabajoPage from './pages/BancoTrabajoPage';
import UploadMobilePage from './pages/UploadMobilePage';
import { useTheme } from './context/ThemeContext';
import { Toaster } from 'sileo';
import 'sileo/styles.css';

const ThemedToaster = () => {
  const { isDark } = useTheme();
  return <Toaster position="bottom-right" theme={isDark ? 'dark' : 'light'} />;
};

function App() {
  return (
    <ThemeProvider>
      <ThemedToaster />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas Públicas: Login, Seguimiento QR y Carga Remota Móvil */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/estado" element={<EstadoOrdenPage />} />
            <Route path="/estado/:codigo" element={<EstadoOrdenPage />} />
            <Route path="/subir-fotos/:sessionId" element={<UploadMobilePage />} />

            {/* Rutas Privadas Protegidas */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <ServiciosPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tickets/nueva"
              element={
                <ProtectedRoute>
                  <NuevaOrdenPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/servicios"
              element={
                <ProtectedRoute>
                  <ServiciosPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/servicios/nueva"
              element={
                <ProtectedRoute>
                  <NuevaOrdenPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/taller"
              element={
                <ProtectedRoute>
                  <BancoTrabajoPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/banco-trabajo"
              element={
                <ProtectedRoute>
                  <BancoTrabajoPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/clientes"
              element={
                <ProtectedRoute>
                  <ClientsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/trabajadores"
              element={
                <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin_Sucursal']}>
                  <WorkersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/configuracion"
              element={
                <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin_Sucursal']}>
                  <ConfigurationPage />
                </ProtectedRoute>
              }
            />

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
