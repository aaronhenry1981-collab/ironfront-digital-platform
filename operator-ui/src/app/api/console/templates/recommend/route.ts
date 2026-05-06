/**
 * Recommend the best templates for a given intake's situation.
 *
 *   GET /api/console/templates/recommend?intake_id=...
 *
 * Returns templates that match the intake's intent + status, ranked by
 * calibrated confidence (declared base blended with observed hit rate
 * from prior touches that used the template).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { rankTemplatesForIntake } from '@/lib/template-engine'

export const dynamic = 'force-dynamic'

const MOCK_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = MOCK_ORG_ID
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const intakeId = request.nextUrl.searchParams.get('intake_id')
    if (!intakeId) return NextResponse.json({ error: 'intake_id required' }, { status: 400 })

    const intake = await db.intake.findFirst({
      where: { id: intakeId, org_id: orgId },
      select: { intent: true, status: true },
    })
    if (!intake) return NextResponse.json({ error: 'Intake not found' }, { status: 404 })

    const ranked = await rankTemplatesForIntake({
      org_id: orgId,
      intent: intake.intent as any,
      status: intake.status,
    })

    return NextResponse.json(ranked)
  } catch (error) {
    console.error('Template recommend error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
