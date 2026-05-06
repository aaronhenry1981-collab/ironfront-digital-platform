/**
 * Engagement State Engine
 * Computed logic - never manually set
 * This is the source of truth for participant engagement
 */

import { Participant, ParticipantStatus, LifecycleStage } from './types'
import {
  getActiveEngagementConfig,
  EngagementThresholds,
} from './engagement-config'

interface EngagementInputs {
  last_activity_at: string | null
  lifecycle_stage: LifecycleStage
  event_frequency_last_30d: number
  onboarding_completed: boolean
}

/**
 * Compute engagement state from inputs using a specific threshold set.
 * Pure function - takes thresholds explicitly so it stays unit-testable
 * without DB access.
 */
export function computeEngagementStateWith(
  inputs: EngagementInputs,
  thresholds: EngagementThresholds
): ParticipantStatus {
  const { last_activity_at, lifecycle_stage, event_frequency_last_30d, onboarding_completed } = inputs

  if (lifecycle_stage === 'exited') return 'inactive'
  if (lifecycle_stage === 'dormant') return 'inactive'

  if (!last_activity_at) {
    if (lifecycle_stage === 'invited' || lifecycle_stage === 'activating') {
      return 'stalled'
    }
    return 'at_risk'
  }

  const lastActivity = new Date(last_activity_at)
  const now = new Date()
  const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)

  if (
    daysSinceActivity <= thresholds.active_days_threshold &&
    event_frequency_last_30d >= thresholds.active_min_event_frequency_30d
  ) {
    return 'active'
  }

  if (
    daysSinceActivity <= thresholds.at_risk_days_threshold &&
    event_frequency_last_30d < thresholds.active_min_event_frequency_30d
  ) {
    return 'at_risk'
  }

  if (daysSinceActivity > thresholds.at_risk_days_threshold) {
    return 'stalled'
  }

  if (lifecycle_stage === 'producing' && onboarding_completed) {
    return 'active'
  }

  if (lifecycle_stage === 'onboarding' && daysSinceActivity <= 7) {
    return 'active'
  }

  return 'at_risk'
}

/**
 * Async wrapper that loads the active threshold version from DB.
 */
export async function computeEngagementState(
  inputs: EngagementInputs
): Promise<ParticipantStatus> {
  const thresholds = await getActiveEngagementConfig()
  return computeEngagementStateWith(inputs, thresholds)
}

export function computeParticipantStatus(participant: Participant): ParticipantStatus {
  return participant.status
}
