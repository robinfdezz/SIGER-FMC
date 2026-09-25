import React from 'react';
import { useAuth } from '../context/AuthContext';
import logoFmcBlack from '../assets/logo-FMC Black.png';
import logoFmcWhite from '../assets/logo-FMC White.png';
import { LogOut, ShieldCheck, Shield, ClipboardList, Wrench, User } from 'lucide-react';
import { MorphIcon } from 'morphicons/react';
import { Menu, X } from 'lucide';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';

const getRoleConfig = (rolNombre) => {
  switch (rolNombre) {
    case 'SuperAdmin':
      return {
        label: 'Super Admin',
        icon: ShieldCheck
      };
    case 'Admin_Sucursal':
      return {
        label: 'Admin',
        icon: Shield
      };
    case 'Secretaria':
      return {
        label: 'Secretaria',
        icon: ClipboardList
      };
    case 'Tecnico':
      return {
        label: 'Técnico',
        icon: Wrench
      };
    default:
      return {
        label: rolNombre || 'Usuario',
        icon: User
      };
  }
};

const Navbar = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const roleConfig = getRoleConfig(user?.rol_nombre);
  const RoleIcon = roleConfig.icon;

  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName.charAt(0).toUpperCase() : '';
    const l = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${f}${l}` || 'US';
  };

  return (
    <header className="h-16 w-full bg-white dark:bg-dark-surface border-b border-zinc-200 dark:border-dark-border px-4 lg:px-6 flex items-center gap-3 lg:gap-6 flex-shrink-0 z-30 transition-colors duration-200">
      {/* Izquierda: Logo institucional */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-3">
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
          <div className="hidden md:block h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
          <span className="hidden md:inline text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
            SIGER-FMC
          </span>
        </div>
      </div>

      {/* Centro: Buscador global */}
      <div className="hidden md:flex flex-1 justify-center px-2 min-w-0">
        <GlobalSearch />
      </div>

      {/* Derecha desktop: campana + perfil + logout */}
      <div className="hidden lg:flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
        <NotificationBell />

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-100 dark:bg-zinc-700 font-bold text-xs flex items-center justify-center border border-zinc-700 shadow-xs overflow-hidden relative">
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
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-surface shadow-2xs" />
          </div>

          <div className="hidden sm:block text-left max-w-[140px]">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
              {user?.nombre} {user?.apellido}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 text-neutral-500 dark:text-neutral-400">
              <RoleIcon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
              <span className="text-[11px] font-medium leading-none truncate">
                {roleConfig.label}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Acciones compactas tablet/móvil */}
      <div className="flex lg:hidden items-center gap-1.5 ml-auto">
        <div className="md:hidden w-[min(52vw,14rem)]">
          <GlobalSearch />
        </div>
        <NotificationBell />
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
