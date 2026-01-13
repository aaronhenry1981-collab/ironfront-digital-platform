/**
 * Atlas Recommendations API
 * GET /api/orgs/[orgId]/recommendations?target_type=node&target_id=123
 * 
 * Returns Atlas pattern detection recommendations (read-only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { Recommendation } from '@/lib/types'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { recommendationsRepo } from '@/lib/repositories/recommendations'
import { writeAuditEvent, AuditEventTypes } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    // Resolve user and org context
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetType = searchParams.get('target_type') as 'node' | 'segment'
    const targetId = searchParams.get('target_id')

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: 'Missing target_type or target_id' },
        { status: 400 }
      )
    }

    const orgId = params.orgId
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch recommendations from database
    const recommendations = await recommendationsRepo.findByTarget(orgId, targetType, targetId)

    // Write audit event
    await writeAuditEvent({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: AuditEventTypes.RECOMMENDATION_VIEWED,
      target_type: targetType,
      target_id: targetId,
      metadata: {
        recommendation_count: recommendations.length,
      },
    })

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('Recommendations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
