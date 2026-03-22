import { LandingSection } from './LandingSection';
import { Link, Cpu, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { number: 1, icon: Link, title: 'Подключение', description: 'Подключаемся к вашим системам через API. Менять инфраструктуру не нужно' },
  { number: 2, icon: Cpu, title: 'Обработка', description: 'Данные агрегируются и обогащаются прогнозами в реальном времени' },
  { number: 3, icon: Smartphone, title: 'Результат', description: 'Команда получает единый портал в Telegram. Ничего устанавливать не надо' },
];

export function LandingHowItWorks() {
  return (
    <LandingSection id="how-it-works">
      <div className="text-center mb-14">
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-gray-900 dark:text-white mb-4">
          Как это работает
        </h2>
        <div className="w-12 h-0.5 bg-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Три шага — и вся команда в системе
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
        {/* Connecting line (desktop) */}
        <div className="hidden md:block absolute top-[2rem] left-[20%] right-[20%] h-px bg-blue-200 dark:bg-blue-800" />

        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="flex flex-col items-center text-center relative">
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mb-4 relative z-10 shadow-md">
                {step.number}
              </div>

              <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-3">
                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[280px]">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </LandingSection>
  );
}
