/**
 * Outreach templates - list & create.
 *
 * Templates are the operator's playbook of reusable messages. Each one
 * accumulates an outcome history (via touches that used it) which the
 * template engine reads to compute calibrated confidence. Templates
 * with proven hit rate float to the top of recommendations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { eventsRepo } from '@/lib/repositories/events'

export const dynamic = 'force-dynamic'

const MOCK_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

const VALID_CHANNELS = new Set(['email', 'sms', 'call', 'meeting', 'note'])
const VALID_INTENTS = new Set(['scale', 'launch', 'ecosystems'])

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = MOCK_ORG_ID
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const includeArchived =
      request.nextUrl.searchParams.get('include_archived') === 'true'

    const templates = await db.outreachTemplate.findMany({
      where: {
        org_id: orgId,
        ...(includeArchived ? {} : { archived_at: null }),
      },
      orderBy: { created_at: 'desc' },
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Templates list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = MOCK_ORG_ID
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    const channel = String(body.channel || '').toLowerCase()
    const subjectTemplate = body.subject_template ? String(body.subject_template) : null
    const bodyTemplate = String(body.body_template || '').trim()
    const intentFilter = body.intent_filter ? String(body.intent_filter) : null
    const statusFilter = body.status_filter ? String(body.status_filter) : null
    const baseConfidence = Number.isInteger(body.base_confidence)
      ? Math.max(1, Math.min(99, body.base_confidence))
      : 50

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!VALID_CHANNELS.has(channel))
      return NextResponse.json({ error: 'invalid channel' }, { status: 400 })
    if (!bodyTemplate) return NextResponse.json({ error: 'body_template is required' }, { status: 400 })
    if (intentFilter && !VALID_INTENTS.has(intentFilter))
      return NextResponse.json({ error: 'invalid intent_filter' }, { status: 400 })

    const template = await db.outreachTemplate.create({
      data: {
        org_id: orgId,
        name,
        channel,
        subject_template: subjectTemplate,
        body_template: bodyTemplate,
        intent_filter: intentFilter,
        status_filter: statusFilter,
        base_confidence: baseConfidence,
        created_by_user_id: user.id,
      },
    })

    await eventsRepo.create({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: 'template_created',
      target_type: 'template',
      target_id: template.id,
      metadata: { name, channel, intent_filter: intentFilter, status_filter: statusFilter },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Template create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
