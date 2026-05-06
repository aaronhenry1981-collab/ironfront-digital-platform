/**
 * Dismiss a recommendation. Reason is optional but recommended -
 * dismissal reasons feed back into generator tuning.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { eventsRepo } from '@/lib/repositories/events'

export const dynamic = 'force-dynamic'

const MOCK_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = MOCK_ORG_ID
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = params
    const body = await request.json().catch(() => ({}))
    const reason: string | null = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null

    const rec = await db.recommendation.findFirst({
      where: { id, org_id: orgId },
      select: { id: true, status: true, generator: true, generator_version: true },
    })
    if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (rec.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot dismiss a recommendation in '${rec.status}' state` },
        { status: 409 }
      )
    }

    const now = new Date()
    await db.recommendation.update({
      where: { id },
      data: {
        status: 'dismissed',
        dismissed_by_user_id: user.id,
        dismissed_at: now,
        dismissal_reason: reason,
        // Dismissed recommendations are immediately marked 'unrelated' for
        // confidence calibration - the generator never got a chance to be
        // proven right or wrong.
        outcome: 'unrelated',
        outcome_recorded_at: now,
      },
    })

    await eventsRepo.create({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: 'recommendation_dismissed',
      target_type: 'recommendation',
      target_id: id,
      metadata: {
        reason,
        generator: rec.generator,
        generator_version: rec.generator_version,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Recommendation dismiss error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
