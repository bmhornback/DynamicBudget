import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { LEARN_GUIDES } from '@/lib/learnContent';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Learn Budgeting Concepts | DynamicBudget',
  description:
    'Plain-language budgeting guides connected to DynamicBudget features, including housing affordability, savings rates, retirement planning, and cost-of-living comparisons.',
  path: '/learn',
});

export default function LearnPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
            Learn
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            Budgeting concepts tied directly to your plan
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600 dark:text-gray-300">
            These short guides explain the ideas behind the dashboard so you can make tradeoffs with
            more confidence.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Open the planner
            </Link>
            <a
              href="https://github.com/bmhornback/DynamicBudget/issues/new/choose"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Suggest a topic
            </a>
          </div>
        </div>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          {LEARN_GUIDES.map((guide) => (
            <article
              key={guide.id}
              id={guide.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{guide.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-gray-300">{guide.summary}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-gray-200">
                {guide.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm font-medium text-sky-700 dark:text-sky-300">{guide.cta}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
