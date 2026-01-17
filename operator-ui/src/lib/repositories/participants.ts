/**
 * Participants repository
 */

import { db } from '../db'
import { Participant, ParticipantStatus } from '../types'

export const participantsRepo = {
  async findByOrg(orgId: string): Promise<Participant[]> {
    const rows = await db.participant.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    })

    return rows.map((row) => ({
      id: row.id,
      org_id: row.org_id,
      role: row.role as any,
      status: computeStatus(row), // TODO: Use engagement state engine
      lifecycle_stage: row.lifecycle_stage as any,
      last_activity_at: row.last_activity_at?.toISOString() || null,
      created_at: row.created_at.toISOString(),
      display_name: row.display_name || undefined,
      email: row.email || undefined,
    }))
  },

  async findById(orgId: string, participantId: string): Promise<Participant | null> {
    const row = await db.participant.findFirst({
      where: {
        id: participantId,
        org_id: orgId,
      },
    })

    if (!row) return null

    return {
      id: row.id,
      org_id: row.org_id,
      role: row.role as any,
      status: computeStatus(row),
      lifecycle_stage: row.lifecycle_stage as any,
      last_activity_at: row.last_activity_at?.toISOString() || null,
      created_at: row.created_at.toISOString(),
      display_name: row.display_name || undefined,
      email: row.email || undefined,
    }
  },
}

// Temporary status computation - TODO: Use engagement state engine
function computeStatus(row: {
  lifecycle_stage: string
  last_activity_at: Date | null
  role: string
}): ParticipantStatus {
  if (row.lifecycle_stage === 'exited' || row.lifecycle_stage === 'dormant') {
    return 'inactive'
  }

  if (!row.last_activity_at) {
    return 'stalled'
  }

  const daysSinceActivity =
    (Date.now() - row.last_activity_at.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceActivity <= 14) return 'active'
  if (daysSinceActivity <= 30) return 'at_risk'
  return 'stalled'
}






