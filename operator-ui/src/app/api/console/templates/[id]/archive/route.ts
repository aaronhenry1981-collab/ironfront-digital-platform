/**
 * Archive a template (soft-delete). Past touches keep their template_id
 * link so confidence calibration of any successor versions still works.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { eventsRepo } from '@/lib/repositories/events'

export const dynamic = 'force-dynamic'

const MOCK_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = MOCK_ORG_ID
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const tpl = await db.outreachTemplate.findFirst({
      where: { id: params.id, org_id: orgId },
    })
    if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (tpl.archived_at) return NextResponse.json({ error: 'Already archived' }, { status: 409 })

    await db.outreachTemplate.update({
      where: { id: tpl.id },
      data: { archived_at: new Date() },
    })

    await eventsRepo.create({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: 'template_archived',
      target_type: 'template',
      target_id: tpl.id,
      metadata: { name: tpl.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template archive error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
