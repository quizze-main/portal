import { ScreenshotMockup } from './BrowserMockup';
import { useFadeInOnScroll } from '@/hooks/useFadeInOnScroll';
import { BarChart3, Wallet, CalendarDays } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function FadeIn({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useFadeInOnScroll();
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}>
      {children}
    </div>
  );
}

interface FeatureBlock {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  mockup: React.ReactNode;
}

const FEATURES: FeatureBlock[] = [
  {
    icon: BarChart3,
    title: '40+ виджетов KPI',
    subtitle: 'Вся сеть на одном экране',
    description: 'Не нужно собирать данные из разных систем. Дашборд показывает ключевые метрики всех филиалов — выручка, конверсия, средний чек, CSI.',
    bullets: [
      'Drag-and-drop настройка виджетов',
      'Фильтрация по филиалам и периодам',
      'Рейтинги менеджеров в реальном времени',
    ],
    mockup: <ScreenshotMockup src="/screenshots/dashboard-full.png" alt="KPI-дашборд с виджетами" variant="desktop" url="app.overbrain.io/dashboard" className="shadow-sm" />,
  },
  {
    icon: Wallet,
    title: 'Прозрачная мотивация',
    subtitle: 'Расчёт зарплаты онлайн',
    description: 'Сотрудник видит, сколько заработает от каждой продажи. Каждый KPI, каждый бонус — в реальном времени.',
    bullets: [
      'Автоматический расчёт по формуле мотивации',
      'Про-рейтинг под график сотрудника',
      'Понятная разбивка: оклад + бонусы + KPI',
    ],
    mockup: <ScreenshotMockup src="/screenshots/salary-calc-mobile.png" alt="Калькулятор зарплаты" variant="mobile" className="shadow-sm" />,
  },
  {
    icon: CalendarDays,
    title: 'Графики смен',
    subtitle: 'Планирование без Excel',
    description: 'Визуальный календарь с шаблонами. Планирование за минуты, связь с расчётом зарплаты автоматическая.',
    bullets: [
      'Шаблоны смен (2/2, 5/2 и кастомные)',
      'Контроль укомплектованности',
      'Автоматический про-рейтинг плана',
    ],
    mockup: <ScreenshotMockup src="/screenshots/profile-schedule-mobile.png" alt="Календарь смен" variant="mobile" className="shadow-sm" />,
  },
];

export function LandingBenefits() {
  return (
    <section id="features" className="py-16 md:py-24 px-6 bg-muted/50">
      <div className="max-w-[1200px] mx-auto">
        <FadeIn>
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 uppercase tracking-wider">
              Возможности
            </Badge>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-foreground mb-4 tracking-tight leading-snug">
              Данные в реальном времени.
              <br />
              <span className="text-muted-foreground">Никакого ручного труда.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Все данные из ERP, CRM и аналитики автоматически собираются в единый интерфейс
            </p>
          </div>
        </FadeIn>

        {/* Feature showcase blocks — alternating text/mockup */}
        <div className="space-y-16 md:space-y-24">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            const isReversed = i % 2 === 1;
            return (
              <FadeIn key={feature.title}>
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center ${isReversed ? 'md:[direction:rtl]' : ''}`}>
                  {/* Text side */}
                  <div className={isReversed ? 'md:[direction:ltr]' : ''}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Mockup side */}
                  <div className={isReversed ? 'md:[direction:ltr]' : ''}>
                    {feature.mockup}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
