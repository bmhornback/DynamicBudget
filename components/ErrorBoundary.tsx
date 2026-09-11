'use client';

import React from 'react';
import BudgetCard from './BudgetCard';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('MoveMath UI error:', error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <BudgetCard accent="red" className="max-w-2xl mx-auto">
          <div role="alert" aria-live="assertive" className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
              <p className="mt-1 text-sm text-gray-600">
                A rendering error interrupted this budget view. Reset the scenario to recover.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Reset budget
            </button>
          </div>
        </BudgetCard>
      );
    }

    return this.props.children;
  }
}
