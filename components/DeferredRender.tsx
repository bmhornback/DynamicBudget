'use client';

import React, { useEffect, useRef, useState } from 'react';

interface DeferredRenderProps {
  children: React.ReactNode;
  minHeight?: number;
  rootMargin?: string;
  placeholderLabel?: string;
}

export default function DeferredRender({
  children,
  minHeight = 220,
  rootMargin = '200px',
  placeholderLabel = 'Loading dashboard section…',
}: DeferredRenderProps) {
  const [isVisible, setIsVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) return;

    const node = placeholderRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible, rootMargin]);

  if (isVisible) {
    return <>{children}</>;
  }

  return (
    <div
      ref={placeholderRef}
      aria-hidden="true"
      className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500"
      style={{ minHeight }}
    >
      {placeholderLabel}
    </div>
  );
}
