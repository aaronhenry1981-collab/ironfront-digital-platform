/**
 * Owner-triggered "Run jobs now" — runs the same scheduled-job logic
 * as the cron endpoint, but auth via session (must be owner) instead
 * of the CRON_SECRET header. For debugging and impatient operators.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isOwner } from '@/lib/auth'
import { runScheduledJobs } from '@/lib/scheduled-jobs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const INTAKE_ORG_ID =
  process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

export async function POST(_request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isOwner(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const result = await runScheduledJobs(INTAKE_ORG_ID, 'manual')
  return NextResponse.json(result)
}
