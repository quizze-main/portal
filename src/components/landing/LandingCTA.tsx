import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';

interface LandingCTAProps {
  onRequestDemo: () => void;
  telegramLink?: string;
}

export function LandingCTA({ onRequestDemo, telegramLink = 'https://t.me/overbrain_bot' }: LandingCTAProps) {
  return (
    <section className="relative py-16 md:py-24 px-6 overflow-hidden">
      {/* Solid gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-800 dark:via-indigo-800 dark:to-blue-900" />

      <div className="max-w-[800px] mx-auto text-center relative z-10">
        <h2 className="text-[1.75rem] md:text-[2.5rem] font-bold text-white mb-4 tracking-tight">
          Запустите пилот за 3 дня
        </h2>
        <p className="text-lg text-white/70 mb-4">
          Бесплатно. Без миграции. Результат с первой недели.
        </p>
        <p className="text-sm text-white/50 mb-10">
          Overbrain работает поверх ваших систем — менять ничего не нужно
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={onRequestDemo}
            className="gap-2 bg-white text-blue-700 hover:bg-gray-100 rounded-xl text-base px-8 h-13 font-semibold shadow-md transition-all duration-200"
          >
            Запросить демонстрацию
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="gap-2 rounded-xl text-base px-8 h-13 bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-200"
          >
            <a href={telegramLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" />
              Написать в Telegram
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
