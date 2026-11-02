import 'server-only';

import { randomBytes } from 'node:crypto';

import type { QuizAnswers, ReportPayload, UnlockRequest } from '@/shared/audit/contracts';
import { GOAL_PHRASE } from '@/shared/audit/quiz';

import { sampleAuditFor } from './fixtures';
import { progressOf } from './scan';
import { guessVerdict, prioritiesFor, scoreAudit } from './scoring';
import type { AuditRecord } from './store';
import { findAudit, saveAudit, saveLead, saveReport } from './store';

/** The sample scan's length: long enough to try the quiz, short enough to test often. */
const SAMPLE_SCAN_MS = 15_000;

/** An unguessable id for URLs: 128 random bits. */
const newId = () => randomBytes(16).toString('base64url');

export function createAudit(domain: string): AuditRecord {
  const audit: AuditRecord = {
    id: newId(),
    domain,
    createdAt: Date.now(),
    durationMs: SAMPLE_SCAN_MS,
    ...sampleAuditFor(domain),
    answers: {},
    reportId: null,
  };
  saveAudit(audit);
  return audit;
}

export function saveAnswers(audit: AuditRecord, answers: QuizAnswers) {
  saveAudit({ ...audit, answers });
}

export type UnlockResult = { ok: true; reportId: string } | { ok: false; reason: 'not_ready' };

/**
 * Stores the lead and freezes the report. Idempotent per audit: unlocking again keeps the same report
 * id and replaces the lead.
 */
export function unlockAudit(auditId: string, lead: UnlockRequest, now: number): UnlockResult {
  const audit = findAudit(auditId);
  if (!audit || progressOf(audit, now) < 100) return { ok: false, reason: 'not_ready' };

  const scored = scoreAudit(audit.domain, audit.metrics, audit.competitors);
  const reportId = audit.reportId ?? newId();
  const report: ReportPayload = {
    domain: audit.domain,
    ranAt: new Date(audit.createdAt).toISOString(),
    competitorsCompared: audit.competitors.length,
    goalPhrase: audit.answers.goal ? GOAL_PHRASE[audit.answers.goal] : null,
    overall: scored.overall,
    band: scored.band,
    headline: scored.headline,
    guessFeedback: guessVerdict(audit.answers.guess, scored.overall),
    fixFirst: prioritiesFor(scored.categories, audit.answers.goal),
    categories: scored.categories,
    lead: { firstName: lead.firstName, lastName: lead.lastName, email: lead.email },
    sampleData: true,
  };

  saveReport(reportId, report);
  saveAudit({ ...audit, reportId });
  saveLead({
    ...lead,
    auditId,
    domain: audit.domain,
    overall: scored.overall,
    answers: audit.answers,
    createdAt: now,
  });
  // No CRM in v1: the terminal is where a tester sees that the lead was captured.
  console.info(
    `[lead] ${lead.firstName} ${lead.lastName} <${lead.email}> · ${audit.domain} · score ${scored.overall}` +
      (lead.wantsCall ? ' · wants a call' : ''),
  );
  return { ok: true, reportId };
}
