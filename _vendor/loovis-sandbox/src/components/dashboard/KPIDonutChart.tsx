import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
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

export function KPIDonutChart({ value, maxValue, forecast, displayValue, color, size = 48, isDeviation = false, isCompact = false }: KPIDonutChartProps) {
  const [animated, setAnimated] = useState(false);
  
  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const factPercent = Math.min(Math.round((value / maxValue) * 100), 100);
  const forecastPercent = forecast || factPercent;
  const isOverachieving = forecastPercent > 100;
  
  // Определяем текст для отображения в центре
  const centerText = displayValue || `${forecastPercent}%`;
  
  // Font size based on chart size
  const fontSize = size <= 36 ? 8 : size <= 48 ? 10 : size <= 56 ? 12 : size <= 64 ? 14 : 16;
  
  // Режим отклонения: спидометр (gauge)
  if (isDeviation) {
    const deviationValue = parseFloat(displayValue || '0');
    // Увеличиваем размер для gauge только если не компактный режим
    const gaugeSize = isCompact ? size : Math.round(size * 1.25);
    return <KPIGaugeChart value={deviationValue} size={gaugeSize} originalSize={size} />;
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
      <div className="relative transition-all duration-700" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Базовый круг - основной цвет */}
            <Pie
              data={baseData}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.35}
              outerRadius={size * 0.48}
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
              innerRadius={size * 0.35}
              outerRadius={size * 0.48}
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
            className="font-semibold text-foreground transition-opacity duration-500"
            style={{ fontSize, opacity: animated ? 1 : 0 }}
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
    <div className="relative transition-all duration-700" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.35}
            outerRadius={size * 0.48}
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
          className="font-semibold text-foreground transition-opacity duration-500"
          style={{ fontSize, opacity: animated ? 1 : 0 }}
        >
          {centerText}
        </span>
      </div>
    </div>
  );
}