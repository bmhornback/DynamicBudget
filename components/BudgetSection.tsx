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

  return (
    <div className={`mb-6 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2 px-1 text-left group"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h2 className="text-base font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
            {title}
          </h2>
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>
      <div className="h-px bg-gray-200 mb-4" />
      {isOpen && <div className="space-y-3">{children}</div>}
    </div>
  );
}
