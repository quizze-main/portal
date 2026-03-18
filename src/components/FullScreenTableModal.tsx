import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface FullScreenTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Table JSX to render */
  children: React.ReactNode;
}

/**
 * Полноэкранное модальное окно для просмотра таблиц.
 * Ограничивается видимой областью экрана (inset-0) и блокирует
 * прокрутку фонового контента, пока открыто.
 */
export const FullScreenTableModal: React.FC<FullScreenTableModalProps> = ({
  open,
  onOpenChange,
  children,
}) => {
  // Определяем ориентацию экрана
  const [isLandscape, setIsLandscape] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth > window.innerHeight : true
  );

  React.useEffect(() => {
    const handler = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Блокируем прокрутку фонового контента, пока полноэкранный просмотр открыт
  React.useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Затемнённый фон */}
        <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/80" />

        {/* Контент модального окна */}
        <Dialog.Content className="fixed inset-0 z-[120] flex items-center justify-center focus:outline-none select-none">
          {/* Область прокрутки таблицы */}
          <div
            className={`fullscreen-table-modal bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-auto ${
              isLandscape
                ? "w-screen h-screen px-8 py-6" // ландшафт – на весь экран, 32px x 24px
                : "w-[90vw] h-[90vh] px-8 py-6" // портрет – 90% и центр
            }`}
          >
            {children}
          </div>

          {/* Кнопка закрытия */}
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-1 focus:outline-none"
              aria-label="Закрыть"
            >
              <X size={28} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}; 