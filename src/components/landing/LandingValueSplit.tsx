import { useState } from 'react';
import { useFadeInOnScroll } from '@/hooks/useFadeInOnScroll';
import {
  BarChart3, Wallet, AlertTriangle, MessageSquare, Trophy, TrendingUp,
  MessageCircle, BookOpen, Calculator, LayoutDashboard, CalendarDays, Zap,
  type LucideIcon,
} from 'lucide-react';

interface BenefitItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const PROFIT_ITEMS: BenefitItem[] = [
  { icon: BarChart3, title: 'Точки роста — на виду', description: 'Менеджеры видят KPI и знают, как увеличить выручку' },
  { icon: Wallet, title: 'Каждая продажа = рост дохода', description: 'Сотрудник видит влияние продажи на зарплату' },
  { icon: AlertTriangle, title: 'Сделки не теряются', description: 'Алерты о просроченных заказах — реакция до ухода клиента' },
  { icon: MessageSquare, title: 'Негатив → точка роста', description: 'Быстрая реакция на отзывы возвращает клиентов' },
  { icon: Trophy, title: 'Здоровая конкуренция', description: 'Прозрачные рейтинги — лучшие видны, остальные подтягиваются' },
  { icon: TrendingUp, title: 'Прогноз до конца месяца', description: 'Узнайте результат, пока есть время скорректировать курс' },
];

const SAVINGS_ITEMS: BenefitItem[] = [
  { icon: MessageCircle, title: 'Без своего приложения', description: 'Всё через Telegram — ноль затрат на разработку' },
  { icon: BookOpen, title: 'Обучение без тренеров', description: 'Инструкции под рукой — новый сотрудник учится сам' },
  { icon: Calculator, title: 'Честные планы', description: 'Автоматическая корректировка под график сотрудника' },
  { icon: LayoutDashboard, title: 'Одно окно вместо пяти', description: 'ERP, аналитика, задачи — экономия 30+ мин в день' },
  { icon: CalendarDays, title: 'Графики без Excel', description: 'Визуальный календарь — планирование за минуты' },
  { icon: Zap, title: 'Задачи в один клик', description: 'Telegram → клик → задача открыта. Без поиска' },
];

export function LandingValueSplit() {
  const { ref, isVisible } = useFadeInOnScroll();
  const [value, setValue] = useState(0); // 0 = profit, 100 = savings

  const isProfit = value < 50;
  const items = isProfit ? PROFIT_ITEMS : SAVINGS_ITEMS;
  const iconBg = isProfit ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20';
  const iconText = isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400';

  return (
    <section
      ref={ref}
      id="benefits"
      className={`py-16 md:py-24 px-6 transition-all duration-600 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="max-w-[900px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-8">
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-gray-900 dark:text-white tracking-tight">
            Что Overbrain даёт вашей сети
          </h2>
        </div>

        {/* Slider control */}
        <div className="mb-10 max-w-md mx-auto">
          {/* Labels */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setValue(0)}
              className={`text-sm font-semibold transition-colors duration-200 ${
                isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              Доп. прибыль
            </button>
            <button
              onClick={() => setValue(100)}
              className={`text-sm font-semibold transition-colors duration-200 ${
                !isProfit ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              Экономия
            </button>
          </div>

          {/* Range slider */}
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer slider-track"
            style={{
              background: `linear-gradient(to right, #059669 0%, #059669 ${value}%, #e5e7eb ${value}%, #e5e7eb ${value}%, #2563eb ${value}%, #2563eb 100%)`,
            }}
          />

          <style>{`
            .slider-track::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: white;
              border: 3px solid ${isProfit ? '#059669' : '#2563eb'};
              box-shadow: 0 1px 3px rgba(0,0,0,0.15);
              cursor: pointer;
              transition: border-color 0.2s;
            }
            .slider-track::-moz-range-thumb {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: white;
              border: 3px solid ${isProfit ? '#059669' : '#2563eb'};
              box-shadow: 0 1px 3px rgba(0,0,0,0.15);
              cursor: pointer;
              transition: border-color 0.2s;
            }
          `}</style>
        </div>

        {/* Cards grid */}
        <div
          key={isProfit ? 'profit' : 'savings'}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300"
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
              >
                <div className={`shrink-0 w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mt-0.5`}>
                  <Icon className={`w-4.5 h-4.5 ${iconText}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
