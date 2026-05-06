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

const ALL_GENERATORS: Generator[] = [
  unassignedIntakeReassign,
  slaBreachContact,
  dormantParticipantReactivate,
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
