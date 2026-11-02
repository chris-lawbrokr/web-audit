import { snapshotOf } from '@/server/audit/scan';
import { findAudit } from '@/server/audit/store';
import { apiError } from '@/server/http';

/** The scan screen's poll: progress and discoveries, never a score. */
export async function GET(_request: Request, { params }: { params: Promise<{ auditId: string }> }) {
  const audit = findAudit((await params).auditId);
  if (!audit) return apiError(404, 'not_found', 'No audit with that id.');
  return Response.json(snapshotOf(audit));
}
