/**
 * Inbound email webhook.
 *
 *   POST /api/inbound/email   (header: x-inbound-secret: $INBOUND_EMAIL_SECRET)
 *
 * Accepts a normalized payload from whatever inbound pipeline you wire up:
 *   {
 *     to:      string,           // e.g. "intake-<id>@operations.example.com"
 *     from:    string,
 *     subject: string,
 *     text:    string,
 *     headers: Record<string,string>,  // optional, for threading
 *   }
 *
 * Routing: extracts the intake id from the `to` address (pattern
 * intake-<uuid>@<domain>) and logs an inbound touch on that intake. Stamps
 * the intake's last_activity_at so it sorts to the top.
 *
 * For AWS SES inbound: configure a Receipt Rule that delivers to a Lambda
 * which posts the normalized JSON above to this endpoint with the
 * INBOUND_EMAIL_SECRET header. Or wire SNS → API Gateway → here. The
 * endpoint deliberately doesn't speak SES's raw envelope so it stays
 * compatible with SendGrid Inbound Parse, Postmark, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { eventsRepo } from '@/lib/repositories/events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const INTAKE_RE = /(?:^|<)intake-([0-9a-fA-F-]{36})@/

export async function POST(request: NextRequest) {
  const expected = process.env.INBOUND_EMAIL_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'INBOUND_EMAIL_SECRET not configured on server' },
      { status: 503 }
    )
  }
  const provided = request.headers.get('x-inbound-secret')
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const to = String(body.to || '')
  const from = String(body.from || '')
  const subject = body.subject ? String(body.subject) : null
  const text = String(body.text || body.body || '').trim()

  if (!to || !from || !text) {
    return NextResponse.json(
      { error: 'to, from, and text/body are required' },
      { status: 400 }
    )
  }

  const match = INTAKE_RE.exec(to)
  if (!match) {
    // Not addressed to a recognized intake mailbox — accept but no-op so the
    // upstream pipeline doesn't retry forever. Audit so we can see what's
    // landing in the inbound channel.
    await eventsRepo
      .create({
        org_id: process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002',
        actor_user_id: null,
        actor_role: 'system',
        event_type: 'inbound_email_unrouted',
        target_type: 'system',
        target_id: null,
        metadata: { to, from, subject },
      })
      .catch(() => {})
    return NextResponse.json({ ok: true, routed: false, reason: 'unroutable_address' })
  }

  const intakeId = match[1].toLowerCase()
  const intake = await db.intake.findUnique({ where: { id: intakeId } })
  if (!intake) {
    return NextResponse.json(
      { ok: true, routed: false, reason: 'intake_not_found', intake_id: intakeId },
      { status: 200 }
    )
  }

  const touch = await db.touch.create({
    data: {
      org_id: intake.org_id || (process.env.INTAKE_ORG_ID as string),
      intake_id: intake.id,
      operator_user_id: null,
      channel: 'email',
      direction: 'inbound',
      subject,
      body: text,
      template_id: null,
      context_summary: null,
    },
  })

  // Update intake last_activity_at and bump back to 'contacted' if it had
  // been silently aging — an inbound reply means the lead is still engaged.
  await db.intake.update({
    where: { id: intake.id },
    data: {
      last_activity_at: new Date(),
      ...(intake.status === 'closed' || intake.status === 'lost'
        ? { status: 'contacted' }
        : {}),
    },
  })

  await eventsRepo.create({
    org_id: intake.org_id || (process.env.INTAKE_ORG_ID as string),
    actor_user_id: null,
    actor_role: 'system',
    event_type: 'inbound_email_received',
    target_type: 'intake',
    target_id: intake.id,
    metadata: {
      touch_id: touch.id,
      from,
      subject,
      reopened_from_status: intake.status === 'closed' || intake.status === 'lost' ? intake.status : null,
    },
  })

  return NextResponse.json({ ok: true, routed: true, intake_id: intake.id, touch_id: touch.id })
}
