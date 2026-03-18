import React from 'react';
import ReactDOM from 'react-dom';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  zIndex?: string;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  zIndex = 'z-[300]',
}) => {
  // Блокируем прокрутку фонового контента, пока модальное окно открыто
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const overlay = (
    <div
      className={`fixed inset-0 bg-black/30 backdrop-blur-[12px] backdrop-saturate-150 flex items-center justify-center ${zIndex} animate-fade overflow-hidden`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm mx-auto bg-white/60 dark:bg-gray-900/40 backdrop-blur-[7px] backdrop-saturate-150 rounded-xl shadow-xl border border-white/10 animate-pop ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
}; 