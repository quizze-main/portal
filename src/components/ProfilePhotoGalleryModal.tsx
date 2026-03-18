import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

interface ProfilePhotoGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[]; // already absolute/encoded URLs
  initialIndex?: number;
  alt?: string;
}

export const ProfilePhotoGalleryModal: React.FC<ProfilePhotoGalleryModalProps> = ({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
  alt = "Фото профиля",
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });
  const [index, setIndex] = React.useState(0);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  // Lock background scroll while open
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

  React.useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setIndex(emblaApi.selectedScrollSnap());
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
    update();
    return () => {
      emblaApi.off("select", update);
      emblaApi.off("reInit", update);
    };
  }, [emblaApi]);

  React.useEffect(() => {
    if (!open) return;
    if (!emblaApi) return;
    const safe = Math.max(0, Math.min(initialIndex, Math.max(0, images.length - 1)));
    // In iOS/TG webview Embla may init with wrong measurements until first interaction.
    // Force reInit after the modal becomes visible so arrows work immediately.
    requestAnimationFrame(() => {
      emblaApi.reInit();
      emblaApi.scrollTo(safe, true);
    });
  }, [open, emblaApi, initialIndex, images.length]);

  // When images list changes while modal is open (e.g. history loads after open),
  // re-initialize Embla so new slides become available immediately.
  React.useEffect(() => {
    if (!open) return;
    if (!emblaApi) return;
    requestAnimationFrame(() => {
      emblaApi.reInit();
    });
  }, [open, emblaApi, images.length]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[7px]" />

        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center select-none focus:outline-none">
          <div className="w-full h-full">
            <div className="h-full w-full overflow-hidden" ref={emblaRef}>
              <div className="flex h-full">
                {images.map((src, i) => (
                  <div key={`${src}-${i}`} className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center">
                    <img
                      src={src}
                      alt={alt}
                      className="object-scale-down max-w-full max-h-full mx-auto"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Counter */}
            {images.length > 1 && (
              <div className="absolute top-4 left-4 text-white text-sm bg-black/40 rounded-full px-3 py-1">
                {index + 1} / {images.length}
              </div>
            )}

            {/* Prev/Next */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Предыдущее фото"
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={!canPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  aria-label="Следующее фото"
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={!canNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            {/* Close (like KB) */}
            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-1 focus:outline-none"
                aria-label="Закрыть"
              >
                <X size={28} />
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

