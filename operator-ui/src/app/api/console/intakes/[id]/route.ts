/**
 * Get Intake Detail API
 * GET /api/console/intakes/[id]
 * 
 * Returns single intake detail
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { intakesRepo } from '@/lib/repositories/intakes'

const MOCK_ORG_ID = '00000000-0000-0000-0000-000000000002'

export async function GET(
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
    const intake = await intakesRepo.findById(orgId, id)

    if (!intake) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(intake)
  } catch (error) {
    console.error('Intake detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


