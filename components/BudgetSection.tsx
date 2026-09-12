'use client';

import React from 'react';

interface BudgetSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export default function BudgetSection({
  title,
  icon,
  children,
  defaultOpen = true,
  className = '',
}: BudgetSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const contentRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className={`mb-6 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between py-2 px-1 text-left group"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h2>
        </div>
        <span
          className="text-gray-400 dark:text-gray-500 text-sm transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>
      <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4" />
      <div
        ref={contentRef}
        aria-hidden={!isOpen}
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: isOpen ? '9999px' : '0px', opacity: isOpen ? 1 : 0, visibility: isOpen ? 'visible' : 'hidden', pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

