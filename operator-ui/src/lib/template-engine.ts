/**
 * Outreach template engine.
 *
 * Two responsibilities:
 *   1. Render a template with intake-specific variables filled in.
 *   2. Rank templates for a given intake situation using a calibrated
 *      confidence score (declared base blended with observed hit rate
 *      from prior touches that used this template).
 *
 * Rendering is deliberately simple - {{var}} substitution against a
 * known variable set. This keeps templates safe to author by anyone
 * (no scripting / no eval) and easy to swap for an LLM-rendered version
 * later if you decide to add that.
 */

import { db } from './db'

export interface IntakeContext {
  org_id: string
  intent: 'scale' | 'launch' | 'ecosystems'
  status: string
}

export interface RenderVars {
  name?: string | null
  email?: string
  intent?: string
  tier?: string | null
  operator_name?: string | null
  org_name?: string | null
}

export interface RankedTemplate {
  id: string
  name: string
  channel: string
  subject_template: string | null
  body_template: string
  version: number
  base_confidence: number
  calibrated_confidence: number
  sample_size: number
}

export interface RenderedTemplate {
  subject: string | null
  body: string
}

const SAFE_VAR_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Simple {{var}} substitution. Unknown variables are left as-is so an
 * operator notices them rather than sending blank text.
 */
export function renderTemplate(
  template: { subject_template: string | null; body_template: string },
  vars: RenderVars
): RenderedTemplate {
  const dict: Record<string, string> = {}
  for (const [k, v] of Object.entries(vars)) {
    if (!SAFE_VAR_RE.test(k)) continue
    if (v === null || v === undefined) continue
    dict[k] = String(v)
  }
  const sub = (s: string) =>
    s.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (full, key) =>
      Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : full
    )
  return {
    subject: template.subject_template ? sub(template.subject_template) : null,
    body: sub(template.body_template),
  }
}

/**
 * Look up the active templates that match an intake's intent + status,
 * compute calibrated confidence for each from outcome history, and
 * return them sorted descending.
 */
export async function rankTemplatesForIntake(
  intake: IntakeContext
): Promise<RankedTemplate[]> {
  const templates = await db.outreachTemplate.findMany({
    where: {
      org_id: intake.org_id,
      archived_at: null,
      AND: [
        { OR: [{ intent_filter: null }, { intent_filter: intake.intent }] },
        { OR: [{ status_filter: null }, { status_filter: intake.status }] },
      ],
    },
  })

  const ranked: RankedTemplate[] = []
  for (const t of templates) {
    const resolved = await db.touch.findMany({
      where: {
        template_id: t.id,
        outcome: { in: ['successful', 'unsuccessful'] },
      },
      select: { outcome: true },
    })
    const sample = resolved.length
    let calibrated = t.base_confidence
    if (sample >= 5) {
      const successful = resolved.filter((r) => r.outcome === 'successful').length
      const hitRate = successful / sample
      const weight = sample / (sample + 5)
      calibrated = Math.round(
        Math.max(1, Math.min(99, t.base_confidence * (1 - weight) + hitRate * 100 * weight))
      )
    }
    ranked.push({
      id: t.id,
      name: t.name,
      channel: t.channel,
      subject_template: t.subject_template,
      body_template: t.body_template,
      version: t.version,
      base_confidence: t.base_confidence,
      calibrated_confidence: calibrated,
      sample_size: sample,
    })
  }

  ranked.sort((a, b) => b.calibrated_confidence - a.calibrated_confidence)
  return ranked
}
