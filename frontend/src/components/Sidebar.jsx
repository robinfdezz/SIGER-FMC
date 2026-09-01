import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { MorphIcon } from 'morphicons/react';
import { Sun, Moon } from 'lucide';
import {
  LayoutDashboard,
  Ticket,
  Wrench,
  Image as ImageIcon,
  Users,
  Contact,
  Settings,
  PanelLeft,
  PanelLeftClose,
  MousePointer,
  Check
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'dashboard', name: 'Inicio / Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'tickets', name: 'Órdenes de Servicio', path: '/tickets', icon: Ticket },
  { id: 'clientes', name: 'Clientes', path: '/clientes', icon: Contact },
  { id: 'taller', name: 'Banco de Trabajo', path: '/taller', icon: Wrench },
  { id: 'trabajadores', name: 'Usuarios', path: '/trabajadores', icon: Users, allowedRoles: ['SuperAdmin', 'Admin_Sucursal'] },
  { id: 'config', name: 'Configuración', path: '/configuracion', icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  const filteredMenuItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      if (!item.allowedRoles) return true;
      return item.allowedRoles.includes(user?.rol_nombre);
    });
  }, [user]);

  const [sidebarMode, setSidebarMode] = useState(() => {
    const saved = localStorage.getItem('siger_sidebar_mode');
    return saved === 'hover' || saved === 'collapsed' ? saved : 'expanded';
  });

  const [isHovered, setIsHovered] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const configMenuRef = useRef(null);
  const enterTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('siger_sidebar_mode', sidebarMode);
  }, [sidebarMode]);

  // Limpieza de temporizadores al desmontar el componente
  useEffect(() => {
    return () => {
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (configMenuRef.current && !configMenuRef.current.contains(event.target)) {
        setShowConfigMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isExpanded = sidebarMode === 'expanded' || (sidebarMode === 'hover' && isHovered);

  const handleMouseEnter = () => {
    if (sidebarMode !== 'hover') return;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    enterTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 110);
  };

  const handleMouseLeave = () => {
    if (sidebarMode !== 'hover') return;
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setShowConfigMenu(false);
    }, 220);
  };

  const handleModeChange = (mode) => {
    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    setIsHovered(false);
    setSidebarMode(mode);
    setShowConfigMenu(false);
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative z-20 h-full hidden lg:flex flex-col border-r border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface transition-all duration-300 ease-in-out select-none flex-shrink-0 ${sidebarMode === 'hover' && isHovered
          ? 'w-64 shadow-2xl absolute md:relative left-0 top-0 bottom-0'
          : sidebarMode === 'collapsed' || (sidebarMode === 'hover' && !isHovered)
            ? 'w-16'
            : 'w-64'
        }`}
    >
      {/* Navegación Principal */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={!isExpanded ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${isActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                } ${!isExpanded ? 'justify-center px-0' : ''}`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200'
                  }`}
              />

              {isExpanded && (
                <span className="truncate whitespace-nowrap">{item.name}</span>
              )}

              {isActive && isExpanded && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sección Inferior / Controles */}
      <div className="p-2 border-t border-zinc-100 dark:border-dark-border space-y-1 relative" ref={configMenuRef}>

        {/* 1. Botón de Tema (Icono animado MorphIcon) */}
        <button
          onClick={toggleTheme}
          type="button"
          title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          className="w-full flex items-center justify-center p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <MorphIcon
            icon={isDark ? Moon : Sun}
            size={20}
            className={isDark ? "text-red-500" : "text-zinc-600 dark:text-zinc-400"}
          />
        </button>

        {/* 2. Botón de Modo del Sidebar (Icono central) */}
        <div className="relative">
          <button
            onClick={() => setShowConfigMenu((prev) => !prev)}
            type="button"
            title="Modo de barra lateral"
            className={`w-full flex items-center justify-center p-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${showConfigMenu
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
          >
            {sidebarMode === 'expanded' && <PanelLeftClose className="w-5 h-5" />}
            {sidebarMode === 'hover' && <MousePointer className="w-5 h-5" />}
            {sidebarMode === 'collapsed' && <PanelLeft className="w-5 h-5" />}
          </button>

          {/* Menú Popover de Selección de Modos (Solo Texto Limpio) */}
          {showConfigMenu && (
            <div className="absolute bottom-full mb-2 left-2 bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border rounded-xl shadow-xl p-1.5 z-50 min-w-[170px] text-xs animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
              <button
                onClick={() => handleModeChange('expanded')}
                type="button"
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${sidebarMode === 'expanded'
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
              >
                <span>Fijo Expandido</span>
                {sidebarMode === 'expanded' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => handleModeChange('hover')}
                type="button"
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${sidebarMode === 'hover'
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
              >
                <span>Auto-expandir</span>
                {sidebarMode === 'hover' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => handleModeChange('collapsed')}
                type="button"
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${sidebarMode === 'collapsed'
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
              >
                <span>Fijo Colapsado</span>
                {sidebarMode === 'collapsed' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
