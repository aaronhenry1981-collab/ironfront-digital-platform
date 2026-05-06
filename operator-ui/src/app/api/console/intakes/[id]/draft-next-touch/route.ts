/**
 * Draft the next outbound touch for an intake using Claude Opus 4.7.
 *
 *   POST /api/console/intakes/[id]/draft-next-touch
 *   body (optional): { channel?, tone?, template_id_hint? }
 *
 * The operator reviews the draft, edits if needed, then sends it via the
 * existing POST /api/console/intakes/[id]/touches endpoint. The system
 * does not auto-send anything.
 *
 * Returns 503 if ANTHROPIC_API_KEY isn't configured — the rest of the
 * conversation system (templates, ranking, context, outcome tracking)
 * keeps working without LLM drafting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveOrgContext, getCurrentUser } from '@/lib/auth'
import { eventsRepo } from '@/lib/repositories/events'
import { buildConversationContext } from '@/lib/conversation-context'
import { draftNextTouch, LlmDrafterUnavailableError } from '@/lib/llm-drafter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Drafts can take 20-40s with adaptive thinking; bump above the 30s default.
export const maxDuration = 60

const MOCK_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

const VALID_CHANNELS = new Set(['email', 'sms', 'note'])
const VALID_TONES = new Set(['warm', 'direct', 'concise'])

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
    const channel = body.channel ? String(body.channel).toLowerCase() : 'email'
    const tone = body.tone ? String(body.tone).toLowerCase() : 'direct'
    const templateIdHint: string | null = body.template_id_hint || null

    if (!VALID_CHANNELS.has(channel)) {
      return NextResponse.json(
        { error: `channel must be one of ${[...VALID_CHANNELS].join(', ')}` },
        { status: 400 }
      )
    }
    if (!VALID_TONES.has(tone)) {
      return NextResponse.json(
        { error: `tone must be one of ${[...VALID_TONES].join(', ')}` },
        { status: 400 }
      )
    }

    const conv = await buildConversationContext(orgId, params.id)
    if (!conv) return NextResponse.json({ error: 'Intake not found' }, { status: 404 })

    let draft
    try {
      draft = await draftNextTouch(conv, {
        channel: channel as any,
        tone: tone as any,
        template_id_hint: templateIdHint,
        operator_email: user.email,
      })
    } catch (e) {
      if (e instanceof LlmDrafterUnavailableError) {
        return NextResponse.json({ error: e.message }, { status: 503 })
      }
      throw e
    }

    await eventsRepo.create({
      org_id: orgId,
      actor_user_id: user.id,
      actor_role: context.role,
      event_type: 'touch_drafted',
      target_type: 'intake',
      target_id: params.id,
      metadata: {
        channel: draft.channel,
        template_id_used: draft.template_id_used,
        tone,
        thread_length: conv.thread.length,
      },
    })

    return NextResponse.json({
      success: true,
      draft,
      context_used: {
        thread_length: conv.thread.length,
        active_recommendations: conv.active_recommendations.length,
        ranked_template_count: conv.recommended_templates.length,
        had_rolling_summary: conv.rolling_summary !== null,
      },
    })
  } catch (error: any) {
    console.error('Draft-next-touch error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
