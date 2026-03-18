import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Типы ключей фильтров
export type FilterKey = "old_stock" | "near_deadline" | "overdue";

// Данные для одной карточки
export interface FilterCardData {
  key: FilterKey;
  count: number;
  amount: number;
}

interface OrderFilterCardsProps {
  /**
   * Список карточек с данными (кол-во и сумма заказов)
   */
  data: FilterCardData[];
  /**
   * Коллбэк вызывается при изменении активных фильтров
   */
  onChange?: (active: FilterKey[]) => void;
  /**
   * Какие фильтры активны по умолчанию (по ТЗ активен только old_stock)
   */
  defaultActive?: FilterKey[];
  /**
   * Класс-имя контейнера (flex/grid и т.д.)
   */
  className?: string;
}

// Для подписей используем React-узлы (ReactNode), чтобы можно было вставить <br />
const REASON_LABELS: Record<FilterKey, ReactNode> = {
  old_stock: (
    <>
      Срок хранения<br />превышен
    </>
  ),
  near_deadline: (
    <>
      Скоро дедлайн<br />(&lt;2&nbsp;дней)
    </>
  ),
  overdue: "Просрочен",
};

/**
 * Компонент интерактивных карточек-фильтров по незакрытым заказам.
 * Позволяет включать/выключать несколько фильтров одновременно.
 */
export const OrderFilterCards = ({
  data,
  onChange,
  defaultActive = ["old_stock"],
  className,
}: OrderFilterCardsProps) => {
  const [active, setActive] = useState<FilterKey[]>(defaultActive);

  const toggle = (key: FilterKey) => {
    setActive((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key) // выключаем
        : [...prev, key]; // включаем

      onChange?.(next);
      return next;
    });
  };

  return (
    <>
      {/*
        Контейнер: на мобильных допускаем перенос карточек (flex-wrap),
        на планшетах и десктопах все 3 карточки располагаются в одну строку (flex-nowrap).
        Gap 4 (~16px) обеспечивает равномерный отступ между карточками.
      */}
      <div
        className={cn(
          "flex flex-wrap md:flex-nowrap gap-4 w-full py-[3px]",
          className
        )}
      >
        {data.map((item) => {
          const isActive = active.includes(item.key);
          return (
            <Card
              key={item.key}
              onClick={() => toggle(item.key)}
              className={cn(
                // карточка: одинаковая ширина, минимальная высота 84px
                "cursor-pointer select-none flex-1 min-w-0 min-h-[84px] flex flex-col items-center text-center border transition-all my-[3px] py-3",
                isActive
                  ? "bg-blue-50 border-blue-400 shadow-md active-filter"
                  : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/20 shadow-sm"
              )}
            >
              {/* Кол-во */}
              <div className="text-[18px] font-semibold leading-[1.2] text-gray-900">
                {item.count}
              </div>
              {/* Причина */}
              <div className="text-[13px] mt-[2px] text-gray-700 font-medium leading-tight whitespace-normal break-words text-balance px-[4px] min-h-[28px]">
                {REASON_LABELS[item.key]}
              </div>
              {/* Сумма */}
              <div className="text-[14px] font-medium text-gray-900 mt-auto whitespace-nowrap">
                {item.amount.toLocaleString("ru-RU")} ₽
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}; 