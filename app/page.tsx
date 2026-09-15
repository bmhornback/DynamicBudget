import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'DynamicBudget — Free Salary & Budget Planner',
  description:
    'A free, privacy-first personal finance planner. Model your salary, taxes, expenses, debt payoff, and long-term savings goals — no sign-up, no data collection.',
  path: '/',
});

const FEATURES = [
  {
    icon: '💵',
    title: 'Federal & State Tax Engine',
    description:
      'Accurate 2026 tax calculations for all 50 states and D.C., including 401(k), IRA, HSA, ESPP/RSU, and bonus income.',
  },
  {
    icon: '⚖️',
    title: 'Multi-Scenario Comparison',
    description:
      'Compare your live budget side-by-side with built-in presets like San Diego, Atlanta, or Living with Parents — or build your own.',
  },
  {
    icon: '💳',
    title: 'Debt Payoff Planner',
    description:
      'Model avalanche vs snowball strategies with a month-by-month amortization chart and total interest cost breakdown per account.',
  },
  {
    icon: '🏠',
    title: 'Homeowner & Renter Modes',
    description:
      'Switch between renter (rent + utilities) and homeowner (mortgage, property tax, insurance, maintenance) budgeting in one click.',
  },
  {
    icon: '📈',
    title: 'Savings Goal Timelines',
    description:
      'Set long-term goals (emergency fund, house down payment, retirement) and see exactly how many months until you reach them.',
  },
  {
    icon: '🗓️',
    title: 'Paycheck Calculator',
    description:
      'See a per-paycheck deduction waterfall — gross → taxes → benefits → take-home — for weekly, biweekly, semimonthly, or monthly pay.',
  },
  {
    icon: '📊',
    title: 'Spending Trends & Forecasting',
    description:
      'Track actual spending against your budget across 10 categories, with monthly trend charts and AI-like variance insights.',
  },
  {
    icon: '🌍',
    title: 'Cost-of-Living Comparison',
    description:
      'Instantly see what your salary is worth in a new city using MERIC cost-of-living indices, with one-click expense scaling.',
  },
  {
    icon: '🔒',
    title: 'Private by Design',
    description:
      'No sign-up required. All data stays in your browser via localStorage — nothing is ever sent to a server.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Enter your income',
    description:
      'Add your gross salary, filing status, state, and retirement contributions. The tax engine calculates your real take-home instantly.',
  },
  {
    number: '02',
    title: 'Fill in your expenses',
    description:
      'Housing, utilities, transport, food, debt payments, savings goals — fill in what applies to you, or load a preset scenario to start.',
  },
  {
    number: '03',
    title: 'Get your budget',
    description:
      'See a full budget breakdown, health score, personalized recommendations, and charts — all updating live as you adjust numbers.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-bold text-sky-600 dark:text-sky-400">DynamicBudget</span>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/learn"
              className="text-slate-600 transition hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
            >
              Learn
            </Link>
            <Link
              href="/app"
              className="rounded-full bg-sky-600 px-4 py-2 text-white transition hover:bg-sky-700"
            >
              Open Planner
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-400">
          Free · No sign-up · Private
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
          Turn your salary into a{' '}
          <span className="text-sky-600 dark:text-sky-400">real budget</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-gray-300">
          DynamicBudget is a personal finance sandbox that models your full tax picture, expense
          breakdown, debt payoff, and long-term savings goals — all in your browser, no account
          needed.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/app"
            className="rounded-full bg-sky-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-sky-700 hover:shadow-sky-200 dark:hover:shadow-sky-900"
          >
            Open the Planner →
          </Link>
          <Link
            href="/learn"
            className="rounded-full border border-slate-300 px-8 py-3.5 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Learn Budgeting Concepts
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-400 dark:text-gray-500">
          All calculations happen locally in your browser. Your data never leaves your device.
        </p>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base text-slate-500 dark:text-gray-400">
            From your first number to a complete financial picture in minutes.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-xl font-extrabold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                  {step.number}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">
            Everything in one place
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base text-slate-500 dark:text-gray-400">
            Built for people who want honest numbers, not just feel-good charts.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="text-3xl">{feat.icon}</span>
                <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                  {feat.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-gray-400">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="bg-sky-600 py-16 dark:bg-sky-700">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">Ready to see your real budget?</h2>
          <p className="mt-4 text-sky-100">
            No account. No email. No ads. Just open the planner and start entering numbers.
          </p>
          <Link
            href="/app"
            className="mt-8 inline-block rounded-full bg-white px-10 py-3.5 text-base font-semibold text-sky-700 shadow transition hover:bg-sky-50"
          >
            Open the Planner →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white py-10 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
              DynamicBudget
            </span>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-gray-400">
              <Link href="/app" className="transition hover:text-slate-900 dark:hover:text-white">
                Planner
              </Link>
              <Link href="/learn" className="transition hover:text-slate-900 dark:hover:text-white">
                Learn
              </Link>
              <a
                href="https://github.com/bmhornback/DynamicBudget/issues/new/choose"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-slate-900 dark:hover:text-white"
              >
                Feedback
              </a>
              <a
                href="https://github.com/bmhornback/DynamicBudget"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-slate-900 dark:hover:text-white"
              >
                GitHub
              </a>
            </nav>
            <p className="text-xs text-slate-400 dark:text-gray-500">
              © {new Date().getFullYear()} DynamicBudget. All rights reserved.
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-gray-500">
            All budget calculations are performed locally in your browser. No personal data is
            collected or transmitted.
          </p>
        </div>
      </footer>
    </main>
  );
}
