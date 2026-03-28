import { useState, useRef, useEffect } from 'react';
import { LandingSection } from './LandingSection';
import { Slider } from '@/components/ui/slider';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import {
  BASE_PRICE,
  SUBSCRIPTION_PERIODS,
  SUBSCRIPTION_FEATURES,
  IMPL_ITEMS,
  getSubscriptionPrice,
  getImplPricing,
  pluralBranch,
  formatPrice,
} from './pricingData';

interface LandingPricingProps {
  onRequestDemo: () => void;
}

export function LandingPricing({ onRequestDemo }: LandingPricingProps) {
  return (
    <LandingSection id="pricing">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Прозрачная стоимость</h2>
        <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
          Выберите подходящий период оплаты и получите скидку до 20%
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
        <SubscriptionCard onRequestDemo={onRequestDemo} />
        <ImplementationCard onRequestDemo={onRequestDemo} />
      </div>
    </LandingSection>
  );
}

/* ── helpers ──────────────────────────────────────────────── */

/** Animated counter that transitions from the previous value (not from 0). */
function useSmoothPrice(target: number) {
  const prevRef = useRef(target);
  const [from, setFrom] = useState(target);

  useEffect(() => {
    setFrom(prevRef.current);
    prevRef.current = target;
  }, [target]);

  return useAnimatedCounter({ end: target, start: from, duration: 500 });
}

/* ── Subscription Card ───────────────────────────────────── */

function SubscriptionCard({ onRequestDemo }: { onRequestDemo: () => void }) {
  const [periodIndex, setPeriodIndex] = useState(2);
  const pricing = getSubscriptionPrice(periodIndex);
  const animatedPrice = useSmoothPrice(pricing.discounted);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 md:p-7 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg md:text-xl font-bold">Подписка OverBrain</h3>
        {pricing.discountPercent > 0 && (
          <DiscountBadge value={`-${pricing.discountPercent}%`} />
        )}
      </div>

      {/* Period selector */}
      <div className="mb-5">
        <p className="text-sm text-muted-foreground mb-2">Период оплаты:</p>
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl inline-flex gap-0.5 w-full md:w-auto">
          {SUBSCRIPTION_PERIODS.map((p, i) => (
            <button
              key={p.months}
              onClick={() => setPeriodIndex(i)}
              className={`relative flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
                i === periodIndex
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {p.label}
              {p.badgeLabel && i !== periodIndex && (
                <span className="absolute -top-2.5 -right-1 text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {p.badgeLabel}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-3xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatPrice(animatedPrice)} ₽
          </span>
          <span className="text-sm text-muted-foreground">/ филиал / мес</span>
        </div>
        {pricing.discountPercent > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(BASE_PRICE)} ₽
            </span>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              Экономия {formatPrice(pricing.totalSavings)} ₽
            </span>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="space-y-2.5 mb-6 flex-1">
        {SUBSCRIPTION_FEATURES.map((f) => (
          <div key={f.label} className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <f.icon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium">{f.label}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onRequestDemo}
        className="w-full h-11 md:h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-sm mt-auto"
      >
        Оставить заявку
      </button>
    </div>
  );
}

/* ── Implementation Card ─────────────────────────────────── */

function ImplementationCard({ onRequestDemo }: { onRequestDemo: () => void }) {
  const [branchCount, setBranchCount] = useState(5);
  const pricing = getImplPricing(branchCount);

  const animatedTotal = useSmoothPrice(pricing.total);
  const animatedPerBranch = useSmoothPrice(pricing.perBranch);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 md:p-7 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg md:text-xl font-bold">Внедрение и настройка</h3>
        {pricing.discountPercent > 0 && (
          <DiscountBadge value={`-${pricing.discountPercent}%`} />
        )}
      </div>

      {/* Branch slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Филиалов:</span>
          <span className="text-base font-bold bg-gray-100 dark:bg-gray-800 w-9 h-9 rounded-lg flex items-center justify-center">
            {branchCount}
          </span>
        </div>
        <Slider
          value={[branchCount]}
          onValueChange={([v]) => setBranchCount(v)}
          min={1}
          max={10}
          step={1}
          aria-label="Количество филиалов"
          className="[&>span>span]:!bg-blue-600 [&>span[role=slider]]:!border-blue-600"
        />
        <div className="relative h-5 mt-1.5 text-xs text-muted-foreground">
          {[1, 3, 5, 7, 10].map((n) => (
            <span
              key={n}
              className={`absolute -translate-x-1/2 ${n === branchCount ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}`}
              style={{ left: `${((n - 1) / 9) * 100}%` }}
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="text-3xl md:text-4xl font-bold">
          {formatPrice(animatedTotal)} ₽
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">
            {formatPrice(animatedPerBranch)} ₽ / филиал
          </span>
          {pricing.discountPercent > 0 && (
            <DiscountBadge value={`-${pricing.discountPercent}%`} />
          )}
        </div>
      </div>

      {/* What's included */}
      <div className="mb-6 flex-1">
        <p className="text-sm text-muted-foreground mb-2.5 flex items-center gap-1">
          <span className="text-green-500">&#10003;</span> Что входит:
        </p>
        <div className="space-y-2.5">
          {IMPL_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <item.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-tight">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onRequestDemo}
        className="w-full h-11 md:h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 transition-all duration-200 shadow-sm mt-auto"
      >
        Получить расчёт для {branchCount} {pluralBranch(branchCount)}
      </button>
    </div>
  );
}

/* ── Shared ───────────────────────────────────────────────── */

function DiscountBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
      {value}
    </span>
  );
}
