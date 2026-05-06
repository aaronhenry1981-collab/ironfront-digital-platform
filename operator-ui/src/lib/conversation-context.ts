/**
 * Builds full conversation context for an intake.
 *
 * Returned to the operator (or fed to a future LLM message-drafter)
 * before they send the next touch, so the previous thread is followed
 * and not repeated. Includes:
 *   - intake metadata (intent, tier, source, status timeline)
 *   - full ordered touch history (in + out)
 *   - active recommendations targeting this intake
 *   - top-ranked templates for the current situation
 *   - a rolling summary line (latest touch's context_summary if any)
 */

import { db } from './db'
import { rankTemplatesForIntake, RankedTemplate } from './template-engine'

export interface ConversationContext {
  intake: {
    id: string
    name: string | null
    email: string
    intent: string
    status: string
    tier: string | null
    source: string | null
    paid: boolean
    assigned_user_id: string | null
    created_at: string
    first_contact_at: string | null
    last_activity_at: string | null
    notes: string | null
  }
  thread: Array<{
    id: string
    direction: string
    channel: string
    subject: string | null
    body: string
    operator_user_id: string | null
    template_id: string | null
    created_at: string
  }>
  active_recommendations: Array<{
    id: string
    suggested_action: string
    reason: string
    confidence: number
    generator: string | null
  }>
  recommended_templates: RankedTemplate[]
  rolling_summary: string | null
}

export async function buildConversationContext(
  orgId: string,
  intakeId: string
): Promise<ConversationContext | null> {
  const intake = await db.intake.findFirst({
    where: { id: intakeId, org_id: orgId },
  })
  if (!intake) return null

  const prefs = (intake.preferences as any) || {}

  const [touches, recs] = await Promise.all([
    db.touch.findMany({
      where: { org_id: orgId, intake_id: intakeId },
      orderBy: { created_at: 'asc' },
    }),
    db.recommendation.findMany({
      where: {
        org_id: orgId,
        target_type: 'intake',
        target_id: intakeId,
        status: 'active',
      },
      orderBy: { confidence: 'desc' },
    }),
  ])

  const recommendedTemplates = await rankTemplatesForIntake({
    org_id: orgId,
    intent: intake.intent as any,
    status: intake.status,
  })

  const lastWithSummary = [...touches]
    .reverse()
    .find((t) => t.context_summary && t.context_summary.length > 0)

  return {
    intake: {
      id: intake.id,
      name: intake.name,
      email: intake.email,
      intent: intake.intent,
      status: intake.status,
      tier: prefs.tier ?? null,
      source: prefs.source ?? null,
      paid: prefs.paid === true,
      assigned_user_id: intake.assigned_user_id,
      created_at: intake.created_at.toISOString(),
      first_contact_at: intake.first_contact_at?.toISOString() ?? null,
      last_activity_at: intake.last_activity_at?.toISOString() ?? null,
      notes: intake.notes,
    },
    thread: touches.map((t) => ({
      id: t.id,
      direction: t.direction,
      channel: t.channel,
      subject: t.subject,
      body: t.body,
      operator_user_id: t.operator_user_id,
      template_id: t.template_id,
      created_at: t.created_at.toISOString(),
    })),
    active_recommendations: recs.map((r) => ({
      id: r.id,
      suggested_action: r.suggested_action,
      reason: r.reason,
      confidence: r.confidence,
      generator: r.generator,
    })),
    recommended_templates: recommendedTemplates.slice(0, 5),
    rolling_summary: lastWithSummary?.context_summary ?? null,
  }
}
