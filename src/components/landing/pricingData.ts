import {
  MessageCircle,
  BarChart3,
  BookOpen,
  Trophy,
  Bell,
  Settings,
  Building2,
  ClipboardCheck,
  Users,
  Link,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';

// ── Subscription ──────────────────────────────────────────

export const BASE_PRICE = 14_900; // ₽ / филиал / мес

export interface SubscriptionPeriod {
  months: 3 | 6 | 12;
  label: string;
  discountPercent: number;
  badgeLabel?: string;
}

export const SUBSCRIPTION_PERIODS: SubscriptionPeriod[] = [
  { months: 3, label: '3 месяца', discountPercent: 0 },
  { months: 6, label: '6 месяцев', discountPercent: 10, badgeLabel: '-10%' },
  { months: 12, label: '12 месяцев', discountPercent: 20, badgeLabel: '-20%' },
];

export interface SubscriptionFeature {
  icon: LucideIcon;
  label: string;
}

export const SUBSCRIPTION_FEATURES: SubscriptionFeature[] = [
  { icon: MessageCircle, label: 'Telegram-бот для команды' },
  { icon: BarChart3, label: 'Аналитика KPI и продаж' },
  { icon: BookOpen, label: 'База знаний и стандарты' },
  { icon: Trophy, label: 'Рейтинг менеджеров' },
  { icon: Bell, label: 'Рассылки и дайджесты' },
  { icon: Settings, label: 'Админ-панель управления' },
];

export function getSubscriptionPrice(periodIndex: number) {
  const period = SUBSCRIPTION_PERIODS[periodIndex];
  const discounted = Math.round(BASE_PRICE * (1 - period.discountPercent / 100));
  const savingsPerMonth = BASE_PRICE - discounted;
  const totalSavings = savingsPerMonth * period.months;
  return { discounted, savingsPerMonth, totalSavings, discountPercent: period.discountPercent };
}

// ── Implementation ────────────────────────────────────────

export const IMPL_PRICE_TABLE: Record<number, number> = {
  1: 120_000,
  2: 90_000,
  3: 72_000,
  4: 60_000,
  5: 50_000,
  6: 44_000,
  7: 40_000,
  8: 36_000,
  9: 33_000,
  10: 30_000,
};

export interface ImplementationItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const IMPL_ITEMS: ImplementationItem[] = [
  { icon: Building2, title: 'Структура организации', description: 'Создаём филиалы, отделы и должности в системе' },
  { icon: BookOpen, title: 'База знаний', description: 'Переносим ваши скрипты, инструкции и регламенты' },
  { icon: ClipboardCheck, title: 'Настройка стандартов', description: 'Создаём чек-листы и нормативы для контроля' },
  { icon: Users, title: 'Импорт сотрудников', description: 'Загружаем данные команды в HRM-систему' },
  { icon: Link, title: 'Интеграция с Itigris', description: 'Подключаем синхронизацию с вашей CRM' },
  { icon: GraduationCap, title: 'Обучение команды', description: 'Проводим онлайн-обучение для администраторов' },
];

export function getImplPricing(branches: number) {
  const perBranch = IMPL_PRICE_TABLE[branches] ?? IMPL_PRICE_TABLE[1];
  const total = perBranch * branches;
  const discountPercent = Math.round((1 - perBranch / IMPL_PRICE_TABLE[1]) * 100);
  return { perBranch, total, discountPercent };
}

// ── Helpers ───────────────────────────────────────────────

export function pluralBranch(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'филиал';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'филиала';
  return 'филиалов';
}

export function formatPrice(n: number): string {
  return n.toLocaleString('ru-RU');
}
