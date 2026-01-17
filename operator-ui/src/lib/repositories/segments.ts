/**
 * Segments repository (computed clusters)
 */

import { db } from '../db'
import { Segment } from '../types'

export const segmentsRepo = {
  async findByOrg(orgId: string): Promise<Segment[]> {
    // Compute segments from participant data
    const participants = await db.participant.findMany({
      where: { org_id: orgId },
    })

    const segments: Segment[] = []

    // Onboarding cohort
    const onboardingIds = participants
      .filter((p) => p.lifecycle_stage === 'onboarding')
      .map((p) => p.id)
    if (onboardingIds.length > 0) {
      segments.push({
        id: `onboarding-cohort`,
        org_id: orgId,
        name: 'Onboarding Cohort',
        type: 'onboarding_cohort',
        participant_ids: onboardingIds,
        health: onboardingIds.length > 5 ? 'healthy' : 'degraded',
        at_risk_count: participants.filter((p) => onboardingIds.includes(p.id) && computeStatus(p) === 'at_risk').length,
        trend: 'flat',
        created_at: new Date().toISOString(),
      })
    }

    // At-risk cluster
    const atRiskIds = participants
      .filter((p) => computeStatus(p) === 'at_risk')
      .map((p) => p.id)
    if (atRiskIds.length > 0) {
      segments.push({
        id: `at-risk-cluster`,
        org_id: orgId,
        name: 'At-Risk Cluster',
        type: 'at_risk_cluster',
        participant_ids: atRiskIds,
        health: atRiskIds.length > 10 ? 'critical' : 'degraded',
        at_risk_count: atRiskIds.length,
        trend: 'down',
        created_at: new Date().toISOString(),
      })
    }

    // Recent activations
    const recentIds = participants
      .filter((p) => {
        const daysSinceCreation = (Date.now() - p.created_at.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceCreation <= 30
      })
      .map((p) => p.id)
    if (recentIds.length > 0) {
      segments.push({
        id: `recent-activations`,
        org_id: orgId,
        name: 'Recent Activations',
        type: 'recent_activations',
        participant_ids: recentIds,
        health: 'healthy',
        at_risk_count: 0,
        trend: 'up',
        created_at: new Date().toISOString(),
      })
    }

    // Dormant group
    const dormantIds = participants
      .filter((p) => p.lifecycle_stage === 'dormant')
      .map((p) => p.id)
    if (dormantIds.length > 0) {
      segments.push({
        id: `dormant-group`,
        org_id: orgId,
        name: 'Dormant Group',
        type: 'dormant_group',
        participant_ids: dormantIds,
        health: 'degraded',
        at_risk_count: dormantIds.length,
        trend: 'flat',
        created_at: new Date().toISOString(),
      })
    }

    return segments
  },
}

// Temporary status computation - TODO: Use engagement state engine
function computeStatus(p: {
  lifecycle_stage: string
  last_activity_at: Date | null
}): 'active' | 'at_risk' | 'stalled' | 'inactive' {
  if (p.lifecycle_stage === 'exited' || p.lifecycle_stage === 'dormant') {
    return 'inactive'
  }

  if (!p.last_activity_at) {
    return 'stalled'
  }

  const daysSinceActivity =
    (Date.now() - p.last_activity_at.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceActivity <= 14) return 'active'
  if (daysSinceActivity <= 30) return 'at_risk'
  return 'stalled'
}






