/**
 * Canonical data models for Phase A3
 * No hierarchy, earnings, or recruiting optics
 */

export type ParticipantRole = 'participant' | 'operator' | 'observer'
export type ParticipantStatus = 'active' | 'at_risk' | 'stalled' | 'inactive'
export type LifecycleStage = 'invited' | 'activating' | 'onboarding' | 'producing' | 'dormant' | 'exited'
export type RelationshipType = 'introduced' | 'mentored' | 'activated'

export interface Participant {
  id: string
  org_id: string
  role: ParticipantRole
  status: ParticipantStatus
  lifecycle_stage: LifecycleStage
  last_activity_at: string // ISO timestamp
  created_at: string // ISO timestamp
  // Optional display fields (not hierarchy)
  display_name?: string
  email?: string
}

export interface Relationship {
  id: string
  org_id: string
  from_participant_id: string
  to_participant_id: string
  type: RelationshipType
  created_at: string // ISO timestamp
}

export interface GraphResponse {
  nodes: Participant[]
  edges: Relationship[]
  computed_at: string // ISO timestamp
}

export interface Segment {
  id: string
  org_id: string
  name: string
  type: 'onboarding_cohort' | 'at_risk_cluster' | 'recent_activations' | 'dormant_group' | 'custom'
  participant_ids: string[]
  health: 'healthy' | 'degraded' | 'critical'
  at_risk_count: number
  trend: 'up' | 'down' | 'flat'
  created_at: string
}

export interface Recommendation {
  id: string
  org_id: string
  target_type: 'node' | 'segment'
  target_id: string
  suggested_action: string
  reason: string
  confidence: number // 0-1
  created_at: string
}

export interface ParticipantDetail {
  participant: Participant
  recommendations: Recommendation[]
  recent_interventions: Array<{
    id: string
    action: string
    timestamp: string
    status: 'completed' | 'pending' | 'failed'
  }>
}

