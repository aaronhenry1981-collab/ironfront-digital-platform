/**
 * Rule-based recommendation generators that learn from outcomes.
 *
 * Each generator scans current state and produces concrete recommendations.
 * Generators are versioned so we can A/B newer versions against older ones
 * using outcome data (recommendations.outcome).
 *
 * Confidence calibration: at write time, each generator's confidence is
 * adjusted by its historical hit rate (successful / (successful+unsuccessful))
 * across previously-resolved recommendations from the same generator+version.
 * Brand-new generators start at their declared `base_confidence`.
 */

import { db } from './db'

export interface GeneratorRun {
  generated: number
  skipped_existing: number
  generator_runs: Array<{ generator: string; version: number; generated: number }>
}

interface GeneratorContext {
  org_id: string
  now: Date
}

interface GeneratorOutput {
  target_type: 'node' | 'segment' | 'intake'
  target_id: string
  suggested_action: string
  reason: string
}

interface Generator {
  name: string
  version: number
  base_confidence: number // 0-100
  run(ctx: GeneratorContext): Promise<GeneratorOutput[]>
}

// ----- Generators -----

const unassignedIntakeReassign: Generator = {
  name: 'unassigned_intake_reassign',
  version: 1,
  base_confidence: 70,
  async run({ org_id, now }) {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const stale = await db.intake.findMany({
      where: {
        org_id,
        assigned_user_id: null,
        status: 'new',
        created_at: { lt: cutoff },
      },
      select: { id: true },
    })
    return stale.map((i) => ({
      target_type: 'intake',
      target_id: i.id,
      suggested_action: 'Reassign to operator with lowest current load',
      reason: 'Unassigned for more than 24 hours',
    }))
  },
}

const slaBreachContact: Generator = {
  name: 'sla_breach_contact',
  version: 1,
  base_confidence: 80,
  async run({ org_id, now }) {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const breaches = await db.intake.findMany({
      where: {
        org_id,
        status: { in: ['new', 'contacted'] },
        first_contact_at: null,
        created_at: { lt: cutoff },
      },
      select: { id: true },
    })
    return breaches.map((i) => ({
      target_type: 'intake',
      target_id: i.id,
      suggested_action: 'Make first contact - SLA already breached',
      reason: 'No first contact recorded after 24h',
    }))
  },
}

const dormantParticipantReactivate: Generator = {
  name: 'dormant_participant_reactivate',
  version: 1,
  base_confidence: 50,
  async run({ org_id }) {
    const dormant = await db.participant.findMany({
      where: { org_id, lifecycle_stage: 'dormant' },
      select: { id: true },
      take: 50,
    })
    return dormant.map((p) => ({
      target_type: 'node',
      target_id: p.id,
      suggested_action: 'Trigger recovery workflow or close',
      reason: 'Lifecycle stage is dormant',
    }))
  },
}

// Qualified or paid-tier intakes that haven't progressed in 48h.
// High-revenue path going stale is the highest-value miss to surface.
const highValueTierStalled: Generator = {
  name: 'high_value_tier_stalled',
  version: 1,
  base_confidence: 85,
  async run({ org_id, now }) {
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const stalled = await db.intake.findMany({
      where: {
        org_id,
        status: { in: ['contacted', 'qualified'] },
        OR: [
          { last_activity_at: { lt: cutoff } },
          { last_activity_at: null, created_at: { lt: cutoff } },
        ],
      },
      select: { id: true, preferences: true },
      take: 100,
    })
    const HIGH_VALUE_TIERS = new Set([
      'Advanced Operator',
      'Builder',
      'Organization / Leader',
      'Franchise License',
    ])
    return stalled
      .filter((i) => {
        const tier = (i.preferences as any)?.tier
        const paid = (i.preferences as any)?.paid === true
        return paid || (typeof tier === 'string' && HIGH_VALUE_TIERS.has(tier))
      })
      .map((i) => ({
        target_type: 'intake' as const,
        target_id: i.id,
        suggested_action: 'Re-engage high-value intake before it cools',
        reason: 'High-value tier or paid intake idle for 48h+',
      }))
  },
}

