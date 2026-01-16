/**
 * Engagement State Engine
 * Computed logic - never manually set
 * This is the source of truth for participant engagement
 */

import { Participant, ParticipantStatus, LifecycleStage } from './types'

interface EngagementInputs {
  last_activity_at: string | null
  lifecycle_stage: LifecycleStage
  event_frequency_last_30d: number
  onboarding_completed: boolean
}

/**
 * Compute engagement state from inputs
 * Versioned, centralized, auditable
 */
export function computeEngagementState(inputs: EngagementInputs): ParticipantStatus {
  const { last_activity_at, lifecycle_stage, event_frequency_last_30d, onboarding_completed } = inputs

  // Inactive: exited or long-term dormancy
  if (lifecycle_stage === 'exited') {
    return 'inactive'
  }

  if (lifecycle_stage === 'dormant') {
    return 'inactive'
  }

  // No activity data
  if (!last_activity_at) {
    if (lifecycle_stage === 'invited' || lifecycle_stage === 'activating') {
      return 'stalled'
    }
    return 'at_risk'
  }

  const lastActivity = new Date(last_activity_at)
  const now = new Date()
  const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)

  // Active: activity in last 7-14 days
  if (daysSinceActivity <= 14 && event_frequency_last_30d >= 3) {
    return 'active'
  }

  // At Risk: declining activity trend
  if (daysSinceActivity <= 30 && event_frequency_last_30d < 3) {
    return 'at_risk'
  }

  // Stalled: no activity past threshold
  if (daysSinceActivity > 30 && lifecycle_stage !== 'exited') {
    return 'stalled'
  }

  // Default based on lifecycle stage
  if (lifecycle_stage === 'producing' && onboarding_completed) {
    return 'active'
  }

  if (lifecycle_stage === 'onboarding' && daysSinceActivity <= 7) {
    return 'active'
  }

  return 'at_risk'
}

/**
 * Apply engagement state computation to a participant
 * TODO: This will be called server-side with full event data
 */
export function computeParticipantStatus(participant: Participant): ParticipantStatus {
  // For now, if status is already computed, use it
  // In production, this will recompute from raw event data
  return participant.status
}


