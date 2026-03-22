import { Eye, Shirt, Smartphone } from 'lucide-react';
import { LandingSection } from './LandingSection';

const industries = [
  {
    icon: Eye,
    name: 'Оптика',
    features: ['KPI по выручке и конверсии', 'Рейтинги оптометристов', 'CSI и отзывы клиентов'],
  },
  {
    icon: Shirt,
    name: 'Одежда и обувь',
    features: ['Контроль сделок и заказов', 'Мотивация продавцов', 'Графики смен'],
  },
  {
    icon: Smartphone,
    name: 'Электроника',
    features: ['Аналитика по категориям', 'Средний чек и маржинальность', 'Прогнозы продаж'],
  },
];

export function LandingIndustries() {
  return (
    <LandingSection id="industries">
      <div className="text-center mb-12">
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-gray-900 dark:text-white mb-4">
          Для любой розничной сети
        </h2>
        <div className="w-12 h-0.5 bg-blue-600 mx-auto mb-4" />
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Overbrain подстраивается под специфику вашего бизнеса
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {industries.map((industry) => {
          const Icon = industry.icon;
          return (
            <div
              key={industry.name}
              className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {industry.name}
              </h3>

              <ul className="space-y-2">
                {industry.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </LandingSection>
  );
}
