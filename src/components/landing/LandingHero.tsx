import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle, Search, TrendingUp, Database, Check } from 'lucide-react';
import { BrowserMockup } from './BrowserMockup';

interface LandingHeroProps {
  onRequestDemo: () => void;
  telegramLink?: string;
}

const VALUE_PROPS = [
  'Найдём точки потерь по филиалам',
  'Поднимем эффективность менеджеров',
  'Подключимся к вашим данным за дни',
];

export function LandingHero({ onRequestDemo, telegramLink = 'https://t.me/overbrain_bot' }: LandingHeroProps) {
  return (
    <section className="relative py-12 md:py-20 px-6">
      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Layer 2 badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
            Layer 2 RETAIL
          </span>
        </div>

        {/* Headline — lead with pain */}
        <h1 className="text-center text-[2.5rem] md:text-[3.5rem] leading-[1.1] font-bold mb-4 max-w-4xl mx-auto tracking-tight">
          <span className="text-gray-900 dark:text-white">Вы знаете, где ваша сеть </span>
          <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            теряет деньги?
          </span>
        </h1>

        {/* Description */}
        <p className="text-center text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed">
          Overbrain — надстройка над вашей ERP. Находит потери, мотивирует команду и поднимает базовый уровень продаж по всей сети.
        </p>

        {/* Value props — compact inline checks */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10">
          {VALUE_PROPS.map((text) => (
            <div key={text} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{text}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button
            size="lg"
            onClick={onRequestDemo}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base px-8 h-13 shadow-md transition-all duration-200"
          >
            Запросить демонстрацию
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="gap-2 rounded-xl text-base px-8 h-13 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200"
          >
            <a href={telegramLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" />
              Встреча с экспертом
            </a>
          </Button>
        </div>

        <p className="text-center text-sm text-gray-400">
          Бесплатный пилот 14 дней · Подключение за 3 дня
        </p>

        {/* Dashboard screenshot */}
        <div className="mt-16 max-w-[950px] mx-auto">
          <BrowserMockup className="shadow-xl shadow-gray-200/50 dark:shadow-black/20" url="app.overbrain.io/dashboard" noBackground>
            <img
              src="/screenshots/dashboard-full.png"
              alt="Overbrain KPI Dashboard"
              className="w-full h-auto"
            />
          </BrowserMockup>
        </div>
      </div>
    </section>
  );
}
