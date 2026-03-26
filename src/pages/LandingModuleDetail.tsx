import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { getModuleBySlug, getRelatedModules, SCREENSHOT_MAP, MODULE_HERO_SCREENSHOTS, MODULE_HERO_MOBILE } from '@/components/landing/moduleData';
import type { ModuleData, ModuleFeature, PersonaUseCase, BusinessMetrics } from '@/components/landing/moduleData';
import { FeatureMockup, ScreenshotMockup } from '@/components/landing/BrowserMockup';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, CheckCircle2, TrendingUp, PiggyBank, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 pt-16">
      <LandingNavbar onRequestDemo={() => setDemoOpen(true)} />
      <ModuleHero module={module} onRequestDemo={() => setDemoOpen(true)} />

      {module.features.map((feature, i) => (
        <FeatureSection key={i} feature={feature} index={i} />
      ))}

      {/* Mid-page CTA */}
      <div className="py-6 md:py-8 px-6 text-center">
        <Button
          size="lg"
          onClick={() => setDemoOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg px-12 h-16 font-semibold shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-200 hover:-translate-y-0.5"
        >
          Внедрить в мой бизнес
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <PersonaAndMetricsSection useCases={module.personaUseCases} metrics={module.metrics} />

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
  const heroScreenshot = MODULE_HERO_SCREENSHOTS[module.slug];
  const mobileScreenshot = MODULE_HERO_MOBILE[module.slug];

  return (
    <section className="py-12 md:py-16 px-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-8">
          {/* Category badge */}
          <div className="inline-flex items-center gap-2.5 mb-4 px-4 py-2 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className={`w-8 h-8 rounded-xl ${module.color} flex items-center justify-center shadow-md`}>
              <Icon className={`w-4 h-4 ${module.iconColor}`} />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{module.category}</span>
          </div>

          <h1 className="text-[2.2rem] md:text-[3.5rem] leading-[1.08] font-bold mb-3 max-w-3xl mx-auto tracking-tight text-gray-900 dark:text-white">
            {module.name}
          </h1>

          <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-6 max-w-2xl mx-auto leading-relaxed">
            {module.heroTitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={onRequestDemo}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base px-8 h-13 font-semibold shadow-md transition-all duration-200 min-w-[280px] justify-center"
            >
              Подключить дашборд
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onRequestDemo}
              className="gap-2 rounded-xl text-base px-8 h-13 border-gray-200 dark:border-gray-700 min-w-[280px] justify-center"
            >
              Встреча с экспертом
            </Button>
          </div>
        </div>

        {/* Screenshots — desktop + optional phone overlay */}
        <div className="max-w-[950px] mx-auto relative">
          {/* Desktop mockup */}
          {heroScreenshot ? (
            <ScreenshotMockup {...heroScreenshot} className="shadow-xl shadow-gray-200/50 dark:shadow-black/20" />
          ) : (
            <FeatureMockup label={`Скриншот: ${module.name}`} className="shadow-xl shadow-gray-200/50 dark:shadow-black/20" />
          )}

          {/* Phone mockup — overlapping bottom-right (like main landing hero) */}
          {mobileScreenshot && (
            <div className="hidden sm:block absolute -bottom-6 -right-4 md:-right-8 z-10">
              <div className="relative rounded-[2.5rem] border-[5px] border-gray-800 dark:border-gray-600 bg-gray-800 dark:bg-gray-700 shadow-2xl overflow-hidden w-[200px] h-[433px] md:w-[230px] md:h-[498px]">
                {/* Dynamic Island */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[70px] h-[18px] md:w-[80px] md:h-[20px] bg-black rounded-full z-10" />
                <div className="w-full h-full overflow-hidden rounded-[2rem] bg-white dark:bg-gray-900">
                  <img
                    src={mobileScreenshot.src}
                    alt={mobileScreenshot.alt}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[50px] h-[3px] bg-gray-600 dark:bg-gray-400 rounded-full opacity-50" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FeatureSection({ feature, index }: { feature: ModuleFeature; index: number }) {
  const { ref, isVisible } = useFadeInOnScroll();
  const isReversed = index % 2 === 1;
  const [activeSlide, setActiveSlide] = useState(0);

  // Collect all screenshots: mockupTypes takes precedence, fallback to single mockupType
  const slides = (feature.mockupTypes || (feature.mockupType ? [feature.mockupType] : []))
    .map((type) => SCREENSHOT_MAP[type])
    .filter(Boolean);
  const hasSlider = slides.length > 1;

  return (
    <section
      ref={ref}
      className={`py-12 md:py-16 px-6 transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}`}
    >
      <div className="max-w-[1280px] mx-auto">
        <div className={`grid grid-cols-1 md:grid-cols-[5fr_7fr] gap-8 md:gap-10 items-center ${isReversed ? 'md:[direction:rtl]' : ''}`}>
          {/* Text side */}
          <div className={isReversed ? 'md:[direction:ltr]' : ''}>
            <h2 className="text-2xl md:text-[2rem] font-bold text-gray-900 dark:text-white mb-3 leading-tight tracking-tight">
              {feature.title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-base md:text-lg mb-6">
              {feature.description}
            </p>

            {feature.bullets && (
              <ul className="space-y-3">
                {feature.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Screenshot side — larger with optional slider */}
          <div className={isReversed ? 'md:[direction:ltr]' : ''}>
            {slides.length > 0 ? (
              <div className="relative">
                <ScreenshotMockup
                  {...slides[activeSlide]}
                  className="shadow-lg shadow-gray-200/50 dark:shadow-black/20"
                />

                {hasSlider && (
                  <>
                    <button
                      onClick={() => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer z-10"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer z-10"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </button>

                    <div className="flex justify-center gap-2 mt-3">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSlide(i)}
                          className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                            i === activeSlide
                              ? 'w-6 bg-blue-600'
                              : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
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

function PersonaAndMetricsSection({ useCases, metrics }: { useCases: PersonaUseCase[]; metrics: BusinessMetrics }) {
  const { ref, isVisible } = useFadeInOnScroll();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section
      ref={ref}
      className={`py-10 md:py-14 px-6 bg-gray-50 dark:bg-gray-900/50 transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-4 uppercase tracking-wider">
            Кейсы использования
          </div>
          <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
            Как это работает для каждой роли
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Один инструмент — три перспективы
          </p>
        </div>

        {/* Mobile: tabs */}
        <div className="md:hidden mb-5">
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
            {useCases.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <button
                  key={uc.persona}
                  onClick={() => setActiveTab(i)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === i
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {uc.personaLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile: active card */}
        <div className="md:hidden">
          {useCases[activeTab] && <PersonaCard useCase={useCases[activeTab]} />}
        </div>

        {/* Desktop: 3-column grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-5">
          {useCases.map((uc) => (
            <PersonaCard key={uc.persona} useCase={uc} />
          ))}
        </div>

        {/* Metrics — two cards below personas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {/* Profit */}
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{metrics.profitLabel}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{metrics.profitDescription}</p>
            </div>
          </div>

          {/* Savings */}
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{metrics.savingsLabel}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{metrics.savingsDescription}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PersonaCard({ useCase }: { useCase: PersonaUseCase }) {
  const Icon = useCase.icon;

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 md:p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{useCase.personaLabel}</span>
      </div>

      <div className="mb-4">
        <div className="flex gap-2 mb-2">
          <Quote className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">{useCase.headline}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pl-6">{useCase.description}</p>
      </div>

      <div className="space-y-2.5 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
        {useCase.bullets.map((bullet, i) => (
          <div key={i} className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
            {bullet}
          </div>
        ))}
      </div>
    </div>
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
