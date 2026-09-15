import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { buildMetadata, buildWebApplicationJsonLd, SITE_URL } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'DynamicBudget — Free Salary & Budget Planner',
  description:
    'A free, privacy-first personal finance planner. Model your salary, taxes, expenses, debt payoff, and long-term savings goals — no sign-up, no data collection.',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = buildWebApplicationJsonLd();

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="theme-color" content="#0f172a" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="alternate" hrefLang="en" href={SITE_URL} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
