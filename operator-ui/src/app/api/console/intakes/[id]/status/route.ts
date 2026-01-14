/**
 * Update Intake Status API
 * POST /api/console/intakes/[id]/status
 * 
 * Updates intake status and timestamps
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { intakesRepo } from '@/lib/repositories/intakes'
import { eventsRepo } from '@/lib/repositories/events'
import { IntakeStatus } from '@/lib/intake-routing'

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

    const { id } = params
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses: IntakeStatus[] = ['new', 'contacted', 'qualified', 'closed', 'lost']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Update status (returns previous status)
    const previousStatus = await intakesRepo.updateStatus(orgId, id, status, user.id)

    // Log event
    await eventsRepo.create({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: 'intake_status_updated',
      target_type: 'intake',
      target_id: id,
      metadata: {
        status,
        previous_status: previousStatus,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Intake status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

