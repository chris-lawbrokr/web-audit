import { createAudit } from '@/server/audit/service';
import { env } from '@/server/config/env';
import { apiError, parseBody } from '@/server/http';
import { createAuditRequest } from '@/shared/audit/contracts';

/** Starts an audit. 202 `{ auditId }`. */
export async function POST(request: Request) {
  if (env.AUDIT_PROVIDERS === 'live') {
    return apiError(
      503,
      'live_not_connected',
      'Real data isn’t connected yet. Unset AUDIT_PROVIDERS to run on sample data.',
    );
  }

  const parsed = await parseBody(request, createAuditRequest);
  if ('response' in parsed) return parsed.response;

  const audit = createAudit(parsed.data.url);
  return Response.json({ auditId: audit.id }, { status: 202 });
}
