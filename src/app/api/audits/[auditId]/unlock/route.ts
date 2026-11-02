import { unlockAudit } from '@/server/audit/service';
import { findAudit } from '@/server/audit/store';
import { apiError, parseBody } from '@/server/http';
import { unlockRequest } from '@/shared/audit/contracts';

/** Stores the lead and releases the report. 200 `{ reportId }`. */
export async function POST(request: Request, { params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await params;
  if (!findAudit(auditId)) return apiError(404, 'not_found', 'No audit with that id.');

  const parsed = await parseBody(request, unlockRequest);
  if ('response' in parsed) return parsed.response;

  const result = unlockAudit(auditId, parsed.data, Date.now());
  if (!result.ok) return apiError(409, 'not_ready', 'The scan hasn’t finished yet.');
  return Response.json({ reportId: result.reportId });
}
