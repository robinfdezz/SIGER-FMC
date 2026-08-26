import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MorphIcon } from 'morphicons/react';
import { Sun, Moon } from 'lucide';
import {
  LayoutDashboard,
  Ticket,
  Wrench,
  Image as ImageIcon,
  Users,
  Settings,
  Store,
  LogOut,
  ChevronRight
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'dashboard', name: 'Inicio / Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'tickets', name: 'Órdenes de Servicio', path: '/tickets', icon: Ticket },
  { id: 'taller', name: 'Banco de Trabajo', path: '/taller', icon: Wrench },
  { id: 'trabajadores', name: 'Usuarios', path: '/trabajadores', icon: Users },
  { id: 'config', name: 'Configuración', path: '/configuracion', icon: Settings },
];

const DashboardLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Evitar scroll en el body cuando el menú móvil está abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName.charAt(0).toUpperCase() : '';
    const l = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${f}${l}` || 'US';
  };

  return (
    <div className="h-screen w-full bg-light-bg dark:bg-dark-bg text-zinc-900 dark:text-zinc-100 transition-colors duration-200 flex flex-col overflow-hidden">
      
      {/* 1. Header de extensión completa */}
      <Navbar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* 2. Menú Móvil / Tablet Fullscreen (< 1024px) */}
      <div
        className={`fixed inset-0 top-16 z-50 bg-white dark:bg-[#121212] overflow-y-auto lg:hidden flex flex-col justify-between p-5 sm:p-6 transition-all duration-300 ease-in-out ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none -translate-y-4'
        }`}
      >
        <div className="space-y-6">
          {/* Badge de Sucursal Móvil */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-sm font-medium text-zinc-800 dark:text-zinc-200 shadow-2xs">
            <Store className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {user?.sucursal_nombre || 'Franyer Mobile Center - SFM'}
              </p>
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {user?.sucursal_codigo || 'MATRIZ'}
              </span>
            </div>
          </div>

          {/* Lista de Navegación Móvil */}
          <nav className="space-y-1.5">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'text-zinc-400'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 ${
                      isActive ? 'text-brand-500' : 'text-zinc-400'
                    }`}
                  />
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sección Inferior Móvil: Perfil + Botón Tema Compacto + Logout */}
        <div className="pt-4 mt-6 border-t border-zinc-200 dark:border-dark-border">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-dark-card border border-zinc-200 dark:border-dark-border">
            
            {/* Usuario */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-100 font-bold text-xs flex items-center justify-center border border-zinc-700 overflow-hidden flex-shrink-0 relative">
                {user?.foto_perfil_url ? (
                  <img
                    src={user.foto_perfil_url}
                    alt={user.nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={`avatar-fallback ${user?.foto_perfil_url ? 'hidden' : ''}`}>
                  {getInitials(user?.nombre, user?.apellido)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {user?.nombre} {user?.apellido}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-brand-600 dark:text-brand-400 truncate">
                    {user?.rol_nombre || 'Usuario'}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones: Botón de Tema Compacto + Botón de Logout */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={toggleTheme}
                type="button"
                aria-label="Alternar tema"
                className="p-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
              >
                <MorphIcon
                  icon={isDark ? Moon : Sun}
                  size={20}
                  className={isDark ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'}
                />
              </button>

              <div className="h-5 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="p-2.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex-shrink-0 cursor-pointer flex items-center justify-center"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 3. Cuerpo Desktop: Sidebar persistente + Contenido principal */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {children}
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;
