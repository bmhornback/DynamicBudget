/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { useCountUp } from '@/lib/useCountUp';

describe('useCountUp', () => {
  const originalMatchMedia = window.matchMedia;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    jest.restoreAllMocks();
  });

  it('snaps to target when reduced motion is preferred', () => {
    const requestAnimationFrameMock = jest.fn();
    window.requestAnimationFrame = requestAnimationFrameMock;
    window.cancelAnimationFrame = jest.fn();
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });

    const { result, rerender } = renderHook(
      ({ target, duration }: { target: number; duration: number }) => useCountUp(target, duration),
      { initialProps: { target: 10, duration: 600 } }
    );

    expect(result.current).toBe(10);

    act(() => {
      rerender({ target: 25, duration: 600 });
    });

    expect(result.current).toBe(25);
    expect(requestAnimationFrameMock).not.toHaveBeenCalled();
  });

  it('snaps to target when duration is non-positive', () => {
    const requestAnimationFrameMock = jest.fn();
    window.requestAnimationFrame = requestAnimationFrameMock;
    window.cancelAnimationFrame = jest.fn();
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });

    const { result, rerender } = renderHook(
      ({ target, duration }: { target: number; duration: number }) => useCountUp(target, duration),
      { initialProps: { target: 10, duration: 600 } }
    );

    expect(result.current).toBe(10);

    act(() => {
      rerender({ target: 30, duration: 0 });
    });

    expect(result.current).toBe(30);
    expect(requestAnimationFrameMock).not.toHaveBeenCalled();
  });

  it('snaps safely when requestAnimationFrame is unavailable', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    window.requestAnimationFrame = undefined as unknown as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = undefined as unknown as typeof window.cancelAnimationFrame;

    const { result, rerender } = renderHook(
      ({ target, duration }: { target: number; duration: number }) => useCountUp(target, duration),
      { initialProps: { target: 5, duration: 600 } }
    );

    expect(result.current).toBe(5);

    expect(() => {
      act(() => {
        rerender({ target: 20, duration: 600 });
      });
    }).not.toThrow();

    expect(result.current).toBe(20);
  });
});