// Same email applied 2+ times - signals genuine intent, deserves priority.
const repeatApplicantEscalate: Generator = {
  name: 'repeat_applicant_escalate',
  version: 1,
  base_confidence: 75,
  async run({ org_id, now }) {
    const lookback = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const recent = await db.intake.findMany({
      where: { org_id, created_at: { gte: lookback } },
      select: { id: true, email: true, status: true, created_at: true },
      orderBy: { created_at: 'asc' },
    })
    const counts = new Map<string, { ids: string[]; latestId: string }>()
    for (const i of recent) {
      const key = i.email.toLowerCase()
      const slot = counts.get(key)
      if (slot) {
        slot.ids.push(i.id)
        slot.latestId = i.id
      } else {
        counts.set(key, { ids: [i.id], latestId: i.id })
      }
    }
    const out: GeneratorOutput[] = []
    for (const { ids, latestId } of counts.values()) {
      if (ids.length >= 2) {
        out.push({
          target_type: 'intake',
          target_id: latestId,
          suggested_action: 'Prioritize - applicant has applied multiple times',
          reason: `${ids.length} applications from this email in the last 60 days`,
        })
      }
    }
    return out
  },
}

// Source-level conversion drop - flag the source itself, not an intake.
// Targets the synthetic id "source:<slug>" so it dedupes and threads its own audit.
const conversionDropBySource: Generator = {
  name: 'conversion_drop_by_source',
  version: 1,
  base_confidence: 60,
  async run({ org_id, now }) {
    const recentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const baselineStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const all = await db.intake.findMany({
      where: { org_id, created_at: { gte: baselineStart } },
      select: { preferences: true, status: true, created_at: true },
    })
    const stats = new Map<
      string,
      { recent_total: number; recent_qual: number; base_total: number; base_qual: number }
    >()
    for (const i of all) {
      const source = (i.preferences as any)?.source || 'self_identified'
      const slot =
        stats.get(source) || { recent_total: 0, recent_qual: 0, base_total: 0, base_qual: 0 }
      const isRecent = i.created_at >= recentStart
      if (isRecent) {
        slot.recent_total++
        if (i.status === 'qualified') slot.recent_qual++
      } else {
        slot.base_total++
        if (i.status === 'qualified') slot.base_qual++
      }
      stats.set(source, slot)
    }
    const out: GeneratorOutput[] = []
    for (const [source, s] of stats.entries()) {
      if (s.recent_total < 5 || s.base_total < 10) continue
      const recentRate = s.recent_qual / s.recent_total
      const baseRate = s.base_qual / s.base_total
      if (baseRate > 0 && recentRate < baseRate * 0.7) {
        out.push({
          target_type: 'segment',
          target_id: synthSourceId(source),
          suggested_action: `Investigate ${source} pipeline - conversion dropped`,
          reason: `7d rate ${(recentRate * 100).toFixed(0)}% vs 30d baseline ${(baseRate * 100).toFixed(0)}%`,
        })
      }
    }
    return out
  },
}

// Contacted intakes idling > 7 days without progressing.
const staleInContacted: Generator = {
  name: 'stale_in_contacted',
  version: 1,
  base_confidence: 65,
  async run({ org_id, now }) {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const stale = await db.intake.findMany({
      where: {
        org_id,
        status: 'contacted',
        OR: [
          { last_activity_at: { lt: cutoff } },
          { last_activity_at: null, first_contact_at: { lt: cutoff } },
        ],
      },
      select: { id: true },
      take: 100,
    })
    return stale.map((i) => ({
      target_type: 'intake',
      target_id: i.id,
      suggested_action: 'Follow up or move to qualified/lost',
      reason: 'No activity for 7+ days after first contact',
    }))
  },
}

