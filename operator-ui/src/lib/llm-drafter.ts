/**
 * LLM-powered next-touch drafter using Claude Opus 4.7.
 *
 * Inputs: a fully-built ConversationContext (intake + thread + active
 * recommendations + ranked templates).
 * Output: a drafted outbound touch — subject, body, rationale, and a
 * one-line rolling summary the caller can persist.
 *
 * Uses the Anthropic SDK directly (in-house Claude, no third-party LLMs).
 * Adaptive thinking is on by default because choosing the right next move
 * given a multi-turn thread genuinely benefits from reasoning. Falls back
 * gracefully when ANTHROPIC_API_KEY is unset — callers can still use the
 * rule-based template ranking from template-engine.ts.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ConversationContext } from './conversation-context'

export class LlmDrafterUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmDrafterUnavailableError'
  }
}

export interface DraftedTouch {
  channel: 'email' | 'sms' | 'note'
  subject: string | null
  body: string
  rationale: string
  rolling_summary: string
  template_id_used: string | null
}

export interface DraftOptions {
  channel?: 'email' | 'sms' | 'note'
  tone?: 'warm' | 'direct' | 'concise'
  template_id_hint?: string | null
  operator_email?: string | null
}

const SYSTEM_PROMPT = `You are an outreach assistant for Iron Front Digital, an operational software platform.

ROLE
You help human operators draft thoughtful, brand-aligned next-touch messages
to inbound applicants (intakes). You never send messages yourself — you draft,
the operator reviews and sends.

BRAND VOICE
- Direct and respectful. No hype, no high-pressure sales language.
- Clear about what Iron Front Digital is: a platform/infrastructure provider.
- Never imply income guarantees, business opportunities, or recruiting.
- Treat the applicant as a serious operator, not a lead to convert.

CONTEXT-FOLLOWING RULES
- Read the entire conversation thread before drafting. Reference specifics
  the applicant has shared. Never repeat questions you can already answer
  from prior touches.
- If the applicant raised a concern or asked a question that wasn't answered,
  address it explicitly.
- If the rolling_summary is present, treat it as the authoritative thread
  summary — don't contradict it.
- If a template has high calibrated_confidence and matches the situation,
  start from it but adapt the wording to the specific applicant. Cite it
  in template_id_used. Otherwise leave template_id_used null.

OUTPUT
Return JSON only — no preamble, no explanation outside the JSON.
The "body" should be 80-200 words for email, 1-2 sentences for sms, and
under 50 words for note. The "rationale" is one or two sentences explaining
why this is the right next move (operator-facing, not customer-facing).
The "rolling_summary" is one sentence summarizing the full thread state
after this touch is sent — this gets persisted on the new touch and helps
future drafts stay grounded.`

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['channel', 'subject', 'body', 'rationale', 'rolling_summary', 'template_id_used'],
  properties: {
    channel: { type: 'string', enum: ['email', 'sms', 'note'] },
    subject: { type: ['string', 'null'] },
    body: { type: 'string' },
    rationale: { type: 'string' },
    rolling_summary: { type: 'string' },
    template_id_used: { type: ['string', 'null'] },
  },
}

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new LlmDrafterUnavailableError(
      'ANTHROPIC_API_KEY is not set. Set it in the environment to enable LLM drafting; ' +
        'the rule-based template ranking continues to work without it.'
    )
  }
  if (!client) client = new Anthropic()
  return client
}

export async function draftNextTouch(
  ctx: ConversationContext,
  options: DraftOptions = {}
): Promise<DraftedTouch> {
  const c = getClient()
  const userMessage = buildUserMessage(ctx, options)

  // Stream so high adaptive-thinking budgets don't blow past the SDK's
  // per-chunk read timeout. .finalMessage() collects the complete Message.
  const stream = c.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
    output_config: {
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
    },
  })

  const message = await stream.finalMessage()

  const textBlock = message.content.find((b: any) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('LLM returned no text block')
  }

  let parsed: any
  try {
    parsed = JSON.parse(textBlock.text)
  } catch (e) {
    throw new Error(`LLM returned non-JSON response: ${textBlock.text.slice(0, 200)}`)
  }

  return {
    channel: parsed.channel,
    subject: parsed.subject ?? null,
    body: parsed.body,
    rationale: parsed.rationale,
    rolling_summary: parsed.rolling_summary,
    template_id_used: parsed.template_id_used ?? null,
  }
}

function buildUserMessage(ctx: ConversationContext, options: DraftOptions): string {
  const channel = options.channel || 'email'
  const tone = options.tone || 'direct'

  const parts: string[] = []
  parts.push(`Draft the next outbound ${channel} touch.`)
  parts.push(`Tone: ${tone}.`)
  if (options.operator_email) {
    parts.push(`Drafted by operator: ${options.operator_email}.`)
  }
  if (options.template_id_hint) {
    parts.push(`Operator suggested starting from template: ${options.template_id_hint}.`)
  }
  parts.push('')
  parts.push('## Intake')
  parts.push(JSON.stringify(ctx.intake, null, 2))
  parts.push('')
  parts.push('## Conversation thread (chronological)')
  if (ctx.thread.length === 0) {
    parts.push('(No prior touches — this is the first contact.)')
  } else {
    for (const t of ctx.thread) {
      parts.push(
        `[${t.created_at}] ${t.direction.toUpperCase()} ${t.channel}` +
          (t.subject ? ` — ${t.subject}` : '')
      )
      parts.push(t.body)
      parts.push('')
    }
  }
  parts.push('## Active recommendations targeting this intake')
  if (ctx.active_recommendations.length === 0) {
    parts.push('(none)')
  } else {
    for (const r of ctx.active_recommendations) {
      parts.push(`- (${r.confidence}%) ${r.suggested_action} — ${r.reason}`)
    }
  }
  parts.push('')
  parts.push('## Top-ranked outreach templates (calibrated confidence shown)')
  if (ctx.recommended_templates.length === 0) {
    parts.push('(no matching templates)')
  } else {
    for (const t of ctx.recommended_templates) {
      parts.push(
        `- ${t.id} "${t.name}" (channel=${t.channel}, ${t.calibrated_confidence}% confidence, ` +
          `${t.sample_size} prior touches)`
      )
      if (t.subject_template) parts.push(`  subject: ${t.subject_template}`)
      parts.push(`  body: ${t.body_template.slice(0, 400)}${t.body_template.length > 400 ? '...' : ''}`)
    }
  }
  if (ctx.rolling_summary) {
    parts.push('')
    parts.push('## Rolling summary (most recent)')
    parts.push(ctx.rolling_summary)
  }

  return parts.join('\n')
}
