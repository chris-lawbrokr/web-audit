import { notFound, redirect } from 'next/navigation';

import { ScanFlow } from '@/features/scan/ScanFlow';
import { snapshotOf } from '@/server/audit/scan';
import { findAudit } from '@/server/audit/store';
import { env } from '@/server/config/env';
import { AppHeader } from '@/shared/ui/AppHeader';

/** Steps 2 and 3: the scan, then the gate once it finishes. A reload resumes either. */
export default async function ScanPage({ params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await params;
  const audit = findAudit(auditId);
  if (!audit) notFound();
  if (audit.reportId) redirect(`/report/${audit.reportId}`);

  return (
    <>
      <AppHeader sample={env.AUDIT_PROVIDERS === 'fixtures'} />
      <ScanFlow auditId={auditId} initial={snapshotOf(audit, Date.now())} />
    </>
  );
}
