/**
 * Recommendations repository
 */

import { db } from '../db'
import { Recommendation } from '../types'

export const recommendationsRepo = {
  async findByTarget(
    orgId: string,
    targetType: 'node' | 'segment',
    targetId: string
  ): Promise<Recommendation[]> {
    const rows = await db.recommendation.findMany({
      where: {
        org_id: orgId,
        target_type: targetType,
        target_id: targetId,
        status: 'active',
      },
      orderBy: { created_at: 'desc' },
    })

    return rows.map((row) => ({
      id: row.id,
      org_id: row.org_id,
      target_type: row.target_type as 'node' | 'segment',
      target_id: row.target_id,
      suggested_action: row.suggested_action,
      reason: row.reason,
      confidence: row.confidence / 100, // Convert 0-100 to 0-1
      created_at: row.created_at.toISOString(),
    }))
  },
}


