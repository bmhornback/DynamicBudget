"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCountUp = useCountUp;
const react_1 = require("react");
/**
 * Animates a numeric value from its previous value to a new target using a
 * cubic ease-out curve. Respects `prefers-reduced-motion` — if the user has
 * opted out of motion, the value snaps immediately to the target.
 *
 * @param target   The destination number to animate toward.
 * @param duration Animation duration in milliseconds (default 600 ms).
 * @returns        The current animated value (updates every animation frame).
 */
function useCountUp(target, duration = 600) {
    const [current, setCurrent] = (0, react_1.useState)(target);
    const currentRef = (0, react_1.useRef)(target);
    const rafRef = (0, react_1.useRef)(null);
    const reducedMotion = typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canAnimate = typeof requestAnimationFrame === 'function' &&
        typeof cancelAnimationFrame === 'function' &&
        typeof performance !== 'undefined' &&
        typeof performance.now === 'function' &&
        duration > 0;
    const shouldSnap = reducedMotion || !canAnimate;
    (0, react_1.useEffect)(() => {
        currentRef.current = current;
    }, [current]);
    (0, react_1.useEffect)(() => {
        const start = currentRef.current;
        const diff = target - start;
        if (diff === 0)
            return;
        if (shouldSnap) {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            currentRef.current = target;
            return;
        }
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
        }
        const startTime = performance.now();
        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Cubic ease-out: decelerate toward the end
            const eased = 1 - Math.pow(1 - progress, 3);
            const next = start + diff * eased;
            currentRef.current = next;
            setCurrent(next);
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
            else {
                currentRef.current = target;
                setCurrent(target);
            }
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [target, duration, shouldSnap]);
    return shouldSnap ? target : current;
}
