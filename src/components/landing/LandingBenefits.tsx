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
    title: 'Руководитель видит всю сеть',
    subtitle: 'Без звонков, отчётов и Excel',
    description: 'Выручка, конверсия, средний чек, CSI — по каждому филиалу и менеджеру. Выставляйте важные метрики для вашего филиала. Данные обновляются автоматически. Вы видите проблему до того, как она станет убытком.',
    bullets: [
      'Сравнение филиалов и менеджеров в одном дашборде',
      'Прогноз выполнения плана до конца месяца',
      'Аномалии и отклонения подсвечиваются автоматически',
    ],
    mockup: <ScreenshotMockup src="/screenshots/rating-dashboard.png" alt="Рейтинги менеджеров" variant="desktop" url="app.overbrain.io/dashboard" className="shadow-sm" />,
  },
  {
    icon: Wallet,
    title: 'Сотрудник знает, сколько заработает',
    subtitle: 'Каждая продажа — видимый рост дохода',
    description: 'Менеджер открывает приложение и видит свою зарплату прямо сейчас. Каждый бонус, каждый KPI-множитель — прозрачно. Это мотивирует продавать больше без давления сверху. А руководитель может показывать на конкретных примерах.',
    bullets: [
      'Расчёт обновляется после каждой продажи',
      'Понятная разбивка: оклад + бонусы + KPI',
      'Сотрудник сам видит, за счёт чего вырасти',
      'Гибкая настройка формул мотивации',
    ],
    mockup: <ScreenshotMockup src="/screenshots/salary-calc-mobile.png" alt="Калькулятор зарплаты" variant="mobile" className="shadow-sm" />,
  },
  {
    icon: CalendarDays,
    title: 'Графики и укомплектованность',
    subtitle: 'Планирование смен без хаоса',
    description: 'Руководитель филиала видит, кто работает, кого не хватает и как график влияет на план продаж. Планирование занимает минуты, а не часы.',
    bullets: [
      'Визуальный календарь с контролем укомплектованности',
      'План автоматически корректируется под график',
      'Сотрудник видит свои смены в приложении',
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
              Ключевые возможности
            </Badge>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-foreground mb-4 tracking-tight leading-snug">
              Каждый в команде получает свой инструмент.
              <br />
              <span className="text-muted-foreground">Данные обновляются сами.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Руководитель управляет по цифрам, сотрудник понимает свой доход, филиал работает как часы
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
                      <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-700 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
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
