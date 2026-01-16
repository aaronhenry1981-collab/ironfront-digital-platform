/**
 * Owner Overview Metrics API
 * GET /api/console/overview
 * 
 * Returns system-level metrics (owner-only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

const MOCK_ORG_ID = '00000000-0000-0000-0000-000000000002'

export async function GET(request: NextRequest) {
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

    // Only owners can access overview
    if (context.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // New intakes (24h / 7d)
    const new24h = await db.intake.count({
      where: {
        org_id: orgId,
        created_at: { gte: last24h },
      },
    })

    const new7d = await db.intake.count({
      where: {
        org_id: orgId,
        created_at: { gte: last7d },
      },
    })

    // Time to first contact (avg)
    const contactedIntakes = await db.intake.findMany({
      where: {
        org_id: orgId,
        first_contact_at: { not: null },
      },
      select: {
        created_at: true,
        first_contact_at: true,
      },
    })

    let avgTimeToContact = 0
    if (contactedIntakes.length > 0) {
      const totalMs = contactedIntakes.reduce((sum, intake) => {
        if (intake.first_contact_at) {
          return sum + (intake.first_contact_at.getTime() - intake.created_at.getTime())
        }
        return sum
      }, 0)
      avgTimeToContact = Math.round(totalMs / contactedIntakes.length / (1000 * 60 * 60)) // hours
    }

    // Conversion by intent
    const conversions = await db.intake.groupBy({
      by: ['intent', 'status'],
      where: {
        org_id: orgId,
      },
      _count: true,
    })

    // Unassigned backlog
    const unassigned = await db.intake.count({
      where: {
        org_id: orgId,
        assigned_user_id: null,
        status: { in: ['new', 'contacted'] },
      },
    })

    // SLA breaches (unassigned > 24 hours)
    const slaBreachTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const slaBreaches = await db.intake.count({
      where: {
        org_id: orgId,
        assigned_user_id: null,
        status: 'new',
        created_at: { lt: slaBreachTime },
      },
    })

    return NextResponse.json({
      new_intakes_24h: new24h,
      new_intakes_7d: new7d,
      avg_time_to_contact_hours: avgTimeToContact,
      conversion_by_intent: conversions.reduce((acc, c) => {
        if (!acc[c.intent]) acc[c.intent] = {}
        acc[c.intent][c.status] = c._count
        return acc
      }, {} as Record<string, Record<string, number>>),
      unassigned_backlog: unassigned,
      sla_breaches: slaBreaches,
    })
  } catch (error) {
    console.error('Overview API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


