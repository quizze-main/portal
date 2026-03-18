import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface FullScreenImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
}

// Полноэкранное модальное окно для просмотра изображений с поддержкой pinch-zoom и панорамирования
export const FullScreenImageModal: React.FC<FullScreenImageModalProps> = ({
  open,
  onOpenChange,
  src,
  alt,
}) => {
  // Блокируем прокрутку фонового контента, пока полноэкранный просмотр открыт
  React.useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}> {/* Управляемое состояние из родительского компонента */}
      <Dialog.Portal>
        {/* Затемнённый фон */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[7px]" />

        {/* Контент модального окна */}
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center select-none focus:outline-none">
          {/* Обёртка трансформаций: pinch-zoom, панорамирование, скролл-wheel и дабл-клик */}
          <TransformWrapper
            doubleClick={{ mode: "zoomIn" }}
            pinch={{ disabled: false }}
            panning={{ disabled: false }}
            wheel={{ disabled: false }}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%", touchAction: "none" }}
              contentStyle={{ width: "100%", height: "100%" }}
            >
              <img
                src={src}
                alt={alt}
                className="object-scale-down max-w-full max-h-full mx-auto"
                draggable={false}
              />
            </TransformComponent>
          </TransformWrapper>

          {/* Кнопка закрытия */}
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-1 focus:outline-none"
            >
              <X size={28} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}; 