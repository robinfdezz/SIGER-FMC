import React from 'react';
import { useAuth } from '../context/AuthContext';
import logoFmcBlack from '../assets/logo-FMC Black.png';
import logoFmcWhite from '../assets/logo-FMC White.png';
import { LogOut } from 'lucide-react';
import { MorphIcon } from 'morphicons/react';
import { Menu, X } from 'lucide';

const Navbar = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const { user, logout } = useAuth();

  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName.charAt(0).toUpperCase() : '';
    const l = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${f}${l}` || 'US';
  };

  return (
    <header className="h-16 w-full bg-white dark:bg-dark-surface border-b border-zinc-200 dark:border-dark-border px-4 lg:px-6 flex items-center justify-between flex-shrink-0 z-30 transition-colors duration-200">
      {/* Extremo Izquierdo: Logo + Badge Sucursal */}
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          <img
            src={logoFmcBlack}
            alt="SIGER-FMC"
            className="h-9 w-auto dark:hidden"
          />
          <img
            src={logoFmcWhite}
            alt="SIGER-FMC"
            className="h-9 w-auto hidden dark:block"
          />
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-sm font-medium text-zinc-800 dark:text-zinc-200 shadow-2xs">
          <span>{user?.sucursal_nombre || 'Franyer Mobile Center - SFM'}</span>
          <span className="text-zinc-400">&bull;</span>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {user?.sucursal_codigo || 'MATRIZ'}
          </span>
        </div>
      </div>

      {/* Extremo Derecho Desktop (>= 1024px): Perfil de Usuario + Logout */}
      <div className="hidden lg:flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-100 dark:bg-zinc-700 font-bold text-xs flex items-center justify-center border border-zinc-700 shadow-sm overflow-hidden shrink-0 relative">
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

          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {user?.nombre} {user?.apellido}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium text-brand-600 dark:text-brand-400">
                {user?.rol_nombre || 'Usuario'}
              </span>
            </div>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

        <button
          onClick={logout}
          className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Botón de Menú Hamburguesa Móvil/Tablet (< 1024px) */}
      <div className="block lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menú"
          className="p-2 rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none cursor-pointer flex items-center justify-center"
        >
          <MorphIcon
            icon={mobileMenuOpen ? X : Menu}
            size={24}
          />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
