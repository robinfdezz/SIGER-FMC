import React from 'react';
import { MorphIcon } from 'morphicons/react';
import { Sun, Moon } from 'lucide';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${className}`}
      title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      aria-label="Alternar tema de interfaz"
    >
      <MorphIcon 
        icon={isDark ? Moon : Sun} 
        size={20} 
        className={isDark ? "text-red-500" : "text-zinc-600 dark:text-zinc-400"} 
      />
    </button>
  );
};

export default ThemeToggle;
