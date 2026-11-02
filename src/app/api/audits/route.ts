import { after } from 'next/server';

import { runAudit } from '@/server/audit/pipeline';
import { createAudit } from '@/server/audit/service';
import { parseBody } from '@/server/http';
import { createAuditRequest } from '@/shared/audit/contracts';

/** The scan runs after the response; a slow site's speed test alone can take two minutes. */
export const maxDuration = 300;

/** Starts an audit and its scan. 202 `{ auditId }`; the scan screen polls for progress. */
export async function POST(request: Request) {
  const parsed = await parseBody(request, createAuditRequest);
  if ('response' in parsed) return parsed.response;

  const audit = createAudit(parsed.data.url);
  after(() => runAudit(audit.id));
  return Response.json({ auditId: audit.id }, { status: 202 });
}
