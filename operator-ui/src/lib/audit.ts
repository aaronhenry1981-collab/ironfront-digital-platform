/**
 * Audit logging utilities
 * Every graph operation, recommendation view, and intervention must be audited
 * Now persists to database via eventsRepo
 */

import { eventsRepo } from './repositories/events'

export interface AuditEvent {
  id: string
  type: string
  actor: string
  org_id: string
  description: string
  metadata?: Record<string, any>
  created_at: string
}

/**
 * Write audit event to database
 */
export async function writeAuditEvent(input: {
  org_id: string
  actor_user_id: string | null
  actor_role: string
  event_type: string
  target_type?: string
  target_id?: string | null
  metadata?: Record<string, any>
}): Promise<void> {
  await eventsRepo.create({
    org_id: input.org_id,
    actor_user_id: input.actor_user_id,
    actor_role: input.actor_role,
    event_type: input.event_type,
    target_type: input.target_type || 'system',
    target_id: input.target_id || null,
    metadata: input.metadata || {},
  })
}

/**
 * Common audit event types
 */
export const AuditEventTypes = {
  GRAPH_QUERIED: 'graph_queried',
  RECOMMENDATION_VIEWED: 'recommendation_viewed',
  INTERVENTION_APPLIED: 'intervention_applied',
  INTERVENTION_REVERSED: 'intervention_reversed',
  SEGMENT_VIEWED: 'segment_viewed',
  PARTICIPANT_DETAIL_VIEWED: 'participant_detail_viewed',
} as const
