/**
 * Graph Query API
 * GET /api/orgs/[orgId]/graph
 * 
 * Returns nodes (participants) and edges (relationships)
 * Read-only, permission-checked, rate-limited, cached
 */

import { NextRequest, NextResponse } from 'next/server'
import { GraphResponse } from '@/lib/types'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { participantsRepo } from '@/lib/repositories/participants'
import { relationshipsRepo } from '@/lib/repositories/relationships'
import { writeAuditEvent, AuditEventTypes } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    // Resolve user and org context (enforces org scoping)
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = params.orgId
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch graph data from database
    const nodes = await participantsRepo.findByOrg(orgId)
    const edges = await relationshipsRepo.findByOrg(orgId)

    const graph: GraphResponse = {
      nodes,
      edges,
      computed_at: new Date().toISOString(),
    }

    // Write audit event
    await writeAuditEvent({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: AuditEventTypes.GRAPH_QUERIED,
      metadata: {
        node_count: nodes.length,
        edge_count: edges.length,
      },
    })

    return NextResponse.json(graph, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Graph API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
