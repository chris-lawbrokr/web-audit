import 'server-only';

import type { CheckKey } from '@/shared/audit/checks';
import type {
  CheckStatus,
  Discovery,
  HomepageFacts,
  ReportPayload,
  UnlockRequest,
} from '@/shared/audit/contracts';

import type { Spend } from '../providers/request';
import type { PartialResults } from './types';

/*
 * IN-MEMORY STORE, for local testing. Everything is lost when the server restarts, and it cannot work
 * on Vercel, where each request may land on a different instance. The Postgres tables in
 * 04-backend §4 replace it; the functions below are the seam.
 */

export interface CheckState {
  status: CheckStatus;
  /** Index into the check's steps while it runs. */
  step: number;
}

export interface AuditRecord {
  id: string;
  domain: string;
  createdAt: number;
  /** Set when every check has settled. */
  completedAt: number | null;
  checks: Record<CheckKey, CheckState>;
  discoveries: Discovery[];
  results: PartialResults;
  /** How many competitors the report compares against. */
  competitorCount: number;
  /** Null until the homepage is read, and after if no version of the address answered. */
  homepage: HomepageFacts | null;
  spend: Spend;
  reportId: string | null;
}

export interface LeadRecord extends UnlockRequest {
  auditId: string;
  domain: string;
  overall: number | null;
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

/**
 * Changes an audit from its latest state. The scan runs in the background, so every write goes through
 * here rather than saving a copy read earlier.
 */
export function updateAudit(id: string, change: (audit: AuditRecord) => AuditRecord): void {
  const audit = store.audits.get(id);
  if (audit) store.audits.set(id, change(audit));
}

/** One lead per audit: unlocking again replaces it. */
export const saveLead = (lead: LeadRecord) => store.leads.set(lead.auditId, lead);

export const findReport = (id: string) => store.reports.get(id);
export const saveReport = (id: string, report: ReportPayload) => store.reports.set(id, report);