// Suggest the highest-confidence outreach template for active mid-funnel
// intakes that don't already have an open next-touch recommendation.
// This generator pulls from the templates engine (loaded lazily below
// to avoid a static cycle through this module's exports).
const nextBestTouch: Generator = {
  name: 'next_best_touch',
  version: 1,
  base_confidence: 60,
  async run({ org_id }) {
    const { rankTemplatesForIntake } = await import('./template-engine')
    const candidates = await db.intake.findMany({
      where: {
        org_id,
        status: { in: ['new', 'contacted'] },
      },
      select: { id: true, intent: true, status: true, preferences: true },
      take: 200,
    })
    const out: GeneratorOutput[] = []
    for (const intake of candidates) {
      const ranked = await rankTemplatesForIntake({
        org_id,
        intent: intake.intent as any,
        status: intake.status,
      })
      const top = ranked[0]
      if (!top || top.calibrated_confidence < 50) continue
      out.push({
        target_type: 'intake',
        target_id: intake.id,
        suggested_action: `Use template "${top.name}" (${top.calibrated_confidence}% historical success)`,
        reason: `Top-ranked outreach for ${intake.intent}/${intake.status} based on prior outcomes`,
      })
    }
    return out
  },
}

function synthSourceId(source: string): string {
  // Build a deterministic UUID-shaped id for source-segment recommendations
  // so dedupe queries match across runs.
  const hex = require('crypto')
    .createHash('sha1')
    .update(`source:${source}`)
    .digest('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '5' + hex.slice(13, 16),
    '8' + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-')
}

const ALL_GENERATORS: Generator[] = [
  unassignedIntakeReassign,
  slaBreachContact,
  dormantParticipantReactivate,
  highValueTierStalled,
  repeatApplicantEscalate,
  conversionDropBySource,
  staleInContacted,
  nextBestTouch,
]

// ----- Confidence calibration -----

async function calibratedConfidence(
  generator: string,
  version: number,
  base: number
): Promise<number> {
  const resolved = await db.recommendation.findMany({
    where: {
      generator,
      generator_version: version,
      outcome: { in: ['successful', 'unsuccessful'] },
    },
    select: { outcome: true },
  })

  if (resolved.length < 5) return base // not enough signal yet

  const successful = resolved.filter((r) => r.outcome === 'successful').length
  const hitRate = successful / resolved.length

  // Smooth between base and observed hit rate; weight observed more as
  // sample size grows. At n=5 observed gets weight 0.5, at n=50 weight ~0.91.
  const weight = resolved.length / (resolved.length + 5)
  const calibrated = base * (1 - weight) + hitRate * 100 * weight
  return Math.max(1, Math.min(99, Math.round(calibrated)))
}

// ----- Orchestration -----

export async function generateRecommendations(orgId: string): Promise<GeneratorRun> {
  const ctx: GeneratorContext = { org_id: orgId, now: new Date() }
  const summary: GeneratorRun = {
    generated: 0,
    skipped_existing: 0,
    generator_runs: [],
  }

  for (const generator of ALL_GENERATORS) {
    const outputs = await generator.run(ctx)
    const confidence = await calibratedConfidence(
      generator.name,
      generator.version,
      generator.base_confidence
    )
    let generated = 0

    for (const o of outputs) {
      // Idempotency: skip if there's already an active recommendation from
      // this same generator targeting the same entity.
      const existing = await db.recommendation.findFirst({
        where: {
          org_id: orgId,
          generator: generator.name,
          generator_version: generator.version,
          target_type: o.target_type,
          target_id: o.target_id,
          status: 'active',
        },
        select: { id: true },
      })
      if (existing) {
        summary.skipped_existing++
        continue
      }

      await db.recommendation.create({
        data: {
          org_id: orgId,
          target_type: o.target_type,
          target_id: o.target_id,
          suggested_action: o.suggested_action,
          reason: o.reason,
          confidence,
          status: 'active',
          generator: generator.name,
          generator_version: generator.version,
        },
      })
      generated++
    }

    summary.generated += generated
    summary.generator_runs.push({
      generator: generator.name,
      version: generator.version,
      generated,
    })
  }

  return summary
}
