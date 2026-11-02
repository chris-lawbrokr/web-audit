import { Calendar } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryCard } from '@/features/report/CategoryCard';
import { PrintButton } from '@/features/report/PrintButton';
import { ScoreSummary } from '@/features/report/ScoreSummary';
import { WalkthroughBanner } from '@/features/report/WalkthroughBanner';
import { bookingUrlFor } from '@/server/audit/booking';
import { findReport } from '@/server/audit/store';
import { formatDate } from '@/shared/lib/format';
import { AppHeader } from '@/shared/ui/AppHeader';
import { ButtonLink } from '@/shared/ui/Button';
import { Overline } from '@/shared/ui/Overline';

// The report's private URL is its only key; keep it out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Step 4: the full report. The quiz's goal puts its category first in "Fix these first" and names the
 * focus in the subtitle. "Download PDF" is the browser's print dialog; the actions hide on paper.
 */
export default async function ReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const report = findReport((await params).reportId);
  if (!report) notFound();

  const bookingUrl = bookingUrlFor(report.lead);
  const meta = [
    `Run ${formatDate(new Date(report.ranAt))}`,
    `Compared against ${report.competitorsCompared} firms near you`,
    report.goalPhrase && `Focused on ${report.goalPhrase}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <AppHeader restart sample={report.sampleData} />
      <main className="flex flex-1 justify-center px-gutter pt-[clamp(32px,6vh,56px)] pb-16">
        <div className="flex w-full max-w-[1120px] flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Overline>Marketing web audit</Overline>
              <h1 className="font-serif text-[length:clamp(28px,4vw,40px)] leading-[1.1] font-semibold break-words text-primary-900">
                {report.domain}
              </h1>
              <span className="text-sm text-muted-foreground">{meta}</span>
              {report.sampleData && (
                <span className="text-sm text-warning-subtle-foreground">
                  Sample data: these numbers are made up until the real data sources are connected.
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <PrintButton />
              <ButtonLink href={bookingUrl} target="_blank" rel="noopener noreferrer">
                <Calendar aria-hidden="true" className="size-4" />
                Book a walkthrough
              </ButtonLink>
            </div>
          </div>

          <ScoreSummary report={report} />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] gap-4">
            {report.categories.map((category) => (
              <CategoryCard key={category.key} category={category} />
            ))}
          </div>

          <WalkthroughBanner bookingUrl={bookingUrl} />
        </div>
      </main>
    </>
  );
}
