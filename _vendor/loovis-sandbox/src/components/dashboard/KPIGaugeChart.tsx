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
  const needleAngle = animated ? targetAngle : 0; // Начинаем с центра (0°)
  
  // Цвет стрелки в зависимости от значения
  const isPositive = value >= 0;
  const needleColor = isPositive ? '#10B981' : '#EF4444'; // emerald-500 / red-500
  
  // Размер шрифта (используем originalSize для соответствия DonutChart)
  const fontBaseSize = originalSize || size;
  const fontSize = fontBaseSize <= 36 ? 8 : fontBaseSize <= 48 ? 10 : fontBaseSize <= 56 ? 12 : fontBaseSize <= 64 ? 14 : 16;
  
  // Формируем текст значения
  const displayText = `${value >= 0 ? '+' : ''}${value}%`;

  return (
    <div className="relative" style={{ width: size, height: size * 0.7 }}>
      <svg viewBox="0 10 100 70" className="w-full h-full">
        {/* Фоновая дуга (полукруг) */}
        <path
          d="M 14 70 A 36 36 0 0 1 86 70"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Красный сегмент: от -50% до -5% (левая часть) */}
        <path
          d="M 14 70 A 36 36 0 0 1 44.4 34.4"
          fill="none"
          stroke="#EF4444"
          strokeWidth="12"
        />
        
        {/* Жёлтый сегмент: от -5% до +5% (центральная часть) */}
        <path
          d="M 44.4 34.4 A 36 36 0 0 1 55.6 34.4"
          fill="none"
          stroke="#EAB308"
          strokeWidth="12"
        />
        
        {/* Зелёный сегмент: от +5% до +50% (правая часть) */}
        <path
          d="M 55.6 34.4 A 36 36 0 0 1 86 70"
          fill="none"
          stroke="#10B981"
          strokeWidth="12"
        />
        
        {/* Треугольник-указатель сверху дуги */}
        <g 
          style={{ 
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: '50px 70px',
            transition: animated ? 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
          }}
        >
          {/* Треугольник указывает вниз на дугу */}
          <polygon
            points="50,28 44,18 56,18"
            fill="hsl(var(--foreground))"
          />
        </g>
      </svg>
      
      {/* Значение в центре */}
      <div 
        className="absolute inset-0 flex items-center justify-center font-semibold transition-opacity duration-500"
        style={{ 
          paddingTop: size * 0.15,
          fontSize,
          color: needleColor,
          opacity: animated ? 1 : 0
        }}
      >
        {displayText}
      </div>
    </div>
  );
}
