import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KPIGaugeChart } from './KPIGaugeChart';

interface KPIDonutChartProps {
  value: number;
  maxValue: number;
  forecast?: number; // Прогноз в % (например, 92 или 115 для перевыполнения)
  displayValue?: string; // Что показывать в центре (например "185" или "80%")
  color: string;
  size?: number;
  isDeviation?: boolean; // Режим отклонения (цветной текст + цветная обводка)
  isCompact?: boolean; // Компактный режим без увеличения gauge
}

// Функция для затемнения цвета (для перевыполнения)
const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
};

export function KPIDonutChart({ value, maxValue, forecast, displayValue, color, size, isDeviation = false, isCompact = false }: KPIDonutChartProps) {
  const [animated, setAnimated] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredSize, setMeasuredSize] = useState<number>(size ?? 0);
  
  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Если size не передан — подстраиваемся под размер контейнера (responsive)
  useEffect(() => {
    if (typeof size === 'number' && Number.isFinite(size)) {
      setMeasuredSize(size);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const next = Math.max(1, Math.round(Math.min(cr.width, cr.height)));
      setMeasuredSize(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [size]);

  const effectiveSize = useMemo(() => {
    if (typeof size === 'number' && Number.isFinite(size)) return size;
    return measuredSize > 0 ? measuredSize : 48;
  }, [size, measuredSize]);

  const hasExplicitSize = typeof size === 'number' && Number.isFinite(size);
  const wrapperStyle = hasExplicitSize
    ? { width: size, height: size }
    : { width: '100%', aspectRatio: '1 / 1' };

  const factPercent =
    maxValue > 0 ? Math.min(Math.round((value / maxValue) * 100), 100) : 0;
  const forecastPercent = forecast ?? factPercent;
  const isOverachieving = forecastPercent > 100;
  
  // Определяем текст для отображения в центре
  const centerText = displayValue || `${forecastPercent}%`;
  
  // Font size based on chart size (как было до общей функции)
  const baseCenterFontPx =
    effectiveSize <= 36 ? 8 :
    effectiveSize <= 48 ? 10 :
    effectiveSize <= 56 ? 11 :
    effectiveSize <= 64 ? 14 :
    16;
  const centerFontPx = isCompact ? Math.max(8, baseCenterFontPx - 2) : baseCenterFontPx;
  const INNER_R = 0.36;
  const OUTER_R = 0.47;
  
  // Режим отклонения: спидометр (gauge)
  if (isDeviation) {
    const deviationValue = parseFloat(displayValue || '0');
    // Важно: чтобы круговые и полукруглые виджеты были ОДИНАКОВОГО размера,
    // спидометр всегда рендерим 1:1 внутри того же квадратного контейнера.
    const gaugeSize = effectiveSize;
    const gaugeWrapperStyle = wrapperStyle;
    return (
      <div ref={containerRef} className="relative" style={gaugeWrapperStyle}>
        {/* Шрифт в спидометре масштабируем от реального размера gauge */}
        <KPIGaugeChart value={deviationValue} size={gaugeSize} originalSize={gaugeSize} />
      </div>
    );
  }
  
  if (isOverachieving) {
    // Перевыполнение: полный круг + тёмный сегмент ВПРАВО от 12 часов
    const overPercent = animated ? Math.min(forecastPercent - 100, 30) : 0;
    
    // Данные для основного круга (100%)
    const baseData = [{ name: 'base', value: 100 }];
    
    // Данные для сегмента перевыполнения (поверх, от 12 часов вправо)
    const overData = [
      { name: 'over', value: overPercent },
      { name: 'empty', value: 100 - overPercent },
    ];

    return (
      <div
        ref={containerRef}
        className="relative transition-all duration-700"
        style={wrapperStyle}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Базовый круг - основной цвет */}
            <Pie
              data={baseData}
              cx="50%"
              cy="50%"
              innerRadius={effectiveSize * INNER_R}
              outerRadius={effectiveSize * OUTER_R}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            >
              <Cell fill={color} />
            </Pie>
            {/* Сегмент перевыполнения - тёмный, от 12 часов ВПРАВО (по часовой) */}
            <Pie
              data={overData}
              cx="50%"
              cy="50%"
              innerRadius={effectiveSize * INNER_R}
              outerRadius={effectiveSize * OUTER_R}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              <Cell fill={darkenColor(color, 30)} />
              <Cell fill="transparent" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="font-bold text-foreground transition-opacity duration-500"
            style={{
              fontSize: centerFontPx,
              opacity: animated ? 1 : 0,
            }}
          >
            {centerText}
          </span>
        </div>
      </div>
    );
  }
  
  // Обычный режим: факт + прогноз бледный + остаток (по часовой от 12 часов)
  const animatedFactPercent = animated ? factPercent : 0;
  const forecastExtra = Math.max(0, forecastPercent - factPercent);
  const animatedForecastExtra = animated ? forecastExtra : 0;
  const remaining = 100 - (animated ? forecastPercent : 0);
  
  const data = [
    { name: 'fact', value: animatedFactPercent },
    { name: 'forecast', value: animatedForecastExtra },
    { name: 'remaining', value: remaining },
  ];
  const colors = [color, `${color}4D`, 'hsl(var(--muted))'];

  return (
    <div
      ref={containerRef}
      className="relative transition-all duration-700"
      style={wrapperStyle}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={effectiveSize * INNER_R}
            outerRadius={effectiveSize * OUTER_R}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span 
          className="font-bold text-foreground transition-opacity duration-500"
          style={{
            fontSize: centerFontPx,
            opacity: animated ? 1 : 0,
          }}
        >
          {centerText}
        </span>
      </div>
    </div>
  );
}