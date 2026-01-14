/**
 * Intakes API
 * GET /api/console/intakes
 * 
 * Returns intakes scoped by role
 * Operators see assigned + unassigned relevant to role
 * Owner sees aggregate only
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { intakesRepo } from '@/lib/repositories/intakes'

// TODO: Get orgId from auth/session
const MOCK_ORG_ID = '00000000-0000-0000-0000-000000000002'

export async function GET(request: NextRequest) {
  try {
    // Resolve user and org context
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, use intake org - TODO: Get from session
    const orgId = MOCK_ORG_ID
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch intakes scoped by role
    const intakes = await intakesRepo.findByOrg(
      orgId,
      context.user.id,
      context.role
    )

    return NextResponse.json(intakes)
  } catch (error) {
    console.error('Intakes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

