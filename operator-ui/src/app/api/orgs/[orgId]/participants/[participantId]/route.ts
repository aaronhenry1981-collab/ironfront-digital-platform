/**
 * Participant Detail API
 * GET /api/orgs/[orgId]/participants/[participantId]
 * 
 * Returns participant detail with recommendations and recent interventions
 */

import { NextRequest, NextResponse } from 'next/server'
import { ParticipantDetail } from '@/lib/types'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { participantsRepo } from '@/lib/repositories/participants'
import { recommendationsRepo } from '@/lib/repositories/recommendations'
import { interventionsRepo } from '@/lib/repositories/interventions'
import { writeAuditEvent, AuditEventTypes } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string; participantId: string } }
) {
  try {
    // Resolve user and org context
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, participantId } = params
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch participant from database
    const participant = await participantsRepo.findById(orgId, participantId)
    if (!participant) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Fetch recommendations and interventions
    const [recommendations, recentInterventions] = await Promise.all([
      recommendationsRepo.findByTarget(orgId, 'node', participantId),
      interventionsRepo.findRecentByParticipant(orgId, participantId),
    ])

    const detail: ParticipantDetail = {
      participant,
      recommendations,
      recent_interventions: recentInterventions,
    }

    // Write audit event
    await writeAuditEvent({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: AuditEventTypes.PARTICIPANT_DETAIL_VIEWED,
      target_type: 'node',
      target_id: participantId,
      metadata: {
        recommendation_count: recommendations.length,
      },
    })

    return NextResponse.json(detail)
  } catch (error) {
    console.error('Participant detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
