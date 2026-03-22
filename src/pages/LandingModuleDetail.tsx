import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { getModuleBySlug, getRelatedModules, SCREENSHOT_MAP, MODULE_HERO_SCREENSHOTS } from '@/components/landing/moduleData';
import type { ModuleData, ModuleFeature } from '@/components/landing/moduleData';
import { FeatureMockup, ScreenshotMockup } from '@/components/landing/BrowserMockup';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useFadeInOnScroll } from '@/hooks/useFadeInOnScroll';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

export default function LandingModuleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [demoOpen, setDemoOpen] = useState(false);
  const module = getModuleBySlug(slug || '');

  if (!module) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <LandingNavbar onRequestDemo={() => setDemoOpen(true)} />
        <div className="flex flex-col items-center justify-center py-32 px-6">
          <h1 className="text-2xl font-bold mb-4">Модуль не найден</h1>
          <Link to="/landing" className="text-primary hover:underline flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Вернуться на главную
          </Link>
        </div>
        <LandingFooter />
      </div>
    );
  }

  const relatedModules = getRelatedModules(module.relatedModules);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <LandingNavbar onRequestDemo={() => setDemoOpen(true)} />
      <ModuleHero module={module} onRequestDemo={() => setDemoOpen(true)} />

      {module.features.map((feature, i) => (
        <FeatureSection key={i} feature={feature} index={i} />
      ))}

      <RelatedModulesSection modules={relatedModules} />

      {/* CTA */}
      <section className="relative py-16 md:py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-800 dark:via-indigo-800 dark:to-blue-900" />

        <div className="max-w-[800px] mx-auto text-center relative z-10">
          <h2 className="text-[1.75rem] md:text-[2.5rem] font-bold text-white mb-4 tracking-tight">
            Готовы попробовать {module.name}?
          </h2>
          <p className="text-lg text-white/70 mb-10">
            Бесплатный пилот 14 дней. Подключение за 3 дня.
          </p>
          <Button
            size="lg"
            onClick={() => setDemoOpen(true)}
            className="gap-2 bg-white text-blue-700 hover:bg-gray-100 rounded-xl text-base px-8 h-13 font-semibold shadow-md transition-all duration-200"
          >
            Запросить демонстрацию
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      <LandingFooter />
      <DemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}

function ModuleHero({ module, onRequestDemo }: { module: ModuleData; onRequestDemo: () => void }) {
  const Icon = module.icon;

  return (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          {/* Category badge */}
          <div className="inline-flex items-center gap-2.5 mb-6 px-4 py-2 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className={`w-8 h-8 rounded-xl ${module.color} flex items-center justify-center shadow-md`}>
              <Icon className={`w-4 h-4 ${module.iconColor}`} />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{module.category}</span>
          </div>

          <h1 className="text-[2.2rem] md:text-[3.5rem] leading-[1.08] font-bold mb-6 max-w-3xl mx-auto tracking-tight text-gray-900 dark:text-white">
            {module.heroTitle}
          </h1>

          <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {module.heroDescription}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={onRequestDemo}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base px-8 h-13 font-semibold shadow-md transition-all duration-200"
            >
              Начать сейчас — это бесплатно
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onRequestDemo}
              className="gap-2 rounded-xl text-base px-8 h-13 border-gray-200 dark:border-gray-700"
            >
              Встреча с экспертом
            </Button>
          </div>
        </div>

        {/* Main screenshot */}
        <div className="max-w-[900px] mx-auto">
          {MODULE_HERO_SCREENSHOTS[module.slug] ? (
            <ScreenshotMockup {...MODULE_HERO_SCREENSHOTS[module.slug]} className="shadow-lg shadow-gray-200/50 dark:shadow-black/20" />
          ) : (
            <FeatureMockup label={`Скриншот: ${module.name}`} className="shadow-lg shadow-gray-200/50 dark:shadow-black/20" />
          )}
        </div>
      </div>
    </section>
  );
}

function FeatureSection({ feature, index }: { feature: ModuleFeature; index: number }) {
  const { ref, isVisible } = useFadeInOnScroll();
  const isReversed = index % 2 === 1;

  return (
    <section
      ref={ref}
      className={`py-16 md:py-24 px-6 transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}`}
    >
      <div className="max-w-[1100px] mx-auto">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center ${isReversed ? 'md:[direction:rtl]' : ''}`}>
          {/* Text side */}
          <div className={isReversed ? 'md:[direction:ltr]' : ''}>
            <h2 className="text-2xl md:text-[2rem] font-bold text-gray-900 dark:text-white mb-4 leading-tight tracking-tight">
              {feature.title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-base md:text-lg mb-8">
              {feature.description}
            </p>

            {feature.bullets && (
              <ul className="space-y-4">
                {feature.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Screenshot side */}
          <div className={isReversed ? 'md:[direction:ltr]' : ''}>
            {feature.mockupType && SCREENSHOT_MAP[feature.mockupType] ? (
              <ScreenshotMockup {...SCREENSHOT_MAP[feature.mockupType]} className="shadow-lg shadow-gray-200/50 dark:shadow-black/20" />
            ) : (
              <FeatureMockup label={feature.mockupType || 'Скриншот'} className="shadow-lg shadow-gray-200/50 dark:shadow-black/20" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function RelatedModulesSection({ modules }: { modules: ModuleData[] }) {
  const { ref, isVisible } = useFadeInOnScroll();

  return (
    <section
      ref={ref}
      className={`py-16 md:py-24 px-6 transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-4 uppercase tracking-wider">
            Связанные модули
          </div>
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            Ещё больше возможностей
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Легко подключайте новые модули по мере расширения бизнеса
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.slug}
                to={`/landing/module/${mod.slug}`}
                className="group flex flex-col items-center text-center w-32 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800/50 hover:shadow-md transition-all duration-200 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-2xl ${mod.color} flex items-center justify-center mb-3 shadow-md group-hover:shadow-lg transition-shadow duration-200`}>
                  <Icon className={`w-7 h-7 ${mod.iconColor}`} />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors leading-tight">
                  {mod.name}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/landing"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
          >
            Все модули
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function DemoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onOpenChange(false);
    }, 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Запросить демонстрацию</DialogTitle>
          <DialogDescription>
            Оставьте контакты — мы свяжемся в течение дня
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <Send className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium">Заявка отправлена!</p>
            <p className="text-sm text-muted-foreground mt-1">Мы свяжемся с вами в ближайшее время</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="company">Компания</Label>
              <Input id="company" placeholder="Название вашей сети" required />
            </div>
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input id="name" placeholder="Как к вам обращаться" required />
            </div>
            <div>
              <Label htmlFor="contact">Телефон или Telegram</Label>
              <Input id="contact" placeholder="+7... или @username" required />
            </div>
            <div>
              <Label htmlFor="message">Комментарий</Label>
              <Textarea id="message" placeholder="Расскажите о вашей сети (необязательно)" rows={3} />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Отправить заявку
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
