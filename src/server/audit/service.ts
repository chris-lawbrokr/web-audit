import 'server-only';

import { randomBytes } from 'node:crypto';

import { CHECK_KEYS } from '@/shared/audit/checks';
import type { ReportPayload, UnlockRequest } from '@/shared/audit/contracts';

import { noSpend } from '../providers/request';
import { prioritiesFor, scoreAudit } from './scoring';
import type { AuditRecord } from './store';
import { findAudit, saveAudit, saveLead, saveReport, updateAudit } from './store';

/** An unguessable id for URLs: 128 random bits. */
const newId = () => randomBytes(16).toString('base64url');

/** A new audit, every check queued. The caller starts the pipeline (pipeline.ts). */
export function createAudit(domain: string): AuditRecord {
  const audit: AuditRecord = {
    id: newId(),
    domain,
    createdAt: Date.now(),
    completedAt: null,
    checks: Object.fromEntries(
      CHECK_KEYS.map((key) => [key, { status: 'queued', step: 0 }]),
    ) as AuditRecord['checks'],
    discoveries: [],
    results: {},
    competitorCount: 0,
    spend: noSpend(),
    reportId: null,
  };
  saveAudit(audit);
  return audit;
}

export type UnlockResult = { ok: true; reportId: string } | { ok: false; reason: 'not_ready' };

/**
 * Stores the lead and freezes the report. Idempotent per audit: unlocking again keeps the same report
 * id and replaces the lead.
 */
export function unlockAudit(auditId: string, lead: UnlockRequest, now: number): UnlockResult {
  const audit = findAudit(auditId);
  if (!audit || audit.completedAt === null) return { ok: false, reason: 'not_ready' };

  const scored = scoreAudit(audit);
  const reportId = audit.reportId ?? newId();
  const report: ReportPayload = {
    domain: audit.domain,
    ranAt: new Date(audit.createdAt).toISOString(),
    competitorsCompared: audit.competitorCount,
    overall: scored.overall,
    band: scored.band,
    headline: scored.headline,
    fixFirst: prioritiesFor(scored.categories),
    categories: scored.categories,
    lead: { firstName: lead.firstName, lastName: lead.lastName, email: lead.email },
  };

  saveReport(reportId, report);
  updateAudit(auditId, (current) => ({ ...current, reportId }));
  saveLead({
    ...lead,
    auditId,
    domain: audit.domain,
    overall: scored.overall,
    createdAt: now,
  });
  // No CRM in v1: the terminal is where a tester sees that the lead was captured.
  console.info(
    `[lead] ${lead.firstName} ${lead.lastName} <${lead.email}> · ${audit.domain} · score ${scored.overall ?? 'none'}` +
      (lead.wantsCall ? ' · wants a call' : ''),
  );
  return { ok: true, reportId };
}
