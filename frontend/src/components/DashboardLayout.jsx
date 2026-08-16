import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  return (
    <div className="h-screen w-full bg-light-bg dark:bg-dark-bg text-zinc-900 dark:text-zinc-100 transition-colors duration-200 flex flex-col overflow-hidden">
      {/* 1. Header de extensión completa */}
      <Navbar />

      {/* 2. Cuerpo: Sidebar alineado a la izquierda debajo del Header + Contenido principal */}
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
