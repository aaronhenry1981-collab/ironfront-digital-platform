/**
 * Mark a recommendation as applied.
 * The actual side-effect of "applying" (reassigning, contacting, etc.)
 * happens elsewhere - this endpoint records the operator's intent so we
 * can track outcome. The pairing with outcome data calibrates future
 * confidence scores.
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

    const rec = await db.recommendation.findFirst({
      where: { id, org_id: orgId },
      select: { id: true, status: true, generator: true, generator_version: true },
    })
    if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (rec.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot apply a recommendation in '${rec.status}' state` },
        { status: 409 }
      )
    }

    const now = new Date()
    await db.recommendation.update({
      where: { id },
      data: {
        status: 'applied',
        applied_by_user_id: user.id,
        applied_at: now,
      },
    })

    await eventsRepo.create({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: 'recommendation_applied',
      target_type: 'recommendation',
      target_id: id,
      metadata: {
        generator: rec.generator,
        generator_version: rec.generator_version,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Recommendation apply error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
