interface PhoneMockupProps {
  children: React.ReactNode;
  className?: string;
  /** Slight 3D perspective rotation */
  perspective?: boolean;
}

export function PhoneMockup({ children, className = '', perspective = false }: PhoneMockupProps) {
  return (
    <div
      className={`relative ${className}`}
      style={perspective ? {
        transform: 'perspective(1000px) rotateY(-5deg) rotateX(2deg)',
        transformStyle: 'preserve-3d',
      } : undefined}
    >
      {/* Phone frame */}
      <div className="relative rounded-[2.5rem] border-[6px] border-gray-800 dark:border-gray-600 bg-gray-800 dark:bg-gray-700 shadow-2xl overflow-hidden w-[280px] h-[580px]">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-gray-800 dark:bg-gray-700 rounded-b-2xl z-10" />
        {/* Screen */}
        <div className="w-full h-full overflow-hidden rounded-[2rem] bg-white dark:bg-gray-900">
          {children}
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[100px] h-[4px] bg-gray-600 dark:bg-gray-400 rounded-full opacity-50" />
      </div>
    </div>
  );
}

/** Placeholder gradient screen for when we don't have a real screenshot yet */
export function PlaceholderScreen({ label }: { label?: string }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-100 via-white to-purple-100 dark:from-indigo-950 dark:via-gray-900 dark:to-purple-950 flex items-center justify-center p-4">
      {label && (
        <span className="text-sm text-gray-400 dark:text-gray-500 text-center">{label}</span>
      )}
    </div>
  );
}
