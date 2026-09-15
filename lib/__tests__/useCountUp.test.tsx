/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useCountUp } from '@/lib/useCountUp';

function HookProbe({ value, duration = 600 }: { value: number; duration?: number }) {
  const current = useCountUp(value, duration);
  return <span data-testid="value">{Math.round(current)}</span>;
}

describe('useCountUp', () => {
  const originalMatchMedia = window.matchMedia;
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: originalRaf,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      writable: true,
      value: originalCancelRaf,
    });
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: originalRaf,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      writable: true,
      value: originalCancelRaf,
    });
  });

  it('snaps when prefers-reduced-motion is enabled', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    const { rerender } = render(<HookProbe value={10} />);

    rerender(<HookProbe value={42} />);

    expect(screen.getByTestId('value').textContent).toBe('42');
  });

  it('snaps when duration is zero or negative', () => {
    const { rerender } = render(<HookProbe value={10} duration={0} />);
    rerender(<HookProbe value={40} duration={0} />);
    expect(screen.getByTestId('value').textContent).toBe('40');

    rerender(<HookProbe value={60} duration={-1} />);
    expect(screen.getByTestId('value').textContent).toBe('60');
  });

  it('snaps when requestAnimationFrame is unavailable', () => {
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const { rerender } = render(<HookProbe value={10} />);
    rerender(<HookProbe value={35} />);

    expect(screen.getByTestId('value').textContent).toBe('35');
  });
});
