import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import WorkersPage from './pages/WorkersPage';
import { useTheme } from './context/ThemeContext';
import { Toaster } from 'sileo';
import 'sileo/styles.css';

const ThemedToaster = () => {
  const { isDark } = useTheme();
  return <Toaster position="top-center" theme={isDark ? 'dark' : 'light'} />;
};

function App() {
  return (
    <ThemeProvider>
      <ThemedToaster />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Ruta Pública: Login */}
            <Route path="/login" element={<LoginPage />} />

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
              path="/trabajadores"
              element={
                <ProtectedRoute>
                  <WorkersPage />
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
