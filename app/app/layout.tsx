import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Budget Planner | DynamicBudget',
  description:
    'Interactive salary-to-budget planner with federal and state tax calculations, debt payoff modeling, savings goal timelines, and spending trend tracking — all in your browser.',
  path: '/app',
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
