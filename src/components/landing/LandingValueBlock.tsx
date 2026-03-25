import { LandingSection } from './LandingSection';
import {
  BarChart3, Wallet, AlertTriangle, MessageSquare, Trophy, TrendingUp,
  MessageCircle, BookOpen, Calculator, LayoutDashboard, CalendarDays, Zap,
  type LucideIcon,
} from 'lucide-react';

interface BenefitCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

const PROFIT_CARDS: BenefitCard[] = [
  { icon: BarChart3, title: 'Точки роста — на виду', description: 'Менеджеры видят свои KPI и знают, что нужно сделать, чтобы увеличить выручку сегодня' },
  { icon: Wallet, title: 'Каждая продажа = рост дохода', description: 'Сотрудник видит, как каждая продажа влияет на его зарплату. Мотивация растёт сама' },
  { icon: AlertTriangle, title: 'Допродажи по подсказке', description: 'Система подсвечивает возможности для up-sell на основе истории покупок клиента' },
  { icon: MessageSquare, title: 'Клиент возвращается', description: 'Контроль качества и стандартов повышает лояльность и увеличивает LTV клиента' },
  { icon: Trophy, title: 'Здоровая конкуренция', description: 'Прозрачные рейтинги по выручке, конверсии и CSI. Лучшие видны, остальные подтягиваются' },
  { icon: TrendingUp, title: 'Прогноз до конца месяца', description: 'Узнайте, выполните ли план — пока ещё есть время скорректировать курс' },
];

const SAVINGS_CARDS: BenefitCard[] = [
  { icon: MessageCircle, title: 'Быстрый доступ', description: 'Вся необходимая информация под рукой — с любого устройства через веб-приложение' },
  { icon: BookOpen, title: 'Обучение без тренеров', description: 'Инструкции и стандарты всегда под рукой. Новый сотрудник учится сам' },
  { icon: Calculator, title: 'Честные планы', description: 'Система автоматически корректирует план под реальный график каждого сотрудника' },
  { icon: LayoutDashboard, title: 'Одно окно вместо пяти', description: 'ERP, аналитика, задачи и база знаний — в одном интерфейсе. Экономия 30+ минут в день' },
  { icon: CalendarDays, title: 'Графики без Excel', description: 'Визуальный календарь смен с шаблонами — планирование за минуты, а не часы' },
  { icon: Zap, title: 'Задачи в один клик', description: 'Уведомление → клик → задача открыта. Без поиска и логинов' },
];

const VARIANTS = {
  profit: { title: 'Больше прибыли без увеличения штата', id: 'benefits', cards: PROFIT_CARDS, gray: false },
  savings: { title: 'Экономьте — не теряя в качестве', id: 'savings', cards: SAVINGS_CARDS, gray: true },
};

export function LandingValueBlock({ variant }: { variant: 'profit' | 'savings' }) {
  const config = VARIANTS[variant];

  return (
    <LandingSection id={config.id} gray={config.gray}>
      <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-center text-gray-900 dark:text-white mb-4">
        {config.title}
      </h2>
      <div className="w-12 h-0.5 bg-blue-600 mx-auto mb-12" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {config.cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="flex gap-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </LandingSection>
  );
}
