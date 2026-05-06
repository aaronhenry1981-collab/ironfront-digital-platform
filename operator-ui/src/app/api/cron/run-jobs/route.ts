/**
 * Scheduled-jobs entry point.
 *
 * Auth: requires header `x-cron-secret` to match CRON_SECRET env var.
 * Trigger from any external scheduler (EventBridge, GitHub Actions cron,
 * Vercel Cron, system crontab + curl, etc.) — just POST here on a timer.
 *
 * The actual job logic lives in lib/scheduled-jobs.ts so the owner-
 * triggered "Run jobs now" button can share it.
 *
 * Recommended cadence: every 15 minutes. Each job is idempotent.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runScheduledJobs } from '@/lib/scheduled-jobs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const INTAKE_ORG_ID =
  process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

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

  const result = await runScheduledJobs(INTAKE_ORG_ID, 'cron')
  return NextResponse.json(result)
}
