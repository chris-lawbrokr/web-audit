import 'server-only';

import type { QuizAnswers, ReportPayload, UnlockRequest } from '@/shared/audit/contracts';

import type { AuditMetrics, Competitor } from './types';

/*
 * IN-MEMORY STORE, for local testing. Everything is lost when the server restarts, and it cannot work
 * on Vercel, where each request may land on a different instance. The Postgres tables in
 * 04-backend §4 replace it; the functions below are the seam.
 */

export interface AuditRecord {
  id: string;
  domain: string;
  createdAt: number;
  /** How long the sample scan takes to reach 100%. */
  durationMs: number;
  metrics: AuditMetrics;
  competitors: readonly Competitor[];
  answers: QuizAnswers;
  reportId: string | null;
}

export interface LeadRecord extends UnlockRequest {
  auditId: string;
  domain: string;
  overall: number;
  answers: QuizAnswers;
  createdAt: number;
}

interface Store {
  audits: Map<string, AuditRecord>;
  leads: Map<string, LeadRecord>;
  reports: Map<string, ReportPayload>;
}

// Kept on globalThis so development hot reloads, which re-evaluate this module, don't empty it.
const holder = globalThis as typeof globalThis & { lawbrokrAuditStore?: Store };
holder.lawbrokrAuditStore ??= { audits: new Map(), leads: new Map(), reports: new Map() };
const store = holder.lawbrokrAuditStore;

export const findAudit = (id: string) => store.audits.get(id);
export const saveAudit = (audit: AuditRecord) => store.audits.set(audit.id, audit);

/** One lead per audit: unlocking again replaces it. */
export const saveLead = (lead: LeadRecord) => store.leads.set(lead.auditId, lead);

export const findReport = (id: string) => store.reports.get(id);
export const saveReport = (id: string, report: ReportPayload) => store.reports.set(id, report);
