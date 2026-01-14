/**
 * Assign Intake API
 * POST /api/console/intakes/[id]/assign
 * 
 * Manual reassignment (advanced operators only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { intakesRepo } from '@/lib/repositories/intakes'
import { eventsRepo } from '@/lib/repositories/events'
import { canDoSegmentActions } from '@/lib/auth'

const MOCK_ORG_ID = '00000000-0000-0000-0000-000000000002'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = MOCK_ORG_ID
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only operators and owners can reassign
    if (!canDoSegmentActions(context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()
    const { assigned_user_id } = body

    // Update assignment
    await intakesRepo.assign(orgId, id, assigned_user_id || null, user.id)

    // Log event
    await eventsRepo.create({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: 'intake_reassigned',
      target_type: 'intake',
      target_id: id,
      metadata: {
        assigned_user_id: assigned_user_id || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Intake assignment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

