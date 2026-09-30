import React from 'react';
import Skeleton from '../../components/common/Skeleton';
import TableSkeleton from '../../components/common/TableSkeleton';

const ReportesSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Cabecera Principal y Barra de Control */}
      <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-5">
          <div className="space-y-2">
            <Skeleton className="h-7 sm:h-8 w-56 sm:w-64" />
            <Skeleton className="h-3.5 sm:h-4 w-72 sm:w-96" />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="w-[38px] h-[38px] rounded-xl" />
            <Skeleton className="w-28 sm:w-32 h-[38px] rounded-xl" />
            <Skeleton className="w-32 sm:w-36 h-[38px] rounded-xl" />
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-64 sm:w-80 rounded-xl" />
          </div>
          <div className="shrink-0">
            <Skeleton className="h-9 w-44 sm:w-52 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 2. Cuadrícula de 4 Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={`kpi-skel-${idx}`}
            className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between h-[155px]"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="w-5 h-5 rounded-md" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <Skeleton className="h-7 sm:h-8 w-36 sm:w-40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Bloque de Resumen: Métodos de Pago */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5 mb-2.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`pm-skel-${idx}`}
              className="p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#141416] shadow-xs flex flex-col justify-between h-[120px]"
            >
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="w-4 h-4 rounded-full" />
              </div>
              <Skeleton className="h-6 w-28 mt-2" />
              <div className="mt-2.5 space-y-1.5">
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Bloque de Gráficos Analíticos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-stretch">
        <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs flex flex-col justify-between h-[360px]">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-3.5 w-72" />
            </div>
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
          <div className="my-auto py-4">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>

        <div className="xl:col-span-1 rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs flex flex-col justify-between h-[360px]">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <div className="flex items-center justify-center py-4 my-auto">
            <Skeleton className="w-40 h-40 rounded-full" />
          </div>
        </div>
      </div>

      {/* 5. Bloque de Productividad Técnica */}
      <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-3.5 w-80" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`tech-skel-${idx}`}
              className="p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5">
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Tabla Detallada de Órdenes y Liquidaciones con Paginación */}
      <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3.5 w-72" />
          </div>
          <Skeleton className="h-8 w-full sm:w-64 rounded-xl" />
        </div>

        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <Skeleton className="h-8 w-72 rounded-xl" />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-neutral-200/70 dark:border-neutral-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 dark:bg-neutral-900/80 text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200/70 dark:border-neutral-800/80 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Ticket</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Equipo</th>
                <th className="py-3.5 px-4">Técnico</th>
                <th className="py-3.5 px-4 text-right">Mano Obra</th>
                <th className="py-3.5 px-4 text-right">Anticipo</th>
                <th className="py-3.5 px-4 text-right">Liquidado</th>
                <th className="py-3.5 px-4 text-right font-bold">Total Cobrado</th>
                <th className="py-3.5 px-4">Pago</th>
                <th className="py-3.5 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
              <TableSkeleton rows={8} cols={11} />
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="w-7 h-7 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportesSkeleton;
