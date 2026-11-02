import { saveAnswers } from '@/server/audit/service';
import { findAudit } from '@/server/audit/store';
import { apiError, parseBody } from '@/server/http';
import { quizAnswers } from '@/shared/audit/contracts';

/** Replaces the quiz answers. 204. */
export async function PUT(request: Request, { params }: { params: Promise<{ auditId: string }> }) {
  const audit = findAudit((await params).auditId);
  if (!audit) return apiError(404, 'not_found', 'No audit with that id.');

  const parsed = await parseBody(request, quizAnswers);
  if ('response' in parsed) return parsed.response;

  saveAnswers(audit, parsed.data);
  return new Response(null, { status: 204 });
}
