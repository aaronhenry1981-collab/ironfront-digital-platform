/**
 * Relationships repository
 */

import { db } from '../db'
import { Relationship } from '../types'

export const relationshipsRepo = {
  async findByOrg(orgId: string): Promise<Relationship[]> {
    const rows = await db.relationship.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    })

    return rows.map((row) => ({
      id: row.id,
      org_id: row.org_id,
      from_participant_id: row.from_participant_id,
      to_participant_id: row.to_participant_id,
      type: row.type as any,
      created_at: row.created_at.toISOString(),
    }))
  },
}


