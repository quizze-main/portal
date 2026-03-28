import { LandingSection } from './LandingSection';
import { Button } from '@/components/ui/button';
import {
  Layers, ArrowRight, CheckCircle2,
  BarChart3, Wallet, BookOpen, Users, ClipboardList, MessageCircle,
  Zap, Puzzle, Settings,
} from 'lucide-react';

/* ── Pain points that resonate with retail network owners ── */
const PAIN_POINTS = [
  'Данные в трёх системах, а картины по сети нет',
  'Сотрудники не знают свой KPI до конца месяца',
  'Обучение — устно, от коллеги к коллеге',
  'Руководитель узнаёт о проблеме, когда уже поздно',
];

/* ── What the platform gives — outcome-first ── */
const CAPABILITIES = [
  {
    icon: BarChart3,
    title: 'Все данные — в одном окне',
    description: '1С, CRM, кассы, трекеры — Overbrain собирает метрики из разных источников и показывает единую картину по всей сети.',
  },
  {
    icon: Wallet,
    title: 'Прозрачная мотивация',
    description: 'Сотрудник видит свою зарплату в реальном времени. Понимает, за что получает и как заработать больше.',
  },
  {
    icon: BookOpen,
    title: 'База знаний и обучение',
    description: 'Корпоративная wiki заменяет устное обучение. Новый сотрудник учится сам — без выделенного тренера.',
  },
  {
    icon: Users,
    title: 'Оргструктура и коммуникации',
    description: 'Прозрачная иерархия, целевые рассылки по ролям и филиалам. Информация доходит до нужных людей.',
  },
  {
    icon: ClipboardList,
    title: 'Задачи и контроль качества',
    description: 'Система сама ставит задачи и подсвечивает отклонения в работе — пропущенные сделки, низкий CSI, невыполненные стандарты. Проблемы не накапливаются.',
  },
  {
    icon: MessageCircle,
    title: 'Веб-приложение без установки',
    description: 'Открывается в браузере на любом устройстве — телефон, планшет, компьютер. Никаких скачиваний и обновлений. Рассылки и уведомления для всей команды прямо в приложении.',
  },
];

/* ── Two deployment modes ── */
const MODES = [
  {
    icon: Puzzle,
    title: 'Надстройка',
    subtitle: 'Layer 2 над вашими системами',
    description: 'Подключается к 1С, CRM, ERP через API. Не изменяет вашу инфраструктуру — просто раскрывает данные, которые уже есть.',
    points: [
      'Простая в настройке интеграция',
      'Ваши системы продолжают работать как раньше',
      'Данные подтягиваются автоматически',
    ],
  },
  {
    icon: Settings,
    title: 'Самостоятельная платформа',
    subtitle: 'Всё из коробки — без внешних систем',
    description: 'Оргструктура, метрики, задачи, база знаний и мотивация — настраиваются вручную. Полноценный инструмент для управления сетью.',
    points: [
      'Работает без ERP и CRM',
      'Все модули доступны сразу',
      'Идеально для быстрорастущих сетей',
    ],
  },
];

interface LandingLayer2Props {
  onRequestDemo?: () => void;
}

export function LandingLayer2({ onRequestDemo }: LandingLayer2Props) {
  return (
    <LandingSection id="layer2">
      {/* ── Header ── */}
      <div className="text-center mb-14 md:mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-5 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          Зачем это нужно
        </div>

        <h2 className="text-[1.75rem] md:text-[2.5rem] font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight max-w-3xl mx-auto">
          Ваши системы хранят данные.{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Overbrain превращает их в рост продаж.
          </span>
        </h2>

        <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Розничная сеть теряет деньги не потому, что данных мало — а потому что они не работают. Overbrain собирает метрики из ваших систем и даёт команде инструменты, которых нет в стандартных ERP.
        </p>
      </div>

      {/* ── Pain → Solution ── */}
      <div className="mb-14 md:mb-20">
        <div className="rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50/40 dark:bg-red-900/10 p-6 md:p-8 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-4">
            Знакомо?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAIN_POINTS.map((point) => (
              <div key={point} className="flex items-start gap-2.5">
                <span className="text-red-400 dark:text-red-500 mt-0.5 shrink-0 text-sm">✕</span>
                <span className="text-gray-600 dark:text-gray-400 text-sm">{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm">
            <ArrowRight className="w-4 h-4 rotate-90" />
            Overbrain решает это
          </div>
        </div>

        {/* Capabilities grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 md:p-6 hover:border-blue-200 dark:hover:border-blue-800/50 hover:shadow-md transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                  <Icon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5">{cap.title}</h4>
                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{cap.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Two modes ── */}
      <div>
        <div className="text-center mb-8">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Два режима — вы выбираете
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-xl mx-auto">
            Подключите к текущим системам или используйте как самостоятельный инструмент
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <div
                key={mode.title}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-base">{mode.title}</h4>
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">{mode.subtitle}</span>
                  </div>
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mt-3 mb-4">
                  {mode.description}
                </p>

                <ul className="space-y-2.5">
                  {mode.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span className="text-gray-600 dark:text-gray-300 text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <Button
            size="lg"
            onClick={onRequestDemo}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base px-8 h-13 font-semibold shadow-md transition-all duration-200"
          >
            Внедрить в мой бизнес
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </LandingSection>
  );
}
