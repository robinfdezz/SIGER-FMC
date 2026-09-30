import React from 'react';
import Skeleton from '../../components/common/Skeleton';

export default function DashboardSkeleton({
  isSuperAdmin = false,
  isTecnico = false,
  canViewFinances = true,
  canCreateOrder = true
}) {
  return (
    <div className="space-y-5 w-full select-none" aria-busy="true" aria-label="Cargando resumen del dashboard">
      {/* Cabecera Superior: Columna Principal + Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
        {/* Columna Principal */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between gap-4">
          {/* Banner / Encabezado Abierto */}
          <div className="rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-3.5 h-3.5 rounded-full" />
                  <Skeleton className="w-36 h-3" />
                </div>
                <Skeleton className="w-64 sm:w-80 h-8 max-w-[85vw] rounded-lg" />
                <div className="flex flex-wrap items-center gap-3 pt-0.5">
                  <Skeleton className="w-56 h-3.5" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="w-20 h-3" />
                  </div>
                </div>
              </div>

              {isSuperAdmin ? (
                <div className="w-[180px] sm:w-[220px] self-start sm:self-center shrink-0">
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ) : null}
            </div>
          </div>

          {/* KPIs Operacionales */}
          <div
            className={
              isTecnico
                ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4'
                : 'grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4'
            }
          >
            {Array.from({ length: isTecnico ? 5 : 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="w-3/5 h-3" />
                    <Skeleton className="w-5 h-5 rounded-full" />
                  </div>
                  <div className="mt-2">
                    <Skeleton className="w-16 h-8 rounded-lg" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 min-w-0">
                  <Skeleton className="w-14 h-5 rounded-full" />
                  <Skeleton className="w-12 h-3" />
                </div>
              </div>
            ))}
          </div>

          {/* Finanzas / Ingresos (si tiene permisos) */}
          {canViewFinances ? (
            <div className="w-full rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 shrink-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-28 h-3" />
                  <Skeleton className="w-4 h-4 rounded-full" />
                </div>
                <div className="flex flex-wrap items-baseline gap-2 mt-1">
                  <Skeleton className="w-7 h-3.5" />
                  <Skeleton className="w-40 h-7 rounded-lg" />
                  <Skeleton className="w-20 h-5 rounded-full" />
                </div>
              </div>

              <div className="flex-1 max-w-full md:max-w-[360px] lg:max-w-[420px] w-full min-w-0">
                <Skeleton className="h-[66px] w-full rounded-xl" />
              </div>
            </div>
          ) : null}
        </div>

        {/* Columna Derecha: Acciones Rápidas */}
        <div className="lg:col-span-4 xl:col-span-3 h-full">
          <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3.5">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="w-28 h-3.5" />
              </div>
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>

            <div className="flex-1 flex flex-col justify-between gap-2.5">
              {Array.from({ length: canCreateOrder ? 4 : 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full flex-1 rounded-xl p-3 bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <Skeleton className="w-20 h-3" />
                      <Skeleton className="w-28 h-2.5" />
                    </div>
                  </div>
                  <Skeleton className="w-4 h-4 rounded-sm shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Flujo + Carga de Técnicos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
        {/* Flujo del taller */}
        <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-28 h-4.5" />
              <Skeleton className="w-20 h-5 rounded-full" />
            </div>
            <Skeleton className="w-28 h-6 rounded-lg self-start sm:self-auto" />
          </div>

          {/* Barra de progreso segmentada */}
          <div className="mt-2 mb-3.5">
            <Skeleton className="h-2 w-full rounded-full" />
          </div>

          {/* 6 Etapas interconectadas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-neutral-200/70 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/40 p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <Skeleton className="w-4 h-3" />
                  {idx < 5 ? <Skeleton className="w-3 h-3 hidden lg:block" /> : null}
                </div>
                <div>
                  <Skeleton className="w-10 h-7 rounded-md" />
                  <Skeleton className="w-4/5 h-3 mt-1.5" />
                </div>
                <div className="mt-2.5 w-full">
                  <Skeleton className="h-1 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* TrendChart Skeleton: Tabs + Área del gráfico */}
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="w-32 h-3.5" />
              <div className="flex gap-1">
                <Skeleton className="w-12 h-6 rounded-lg" />
                <Skeleton className="w-12 h-6 rounded-lg" />
                <Skeleton className="w-12 h-6 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-[140px] w-full rounded-xl" />
          </div>
        </div>

        {/* Carga por técnico */}
        <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <Skeleton className="w-28 h-4.5" />
                <Skeleton className="w-24 h-3 mt-1" />
              </div>
              <Skeleton className="w-20 h-6 rounded-lg" />
            </div>

            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                      <div className="space-y-1">
                        <Skeleton className="w-24 h-3" />
                        <Skeleton className="w-16 h-2.5" />
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="w-12 h-3 ml-auto" />
                      <Skeleton className="w-9 h-2.5 ml-auto" />
                    </div>
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Categorías (1/3) + Actividad Reciente (2/3) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5 items-stretch">
        {/* Categorías de Dispositivos */}
        <div className="rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 sm:p-5 h-full flex flex-col">
          <div className="mb-2 sm:mb-3">
            <Skeleton className="w-40 h-4.5" />
            <Skeleton className="w-52 h-3 mt-1" />
          </div>
          <div className="relative flex items-center justify-center select-none flex-1 my-auto py-4 sm:py-6">
            <div className="relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64">
              <Skeleton className="w-full h-full rounded-full" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-white dark:bg-[#141416] flex flex-col items-center justify-center shadow-xs space-y-1">
                  <Skeleton className="w-10 h-8 rounded-md" />
                  <Skeleton className="w-12 h-3" />
                  <Skeleton className="w-10 h-2.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 sm:px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-32 h-4.5" />
                <Skeleton className="w-48 h-3.5 hidden sm:inline-block" />
              </div>
              <Skeleton className="w-20 h-6 rounded-lg" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                    <th className="px-4 sm:px-5 py-3"><Skeleton className="w-12 h-3" /></th>
                    <th className="px-4 py-3"><Skeleton className="w-16 h-3" /></th>
                    <th className="px-4 py-3"><Skeleton className="w-14 h-3" /></th>
                    <th className="px-4 py-3"><Skeleton className="w-12 h-3" /></th>
                    <th className="px-4 py-3"><Skeleton className="w-14 h-3" /></th>
                    <th className="px-4 sm:px-5 py-3 text-right"><Skeleton className="w-12 h-3 ml-auto" /></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-neutral-100/60 dark:border-neutral-800/60">
                      <td className="px-4 sm:px-5 py-3.5"><Skeleton className="w-24 h-3.5" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="w-28 h-3.5" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="w-24 h-3.5" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="w-20 h-5 rounded-full" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="w-16 h-5 rounded-full" /></td>
                      <td className="px-4 sm:px-5 py-3.5 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Skeleton className="w-7 h-7 rounded-xl" />
                          <Skeleton className="w-20 h-3.5" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
