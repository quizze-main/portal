import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import { useFadeInOnScroll } from '@/hooks/useFadeInOnScroll';
import { Quote } from 'lucide-react';
import { Card } from '@/components/ui/card';

const counters = [
  { end: 14, suffix: '', label: 'дней до первых результатов' },
  { end: 30, suffix: '+', label: 'мин экономии в день' },
  { end: 0, suffix: '', label: 'приложений для установки' },
  { end: 3, suffix: '', label: 'дня на подключение' },
] as const;

const testimonials = [
  {
    quote: 'Время на сверку KPI сократилось с 2 часов до 5 минут',
    role: 'Директор по развитию',
    company: 'Сеть оптик, 12 филиалов',
  },
  {
    quote: 'Менеджеры наконец видят, как их работа влияет на зарплату. Текучка снизилась',
    role: 'HR-директор',
    company: 'Сеть электроники',
  },
  {
    quote: 'Подключили за 3 дня, никаких проблем с текущей ERP',
    role: 'IT-директор',
    company: 'Fashion-ритейл, 8 филиалов',
  },
];

function Counter({ end, suffix, label, enabled }: { end: number; suffix: string; label: string; enabled: boolean }) {
  const value = useAnimatedCounter({ end, duration: 1800, enabled });

  return (
    <Card className="text-center p-6">
      <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
        {value}{suffix}
      </div>
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
    </Card>
  );
}

export function LandingSocialProof() {
  const { ref, isVisible } = useFadeInOnScroll();

  return (
    <section className={`py-16 md:py-24 px-6 transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div ref={ref} className="max-w-[1100px] mx-auto">
        {/* Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {counters.map((c) => (
            <Counter key={c.label} end={c.end} suffix={c.suffix} label={c.label} enabled={isVisible} />
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <Card key={t.role} className="p-6 md:p-8">
              <Quote className="w-8 h-8 text-primary/20 mb-4" />
              <blockquote className="text-lg font-semibold text-foreground leading-relaxed mb-4">
                {t.quote}
              </blockquote>
              <div>
                <p className="text-sm font-medium text-foreground">{t.role}</p>
                <p className="text-xs text-muted-foreground">{t.company}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
