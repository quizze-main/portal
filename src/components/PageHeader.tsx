import React from "react";

interface PageHeaderProps {
  title: string;
  /** Подзаголовок – опционально */
  subtitle?: string;
  /** Дополнительные классы */
  className?: string;
  /** Позволяет переопределить inline-стили */
  style?: React.CSSProperties;
}

/**
 * Универсальный хэдэр страницы.
 * Использует градиентный фон и центрированные тексты.
 * @example <PageHeader title="Дашборд" subtitle="Добро пожаловать, Игорь!" />
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, className = "", style }) => {
  return (
    <header
      className={`w-full mt-4 mb-4 text-center ${className}`}
      style={style}
    >
      <h1 className="page-title">{title}</h1>
      {subtitle && (
        <p className="mt-1 page-subtitle">{subtitle}</p>
      )}
    </header>
  );
}; 