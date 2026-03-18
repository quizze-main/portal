import { useEffect, useState } from 'react';

interface KPIGaugeChartProps {
  value: number;        // Значение отклонения (-8, +12, и т.д.)
  size?: number;        // Размер контейнера (по умолчанию 80)
  originalSize?: number; // Оригинальный размер для расчёта шрифта
}

export function KPIGaugeChart({ value, size = 80, originalSize }: KPIGaugeChartProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Ограничиваем значение от -100 до +100
  const clampedValue = Math.max(-100, Math.min(100, value));

  // Угол стрелки: удвоенная чувствительность (1% = 1.8°), ±50% достигает крайних позиций
  const rawAngle = (clampedValue / 100) * 90 * 2;
  const targetAngle = Math.max(-90, Math.min(90, rawAngle));
  const markerAngle = animated ? targetAngle : 0;

  // Цвет маркера в зависимости от значения
  const isPositive = value >= 0;
  const markerColor = isPositive ? '#10B981' : '#EF4444';

  // Размер шрифта (используем originalSize для соответствия DonutChart)
  const fontBaseSize = originalSize || size;

  const roundedValue = Math.round(value);
  const mainText = `${roundedValue >= 0 ? '+' : ''}${roundedValue}`;
  const displayText = `${mainText}%`;
  const baseCenterFontPx =
    fontBaseSize <= 36 ? 8 :
    fontBaseSize <= 48 ? 10 :
    fontBaseSize <= 56 ? 12 :
    fontBaseSize <= 64 ? 14 :
    16;
  const digitTightenPx = Math.abs(roundedValue) >= 100 ? 3 : 0;
  const centerFontPx = Math.max(6, baseCenterFontPx - digitTightenPx);

  // Геометрия gauge (полукруг 180°)
  const cx = 50;
  const cy = 72; // Подняли gauge ближе к центру для лучшего вертикального баланса
  const r = 38;
  const strokeW = 11; // Совпадает с толщиной кольца доната (OUTER_R - INNER_R = 0.11)

  const MAX_DEV = 50;
  const clampDev = (v: number) => Math.max(-MAX_DEV, Math.min(MAX_DEV, v));
  const devToPoint = (dev: number) => {
    const t = clampDev(dev);
    const ang = (t / MAX_DEV) * 90;
    const rad = (ang * Math.PI) / 180;
    return {
      x: cx + r * Math.sin(rad),
      y: cy - r * Math.cos(rad),
    };
  };
  const arcPath = (fromDev: number, toDev: number) => {
    const p1 = devToPoint(fromDev);
    const p2 = devToPoint(toDev);
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  };

  // Позиция маркера на дуге
  const markerDev = clampDev(clampedValue);
  const markerPoint = devToPoint(markerDev);
  const markerTarget = animated ? markerPoint : devToPoint(0);

  // Текст по центру gauge
  const textY = cy - 4;

  const FONT_FAMILY =
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

  return (
    <div className="relative z-10" style={{ width: size, height: size }}>
      <svg
        viewBox="0 8 100 84"
        className="w-full h-full relative z-10 overflow-visible"
        style={{
          fontFamily: FONT_FAMILY,
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Фоновая дуга */}
        <path
          d={arcPath(-MAX_DEV, MAX_DEV)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeW}
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Красный сегмент: -50% до -5% */}
        <path
          d={arcPath(-MAX_DEV, -5)}
          fill="none"
          stroke="#EF4444"
          strokeWidth={strokeW}
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Зелёный сегмент: +5% до +50% */}
        <path
          d={arcPath(5, MAX_DEV)}
          fill="none"
          stroke="#10B981"
          strokeWidth={strokeW}
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Жёлтый сегмент: -5% до +5% (рисуем последним поверх) */}
        <path
          d={arcPath(-5, 5)}
          fill="none"
          stroke="#EAB308"
          strokeWidth={strokeW}
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Круглый маркер на дуге вместо треугольника-иголки */}
        <circle
          cx={markerTarget.x}
          cy={markerTarget.y}
          r="4"
          fill="hsl(var(--background))"
          stroke="hsl(var(--foreground))"
          strokeWidth="2.5"
          filter="url(#marker-shadow)"
          style={{
            transition: animated ? 'cx 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), cy 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
          }}
        />
      </svg>

      {/* Значение в центре */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-center font-semibold transition-opacity duration-500"
        style={{
          paddingTop: size * 0.32,
          fontSize: centerFontPx,
          color: markerColor,
          opacity: animated ? 1 : 0,
          fontFamily: FONT_FAMILY,
        }}
      >
        {displayText}
      </div>
    </div>
  );
}
