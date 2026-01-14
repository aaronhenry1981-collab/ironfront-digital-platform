/**
 * Update Intake Notes API
 * POST /api/console/intakes/[id]/notes
 * 
 * Updates intake notes
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { intakesRepo } from '@/lib/repositories/intakes'

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
    const { notes } = body

    // Update notes
    await intakesRepo.updateNotes(orgId, id, notes || '')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Intake notes update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

