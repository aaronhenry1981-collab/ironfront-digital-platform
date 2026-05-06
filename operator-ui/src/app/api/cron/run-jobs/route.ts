/**
 * Scheduled-jobs entry point.
 *
 * Auth: requires header `x-cron-secret` to match CRON_SECRET env var.
 * Trigger from any external scheduler (EventBridge, GitHub Actions cron,
 * Vercel Cron, system crontab + curl, etc.) - just POST here on a timer.
 *
 * Recommended cadence: every 15 minutes. Each job is idempotent.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runEscalationChecks } from '@/lib/atlas-escalation'
import { generateRecommendations } from '@/lib/recommendation-generator'
import { eventsRepo } from '@/lib/repositories/events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const INTAKE_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 503 }
    )
  }

  const provided = request.headers.get('x-cron-secret')
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const errors: Array<{ job: string; error: string }> = []

  // Job 1: Atlas escalation checks (suggest only - never auto-execute)
  let escalationAlerts: any[] = []
  try {
    escalationAlerts = await runEscalationChecks(INTAKE_ORG_ID)
  } catch (e: any) {
    errors.push({ job: 'escalation_checks', error: e?.message || String(e) })
  }

  // Job 2: Generate fresh recommendations
  let recommendationSummary: any = null
  try {
    recommendationSummary = await generateRecommendations(INTAKE_ORG_ID)
  } catch (e: any) {
    errors.push({ job: 'recommendation_generator', error: e?.message || String(e) })
  }

  const durationMs = Date.now() - startedAt

  // Audit trail
  try {
    await eventsRepo.create({
      org_id: INTAKE_ORG_ID,
      actor_user_id: null,
      actor_role: 'system',
      event_type: 'cron_run_jobs',
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
    console.error('Failed to log cron_run_jobs event (non-fatal):', e)
  }

  return NextResponse.json({
    ok: errors.length === 0,
    duration_ms: durationMs,
    escalation_alerts: escalationAlerts,
    recommendation_summary: recommendationSummary,
    errors: errors.length > 0 ? errors : undefined,
  })
}
