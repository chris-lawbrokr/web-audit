import { Globe } from 'lucide-react';

import type { HomepageFacts } from '@/shared/audit/contracts';
import { Card } from '@/shared/ui/Card';
import { IconTile } from '@/shared/ui/IconTile';

/**
 * What one request to the firm's homepage found, on its own: the name, phone and location the audit
 * starts from, and the practice area its words point to. Anything the page doesn't give says so.
 */
export function HomepageCard({ homepage }: { homepage: HomepageFacts | null }) {
  const facts = homepage && [
    { label: 'Firm name', value: homepage.name },
    { label: 'Phone', value: homepage.phone },
    { label: 'Location', value: homepage.place },
    { label: 'Practice area', value: homepage.practiceArea },
    { label: 'Page read', value: homepage.url },
  ];

  return (
    <Card
      as="section"
      aria-labelledby="homepage-title"
      className="flex flex-col gap-[18px] p-5 print:break-inside-avoid"
    >
      <div className="flex items-center gap-3">
        <IconTile icon={Globe} tone={homepage ? 'primary' : 'muted'} />
        <h2 id="homepage-title" className="text-base font-semibold text-primary-900">
          What your homepage told us
        </h2>
      </div>

      {facts ? (
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-x-6 gap-y-4">
          {facts.map(({ label, value }) => (
            <div key={label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-[13px] text-muted-foreground">{label}</dt>
              <dd
                className={
                  value
                    ? 'text-sm font-semibold break-words text-primary-900'
                    : 'text-sm text-muted-foreground'
                }
              >
                {value ?? 'Not found on the page'}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm leading-[21px] text-pretty text-muted-foreground">
          We couldn’t load a page at this address, so the audit went by your Google listing alone.
        </p>
      )}

      <p className="text-xs leading-[18px] text-pretty text-muted-foreground">
        <span className="font-semibold">How we measured this: </span>
        One request to your homepage, trying https://, then www., then http://. The name, phone and
        location come from the business details the page gives search engines, with its title and
        phone links as backups. The practice area comes from the words on the page.
      </p>
    </Card>
  );
}
