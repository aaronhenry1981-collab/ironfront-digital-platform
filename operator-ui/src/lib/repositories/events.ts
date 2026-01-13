/**
 * Events repository (audit logging)
 */

import { db } from '../db'

export interface CreateEventInput {
  org_id: string
  actor_user_id: string | null
  actor_role: string
  event_type: string
  target_type: string
  target_id: string | null
  metadata?: Record<string, any>
}

export const eventsRepo = {
  async create(input: CreateEventInput): Promise<void> {
    await db.event.create({
      data: {
        org_id: input.org_id,
        actor_user_id: input.actor_user_id || null,
        actor_role: input.actor_role,
        event_type: input.event_type,
        target_type: input.target_type,
        target_id: input.target_id || null,
        metadata: input.metadata || {},
      },
    })
  },

  async findByOrg(orgId: string, limit: number = 200): Promise<any[]> {
    const rows = await db.event.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        actor_user: {
          select: {
            email: true,
          },
        },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      type: row.event_type,
      actor: row.actor_user?.email || row.actor_role,
      timestamp: row.created_at.toISOString(),
      description: row.target_type ? `${row.event_type}: ${row.target_type} ${row.target_id}` : row.event_type,
    }))
  },
}

