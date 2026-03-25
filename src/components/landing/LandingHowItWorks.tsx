import { LandingSection } from './LandingSection';
import { Search, Settings, Rocket, HeadphonesIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  title: string;
  duration: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: Search,
    title: 'Аудит процессов и инструментов',
    duration: '1–4 недели',
    description: 'Общаемся с вами, определяем текущие процессы, цели и задачи от системы. Оцениваем техническую составляющую и источники данных.',
  },
  {
    icon: Settings,
    title: 'Базовая настройка',
    duration: 'от 1 месяца',
    description: 'Подключаем интеграции или настраиваем оргструктуру вручную. Определяем должности, необходимые метрики, подключаем источники данных.',
  },
  {
    icon: Rocket,
    title: 'Внедрение',
    duration: '1 месяц',
    description: 'Обучаем сотрудников работе с инструментом, показываем как настраиваются модули, снимаем первые показатели.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Поддержка',
    duration: 'бессрочно',
    description: 'Консультации на протяжении всего времени работы. Доработки и адаптация системы под ваши бизнес-процессы — без ограничений.',
  },
];

export function LandingHowItWorks() {
  return (
    <LandingSection id="how-it-works">
      <div className="text-center mb-10 md:mb-14">
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
          Как это работает
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
          От первого разговора до работающей системы
        </p>
      </div>

      {/* Roadmap */}
      <div className="max-w-3xl mx-auto relative">
        {/* Vertical line */}
        <div className="absolute left-5 md:left-6 top-4 bottom-4 w-px bg-blue-200 dark:bg-blue-800" />

        <div className="space-y-8 md:space-y-10">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex items-start gap-5 md:gap-6 relative">
                {/* Node */}
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 relative z-10 shadow-sm">
                  <Icon className="w-4.5 h-4.5 md:w-5 md:h-5" />
                </div>

                {/* Card */}
                <div className="flex-1 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 md:p-6 shadow-sm">
                  <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base md:text-lg">{step.title}</h3>
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{step.duration}</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </LandingSection>
  );
}
