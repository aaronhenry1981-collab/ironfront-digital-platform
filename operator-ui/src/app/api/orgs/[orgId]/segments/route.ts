/**
 * Segments API
 * GET /api/orgs/[orgId]/segments
 * 
 * Returns computed segments (derived clusters)
 */

import { NextRequest, NextResponse } from 'next/server'
import { Segment } from '@/lib/types'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { segmentsRepo } from '@/lib/repositories/segments'
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

    const orgId = params.orgId
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch segments from database (computed)
    const segments = await segmentsRepo.findByOrg(orgId)

    // Write audit event
    await writeAuditEvent({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: AuditEventTypes.SEGMENT_VIEWED,
      metadata: {
        segment_count: segments.length,
      },
    })

    return NextResponse.json(segments, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Segments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
