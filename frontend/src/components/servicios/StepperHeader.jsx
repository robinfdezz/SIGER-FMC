import React from 'react';
import { Check, Smartphone, Wrench, KeyRound, BadgePercent } from 'lucide-react';

const STEPS = [
  {
    step: 1,
    title: 'Cliente y Equipo',
    icon: Smartphone,
  },
  {
    step: 2,
    title: 'Diagnóstico y Estado',
    icon: Wrench,
  },
  {
    step: 3,
    title: 'Seguridad y Acceso',
    icon: KeyRound,
  },
  {
    step: 4,
    title: 'Presupuesto y Cierre',
    icon: BadgePercent,
  },
];

/**
 * StepperHeader
 * Cabecera horizontal limpia con iconos representativos y línea continua centrada.
 *
 * @param {number}   currentStep - Paso activo (1, 2, 3, 4)
 * @param {Function} onStepClick - Permite retroceder a pasos completados
 */
const StepperHeader = ({ currentStep = 1, onStepClick }) => {
  return (
    <div className="w-full py-1">
      <div className="flex items-start justify-between relative">
        {STEPS.map((s, index) => {
          const isCompleted = s.step < currentStep;
          const isCurrent   = s.step === currentStep;
          const isPending   = s.step > currentStep;
          const isClickable = isCompleted && onStepClick;
          const StepIcon    = s.icon;

          return (
            <React.Fragment key={s.step}>
              {/* Nodo del Paso */}
              <div
                onClick={() => isClickable && onStepClick(s.step)}
                className={`flex flex-col items-center text-center relative z-10 select-none transition-all duration-200 group ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{ flex: 1 }}
              >
                {/* Indicador Circular con Icono */}
                <div className="flex items-center justify-center">
                  {isCompleted && (
                    <div className="w-10 h-10 rounded-full bg-red-600 dark:bg-red-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Check size={18} strokeWidth={2.8} />
                    </div>
                  )}

                  {isCurrent && (
                    <div className="relative w-10 h-10 rounded-full border-2 border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <StepIcon size={18} />
                    </div>
                  )}

                  {isPending && (
                    <div className="w-10 h-10 rounded-full border-2 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center">
                      <StepIcon size={18} />
                    </div>
                  )}
                </div>

                {/* Título único centrado */}
                <div className="mt-2.5 px-1 max-w-[150px]">
                  <p
                    className={`text-xs sm:text-sm font-medium font-outfit leading-tight transition-colors ${
                      isCurrent
                        ? 'text-red-600 dark:text-red-400'
                        : isCompleted
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {s.title}
                  </p>
                </div>
              </div>

              {/* Línea de conexión entre pasos alineada con el centro de los círculos */}
              {index < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 relative z-0 self-start mt-5 mx-[-15px]"
                >
                  <div
                    className={`h-full transition-colors duration-300 ${
                      s.step < currentStep
                        ? 'bg-red-600 dark:bg-red-500'
                        : 'bg-neutral-200 dark:bg-neutral-800'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepperHeader;
