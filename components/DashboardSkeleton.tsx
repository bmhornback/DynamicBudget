'use client';

import React from 'react';

/**
 * DashboardSkeleton — shown during initial client hydration to prevent
 * layout shift and blank-page flash (E6-T8).
 */
export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading budget dashboard" aria-live="polite">
      {/* Header bar skeleton */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Preset bar skeleton */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-7 w-28 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 py-2">
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Form panel skeleton */}
          <div className="w-full md:w-80 lg:w-96 shrink-0 space-y-4">
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-lg" />
                ))}
              </div>
            ))}
          </div>

          {/* Dashboard panel skeleton */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Summary cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-2">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-16 bg-gray-100 dark:bg-gray-600 rounded" />
                </div>
              ))}
            </div>

            {/* Chart skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="h-48 w-full bg-gray-100 dark:bg-gray-700 rounded-lg" />
            </div>

            {/* Recommendations skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 w-full bg-gray-100 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
