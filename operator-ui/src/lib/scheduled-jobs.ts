/**
 * Shared scheduled-jobs runner — invoked by both the external cron
 * endpoint (POST /api/cron/run-jobs, gated by CRON_SECRET) and the
 * owner-triggered "Run jobs now" button (POST /api/console/run-jobs-now,
 * gated by owner auth).
 */

import { runEscalationChecks, EscalationAlert } from './atlas-escalation'
import { generateRecommendations, GeneratorRun } from './recommendation-generator'
import { eventsRepo } from './repositories/events'

export interface ScheduledJobsResult {
  ok: boolean
  duration_ms: number
  escalation_alerts: EscalationAlert[]
  recommendation_summary: GeneratorRun | null
  errors: Array<{ job: string; error: string }>
}

export async function runScheduledJobs(
  orgId: string,
  triggerSource: 'cron' | 'manual'
): Promise<ScheduledJobsResult> {
  const startedAt = Date.now()
  const errors: Array<{ job: string; error: string }> = []

  let escalationAlerts: EscalationAlert[] = []
  try {
    escalationAlerts = await runEscalationChecks(orgId)
  } catch (e: any) {
    errors.push({ job: 'escalation_checks', error: e?.message || String(e) })
  }

  let recommendationSummary: GeneratorRun | null = null
  try {
    recommendationSummary = await generateRecommendations(orgId)
  } catch (e: any) {
    errors.push({
      job: 'recommendation_generator',
      error: e?.message || String(e),
    })
  }

  const durationMs = Date.now() - startedAt

  try {
    await eventsRepo.create({
      org_id: orgId,
      actor_user_id: null,
      actor_role: triggerSource === 'manual' ? 'owner' : 'system',
      event_type:
        triggerSource === 'manual' ? 'jobs_run_manually' : 'cron_run_jobs',
      target_type: 'system',
      target_id: null,
      metadata: {
        duration_ms: durationMs,
        escalation_alert_count: escalationAlerts.length,
        recommendation_summary: recommendationSummary,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (e) {
    console.error('Failed to log run-jobs event (non-fatal):', e)
  }

  return {
    ok: errors.length === 0,
    duration_ms: durationMs,
    escalation_alerts: escalationAlerts,
    recommendation_summary: recommendationSummary,
    errors,
  }
}
