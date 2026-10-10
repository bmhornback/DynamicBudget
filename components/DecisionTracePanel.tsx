'use client';

import React, { useState } from 'react';
import type { Recommendation } from '@/types/budget';

interface DecisionTracePanelProps {
  recommendation: Recommendation;
}

export default function DecisionTracePanel({ recommendation }: DecisionTracePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const trace = recommendation.trace;

  if (!trace) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/80 p-3">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-violet-800"
        aria-expanded={isOpen}
        aria-controls={`decision-trace-${recommendation.id}`}
      >
        <span>Why this recommendation?</span>
        <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div id={`decision-trace-${recommendation.id}`} className="mt-3 space-y-3 text-xs text-violet-900">
          <p className="font-medium">Deterministic rule trace</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md bg-white/80 p-2">
              <p className="font-medium text-violet-800">Profile</p>
              <p>{trace.profile}</p>
            </div>
            <div className="rounded-md bg-white/80 p-2">
              <p className="font-medium text-violet-800">Policy version</p>
              <p>{trace.version}</p>
            </div>
            <div className="rounded-md bg-white/80 p-2">
              <p className="font-medium text-violet-800">Judgment score</p>
              <p>{trace.judgmentScore.toFixed(4)}</p>
            </div>
            <div className="rounded-md bg-white/80 p-2">
              <p className="font-medium text-violet-800">Expected value</p>
              <p>{trace.expectedValue.toFixed(4)}</p>
            </div>
          </div>

          <div className="rounded-md bg-white/80 p-2">
            <p className="font-medium text-violet-800">JEV score</p>
            <p>{trace.jevScore.toFixed(4)} ({trace.confidenceRange[0]}–{trace.confidenceRange[1]} confidence)</p>
          </div>

          <div className="rounded-md bg-white/80 p-2">
            <p className="font-medium text-violet-800">Assumptions</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {trace.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-md bg-white/80 p-2">
            <p className="font-medium text-violet-800">Score breakdown</p>
            <ul className="mt-1 space-y-1">
              {trace.scoreBreakdown.map((item) => (
                <li key={`${recommendation.id}-${item.id}`} className="flex justify-between gap-2">
                  <span>{item.id}</span>
                  <span>{item.score.toFixed(4)}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-md bg-white/80 p-2 text-violet-900">{trace.rationale}</p>
        </div>
      )}
    </div>
  );
}
