'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from its previous value to a new target using a
 * cubic ease-out curve. Respects `prefers-reduced-motion` — if the user has
 * opted out of motion, the value snaps immediately to the target.
 *
 * @param target   The destination number to animate toward.
 * @param duration Animation duration in milliseconds (default 600 ms).
 * @returns        The current animated value (updates every animation frame).
 */
export function useCountUp(target: number, duration = 600): number {
  const [current, setCurrent] = useState<number>(target);
  const prevRef = useRef<number>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const start = prevRef.current;
    const diff = target - start;

    if (diff === 0) return;

    if (reducedMotion) {
      prevRef.current = target;
      setCurrent(target);
      return;
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out: decelerate toward the end
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = start + diff * eased;
      setCurrent(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = target;
        setCurrent(target);
      }
    };

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, duration]);

  return current;
}
