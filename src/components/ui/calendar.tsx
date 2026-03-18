import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
// Import Russian locale for calendar labels
import { ru } from "date-fns/locale";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Базовые классы DayPicker, как были изначально
const baseDayPickerClassNames = (cnFn: typeof cn) => ({
  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
  month: "space-y-4",
  caption: "flex justify-center pt-1 relative items-center",
  caption_label: "text-sm font-medium",
  nav: "space-x-1 flex items-center",
  nav_button: cnFn(
    buttonVariants({ variant: "outline" }),
    "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100"
  ),
  nav_button_previous: "absolute left-1",
  nav_button_next: "absolute right-1",
  table: "border-collapse space-y-1 mx-auto",
  head_row: "flex",
  head_cell: "text-muted-foreground rounded-md w-12 font-medium text-sm",
  row: "flex mt-2",
  cell: "h-12 w-12 text-center text-base p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
  day: cnFn(buttonVariants({ variant: "ghost" }), "h-12 w-12 p-0 font-normal aria-selected:opacity-100"),
  day_range_end: "day-range-end",
  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
  day_today: "bg-accent text-accent-foreground",
  day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
  day_disabled: "text-muted-foreground opacity-50",
  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
  day_hidden: "invisible",
});

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout: _captionLayout,
  fromYear: _fromYear,
  toYear: _toYear,
  ...props
}: CalendarProps) {
  // Добавляем значения по умолчанию для диапазона лет в выпадающем списке
  const currentYear = new Date().getFullYear();
  const fromYearDefault = _fromYear ?? currentYear - 10;
  const toYearDefault = _toYear ?? currentYear + 10;

  // === Новый механизм переключения Day / Month / Year ===
  const [view, setView] = React.useState<"day" | "month" | "year">("day");

  // Текущий отображаемый месяц/год
  const initialDisplayDate: Date =
    props.month instanceof Date
      ? props.month
      : props.selected instanceof Date
      ? props.selected
      : new Date();

  const [displayDate, setDisplayDate] = React.useState<Date>(initialDisplayDate);

  // Обновляем displayDate, если снаружи изменился выбранный месяц
  React.useEffect(() => {
    if (props.selected instanceof Date) {
      setDisplayDate(props.selected);
    }
  }, [props.selected]);

  // Хелпер для навигации вперёд/назад в зависимости от view
  const navigate = (dir: -1 | 1) => {
    setDisplayDate((prev) => {
      const d = new Date(prev);
      if (view === "day") {
        d.setMonth(d.getMonth() + dir);
      } else if (view === "month") {
        d.setFullYear(d.getFullYear() + dir);
      } else if (view === "year") {
        d.setFullYear(d.getFullYear() + dir * 12); // по 12 лет за раз
      }
      return d;
    });
  };

  // Заголовок в зависимости от текущего view
  const captionLabel = React.useMemo(() => {
    if (view === "day") {
      return format(displayDate, "LLLL yyyy", { locale: ru });
    }
    if (view === "month") {
      return format(displayDate, "yyyy", { locale: ru });
    }
    return `${fromYearDefault}-${toYearDefault}`;
  }, [view, displayDate, fromYearDefault, toYearDefault]);

  // Рендер месяцев
  const renderMonthsGrid = () => {
    const months = Array.from({ length: 12 }, (_, i) => i);
    return (
      <div className="grid grid-cols-7 gap-1 mx-auto p-2" style={{ width: "max-content" }}>
        {months.map((m) => {
          const date = new Date(displayDate.getFullYear(), m, 1);
          const label = format(date, "LLL", { locale: ru });
          const isSelectedMonth = date.getMonth() === displayDate.getMonth();
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setDisplayDate(date);
                setView("day");
                props.onMonthChange?.(date);
              }}
              className={cn(
                "h-12 w-12 text-xs capitalize flex items-center justify-center rounded-md",
                isSelectedMonth
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : "hover:bg-accent/50 text-foreground"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  // Рендер лет
  const renderYearsGrid = () => {
    const years: number[] = [];
    for (let y = fromYearDefault; y <= toYearDefault; y++) {
      years.push(y);
    }
    return (
      <div className="grid grid-cols-7 gap-1 mx-auto p-2 max-h-64 overflow-y-auto" style={{ width: "max-content" }}>
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => {
              const newDate = new Date(displayDate);
              newDate.setFullYear(y);
              setDisplayDate(newDate);
              setView("month");
            }}
            className={cn(
              "h-12 w-12 text-xs flex items-center justify-center rounded-md",
              y === displayDate.getFullYear()
                ? "bg-primary text-primary-foreground hover:bg-primary"
                : "hover:bg-accent/50 text-foreground"
            )}
          >
            {y}
          </button>
        ))}
      </div>
    );
  };

  // Пользовательский Caption для DayPicker, стилизованный как оригинал
  const CustomCaption = () => {
    return (
      <div className="flex justify-center pt-1 relative items-center">
        {/* Left nav button */}
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
          )}
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Caption label */}
        <button
          type="button"
          className="text-sm font-medium capitalize"
          onClick={() => setView(view === "day" ? "month" : view === "month" ? "year" : "day")}
        >
          {captionLabel}
        </button>

        {/* Right nav button */}
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
          )}
          onClick={() => navigate(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // Если view=day – используем DayPicker
  if (view === "day") {
    return (
      <DayPicker
        {...props}
        month={displayDate}
        showOutsideDays={showOutsideDays}
        captionLayout={_captionLayout ?? "buttons"}
        components={{
          Caption: CustomCaption,
          IconLeft: ({ ..._props }) => <></>,
          IconRight: ({ ..._props }) => <></>,
        }}
        className={cn("p-3 flex justify-center", className)}
        classNames={{
          ...baseDayPickerClassNames(cn),
          ...classNames,
          nav: "hidden",
          nav_button: "hidden",
          caption: "hidden", // скрываем стандартный caption, т.к. используем CustomCaption
        }}
        locale={props.locale ?? ru}
        onMonthChange={(month) => {
          setDisplayDate(month);
          props.onMonthChange?.(month);
        }}
      />
    );
  }

  // view = month or year => рисуем вручную, сохраняя общий стиль контейнера
  return (
    <div className={cn("p-3", className)}>
      {/* Заголовок с навигацией и кликом для смены view */}
      <div className="flex justify-between items-center mb-2">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 p-0")}
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="text-sm font-medium flex-1 text-center capitalize"
          onClick={() => setView(view === "month" ? "year" : "day")}
        >
          {captionLabel}
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 p-0")}
          onClick={() => navigate(1)}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {view === "month" ? renderMonthsGrid() : renderYearsGrid()}
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
