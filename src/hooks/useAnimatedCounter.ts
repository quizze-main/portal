import { useEffect, useState } from 'react';

interface UseAnimatedCounterOptions {
  end: number;
  duration?: number;
  start?: number;
  enabled?: boolean;
}

export function useAnimatedCounter({ end, duration = 1500, start = 0, enabled = true }: UseAnimatedCounterOptions) {
  const [value, setValue] = useState(start);

  useEffect(() => {
    if (!enabled) {
      setValue(start);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, start, enabled]);

  return value;
}
