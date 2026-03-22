import { useFadeInOnScroll } from '@/hooks/useFadeInOnScroll';

interface LandingSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Use light gray background instead of white */
  gray?: boolean;
}

export function LandingSection({ children, className = '', id, gray }: LandingSectionProps) {
  const { ref, isVisible } = useFadeInOnScroll();

  return (
    <section
      ref={ref}
      id={id}
      className={`py-16 md:py-24 px-6 transition-all duration-600 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${gray ? 'bg-gray-50 dark:bg-gray-900/50' : ''} ${className}`}
    >
      <div className="max-w-[1200px] mx-auto">
        {children}
      </div>
    </section>
  );
}
