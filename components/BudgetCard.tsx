'use client';

import React from 'react';

interface BudgetCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  accent?: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'none';
}

const ACCENT_CLASSES: Record<string, string> = {
  green: 'border-l-4 border-l-green-500',
  red: 'border-l-4 border-l-red-500',
  yellow: 'border-l-4 border-l-yellow-500',
  blue: 'border-l-4 border-l-blue-500',
  purple: 'border-l-4 border-l-purple-500',
  none: '',
};

export default function BudgetCard({
  title,
  children,
  className = '',
  accent = 'none',
}: BudgetCardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${ACCENT_CLASSES[accent]} ${className}`}
    >
      {title && (
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
