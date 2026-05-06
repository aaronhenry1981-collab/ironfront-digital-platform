/**
 * Conversation thread for an intake.
 *
 *   GET  - list touches in chronological order
 *   POST - log a new touch (outbound by default; pass direction=inbound
 *          for a reply received)
 *
 * Optionally accepts template_id; if rendered_subject/body aren't supplied
 * but template_id is, the server renders the template against the intake's
 * known fields. This means the operator UI can either let users edit before
 * send, or just pick a template and let the server render it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { eventsRepo } from '@/lib/repositories/events'
import { renderTemplate } from '@/lib/template-engine'
import { sendEmail, buildReplyToForIntake, isEmailConfigured } from '@/lib/email'

export const dynamic = 'force-dynamic'

const MOCK_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

const VALID_CHANNELS = new Set(['email', 'sms', 'call', 'meeting', 'note'])
const VALID_DIRECTIONS = new Set(['outbound', 'inbound'])

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = MOCK_ORG_ID
    const context = await resolveOrgContext(user.id, orgId)
    if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const touches = await db.touch.findMany({
      where: { org_id: orgId, intake_id: params.id },
      orderBy: { created_at: 'asc' },
    })
    return NextResponse.json(touches)
  } catch (error) {
    console.error('Touches list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const body = await request.json().catch(() => ({}))
    const channel = String(body.channel || '').toLowerCase()
    const direction = String(body.direction || 'outbound').toLowerCase()
    const templateId: string | null = body.template_id || null
    const subject: string | null = body.subject ?? null
    let touchBody: string = body.body || ''
    let renderedSubject = subject
    const contextSummary: string | null = body.context_summary ?? null

    if (!VALID_CHANNELS.has(channel)) {
      return NextResponse.json(
        { error: `channel must be one of ${[...VALID_CHANNELS].join(', ')}` },
        { status: 400 }
      )
    }
    if (!VALID_DIRECTIONS.has(direction)) {
      return NextResponse.json({ error: 'direction must be outbound or inbound' }, { status: 400 })
    }

    const intake = await db.intake.findFirst({
      where: { id: params.id, org_id: orgId },
    })
    if (!intake) return NextResponse.json({ error: 'Intake not found' }, { status: 404 })

    // If a template was specified but body wasn't supplied verbatim,
    // render the template against the intake's variables.
    if (templateId && !body.body) {
      const tpl = await db.outreachTemplate.findFirst({
        where: { id: templateId, org_id: orgId, archived_at: null },
      })
      if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      const prefs = (intake.preferences as any) || {}
      const rendered = renderTemplate(tpl, {
        name: intake.name,
        email: intake.email,
        intent: intake.intent,
        tier: prefs.tier ?? null,
        operator_name: user.email,
      })
      renderedSubject = renderedSubject ?? rendered.subject
      touchBody = rendered.body
    }

    if (!touchBody.trim()) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 })
    }

    // For outbound emails, attempt actual delivery via SES. We send BEFORE
    // creating the touch row so a delivery failure doesn't leave a phantom
    // "sent" record. Operators see the error and can retry.
    let emailMessageId: string | null = null
    let emailDeliveryError: string | null = null
    const shouldDeliver =
      direction === 'outbound' && channel === 'email' && body.deliver !== false

    if (shouldDeliver) {
      if (!isEmailConfigured()) {
        return NextResponse.json(
          {
            error:
              'Email provider not configured. Set AWS_REGION + AWS_SES_FROM_EMAIL, ' +
              'or pass deliver:false to log the touch without sending.',
          },
          { status: 503 }
        )
      }
      const result = await sendEmail({
        to: intake.email,
        subject: renderedSubject || '(no subject)',
        text: touchBody,
        replyTo: buildReplyToForIntake(intake.id) || undefined,
      })
      if (!result.ok) {
        return NextResponse.json(
          { error: `Failed to send email: ${result.error}` },
          { status: 502 }
        )
      }
      emailMessageId = result.message_id || null
    }

    const touch = await db.touch.create({
      data: {
        org_id: orgId,
        intake_id: intake.id,
        operator_user_id: direction === 'outbound' ? user.id : null,
        channel,
        direction,
        subject: renderedSubject,
        body: touchBody,
        template_id: templateId,
        context_summary: contextSummary,
      },
    })

    // Outbound touches count as activity and a first contact.
    if (direction === 'outbound') {
      await db.intake.update({
        where: { id: intake.id },
        data: {
          last_activity_at: new Date(),
          ...(intake.first_contact_at ? {} : { first_contact_at: new Date() }),
        },
      })
    }

    await eventsRepo.create({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: 'touch_logged',
      target_type: 'intake',
      target_id: intake.id,
      metadata: {
        touch_id: touch.id,
        channel,
        direction,
        template_id: templateId,
        email_message_id: emailMessageId,
        delivered: shouldDeliver,
      },
    })

    return NextResponse.json({ success: true, touch })
  } catch (error) {
    console.error('Touch create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
