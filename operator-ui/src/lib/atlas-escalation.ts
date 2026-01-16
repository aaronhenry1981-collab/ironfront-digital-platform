/**
 * Atlas Escalation Hooks
 * Background checks that suggest escalation
 * NO EXECUTION - Atlas only suggests, never automates
 */

import { db } from './db'

export interface EscalationAlert {
  type: 'unassigned_timeout' | 'sla_breach' | 'conversion_drop'
  severity: 'low' | 'medium' | 'high'
  message: string
  metadata: Record<string, any>
}

/**
 * Check for unassigned intakes > X hours
 * Returns alerts if found
 */
export async function checkUnassignedTimeout(
  orgId: string,
  hoursThreshold: number = 24
): Promise<EscalationAlert[]> {
  const threshold = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000)
  
  const unassigned = await db.intake.findMany({
    where: {
      org_id: orgId,
      assigned_user_id: null,
      status: 'new',
      created_at: { lt: threshold },
    },
  })

  if (unassigned.length === 0) return []

  return [
    {
      type: 'unassigned_timeout',
      severity: unassigned.length > 10 ? 'high' : unassigned.length > 5 ? 'medium' : 'low',
      message: `${unassigned.length} intake(s) unassigned for more than ${hoursThreshold} hours`,
      metadata: {
        count: unassigned.length,
        threshold_hours: hoursThreshold,
        intake_ids: unassigned.map((i) => i.id),
      },
    },
  ]
}

/**
 * Check for first contact SLA breaches
 * Returns alerts if found
 */
export async function checkSLABreaches(
  orgId: string,
  slaHours: number = 24
): Promise<EscalationAlert[]> {
  const threshold = new Date(Date.now() - slaHours * 60 * 60 * 1000)
  
  const breaches = await db.intake.findMany({
    where: {
      org_id: orgId,
      status: 'new',
      first_contact_at: null,
      created_at: { lt: threshold },
    },
  })

  if (breaches.length === 0) return []

  return [
    {
      type: 'sla_breach',
      severity: breaches.length > 10 ? 'high' : breaches.length > 5 ? 'medium' : 'low',
      message: `${breaches.length} intake(s) exceeded ${slaHours}h first contact SLA`,
      metadata: {
        count: breaches.length,
        sla_hours: slaHours,
        intake_ids: breaches.map((i) => i.id),
      },
    },
  ]
}

/**
 * Check for conversion rate drops
 * Compares recent period to baseline
 * Returns alerts if significant drop detected
 */
export async function checkConversionDrop(
  orgId: string,
  baselineDays: number = 30,
  recentDays: number = 7
): Promise<EscalationAlert[]> {
  const baselineStart = new Date(Date.now() - baselineDays * 24 * 60 * 60 * 1000)
  const recentStart = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)

  // Baseline conversion rate
  const baselineTotal = await db.intake.count({
    where: {
      org_id: orgId,
      created_at: { gte: baselineStart, lt: recentStart },
    },
  })

  const baselineQualified = await db.intake.count({
    where: {
      org_id: orgId,
      status: 'qualified',
      created_at: { gte: baselineStart, lt: recentStart },
    },
  })

  const baselineRate = baselineTotal > 0 ? baselineQualified / baselineTotal : 0

  // Recent conversion rate
  const recentTotal = await db.intake.count({
    where: {
      org_id: orgId,
      created_at: { gte: recentStart },
    },
  })

  const recentQualified = await db.intake.count({
    where: {
      org_id: orgId,
      status: 'qualified',
      created_at: { gte: recentStart },
    },
  })

  const recentRate = recentTotal > 0 ? recentQualified / recentTotal : 0

  // Check for significant drop (>20% relative)
  if (baselineRate > 0 && recentRate < baselineRate * 0.8 && recentTotal >= 5) {
    return [
      {
        type: 'conversion_drop',
        severity: recentRate < baselineRate * 0.6 ? 'high' : 'medium',
        message: `Conversion rate dropped from ${(baselineRate * 100).toFixed(1)}% to ${(recentRate * 100).toFixed(1)}%`,
        metadata: {
          baseline_rate: baselineRate,
          recent_rate: recentRate,
          baseline_period_days: baselineDays,
          recent_period_days: recentDays,
        },
      },
    ]
  }

  return []
}

/**
 * Run all escalation checks
 * Returns all alerts (no execution)
 */
export async function runEscalationChecks(orgId: string): Promise<EscalationAlert[]> {
  const [unassigned, sla, conversion] = await Promise.all([
    checkUnassignedTimeout(orgId, 24),
    checkSLABreaches(orgId, 24),
    checkConversionDrop(orgId, 30, 7),
  ])

  return [...unassigned, ...sla, ...conversion]
}


