/**
 * Interventions repository
 */

import { db } from '../db'

export const interventionsRepo = {
  async findRecentByParticipant(
    orgId: string,
    participantId: string,
    limit: number = 3
  ): Promise<Array<{
    id: string
    action: string
    timestamp: string
    status: 'completed' | 'pending' | 'failed'
  }>> {
    const rows = await db.intervention.findMany({
      where: {
        org_id: orgId,
        target_ids: {
          path: ['$'],
          array_contains: participantId,
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    })

    return rows.map((row) => ({
      id: row.id,
      action: row.type,
      timestamp: row.created_at.toISOString(),
      status: row.reversed_at ? 'completed' : 'pending',
    }))
  },
}






