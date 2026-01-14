/**
 * Intakes repository
 */

import { db } from '../db'
import { IntakeIntent, IntakeStatus } from '../intake-routing'

export interface Intake {
  id: string
  org_id: string | null
  name: string | null
  email: string
  intent: IntakeIntent
  preferences: Record<string, any> | null
  status: IntakeStatus
  assigned_user_id: string | null
  created_at: string
  first_contact_at: string | null
  last_activity_at: string | null
  notes: string | null
  assigned_user?: {
    id: string
    email: string
  } | null
}

export const intakesRepo = {
  async findByOrg(
    orgId: string,
    userId: string | null,
    role: string
  ): Promise<Intake[]> {
    // Operators see assigned + unassigned relevant to their role
    // Owner sees aggregate only (filtered by role check in API)
    const where: any = {
      org_id: orgId,
    }

    // Operators see their assigned intakes + unassigned
    if (role === 'operator' && userId) {
      where.OR = [
        { assigned_user_id: userId },
        { assigned_user_id: null },
      ]
    }

    const rows = await db.intake.findMany({
      where,
      include: {
        assigned_user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return rows.map((row) => ({
      id: row.id,
      org_id: row.org_id || '',
      name: row.name,
      email: row.email,
      intent: row.intent as IntakeIntent,
      preferences: row.preferences as Record<string, any> | null,
      status: row.status as IntakeStatus,
      assigned_user_id: row.assigned_user_id,
      created_at: row.created_at.toISOString(),
      first_contact_at: row.first_contact_at?.toISOString() || null,
      last_activity_at: row.last_activity_at?.toISOString() || null,
      notes: row.notes,
      assigned_user: row.assigned_user,
    }))
  },

  async findById(orgId: string, intakeId: string): Promise<Intake | null> {
    const row = await db.intake.findFirst({
      where: {
        id: intakeId,
        org_id: orgId,
      },
      include: {
        assigned_user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    if (!row) return null

    return {
      id: row.id,
      org_id: row.org_id || '',
      name: row.name,
      email: row.email,
      intent: row.intent as IntakeIntent,
      preferences: row.preferences as Record<string, any> | null,
      status: row.status as IntakeStatus,
      assigned_user_id: row.assigned_user_id,
      created_at: row.created_at.toISOString(),
      first_contact_at: row.first_contact_at?.toISOString() || null,
      last_activity_at: row.last_activity_at?.toISOString() || null,
      notes: row.notes,
      assigned_user: row.assigned_user,
    }
  },

  async updateStatus(
    orgId: string,
    intakeId: string,
    status: IntakeStatus,
    userId: string
  ): Promise<IntakeStatus> {
    // Get current status for audit
    const current = await db.intake.findFirst({
      where: { id: intakeId, org_id: orgId },
    })
    const previousStatus = current?.status as IntakeStatus

    const updateData: any = {
      status,
      last_activity_at: new Date(),
    }

    // Set first_contact_at if transitioning to contacted
    if (status === 'contacted' && current && !current.first_contact_at) {
      updateData.first_contact_at = new Date()
    }

    await db.intake.update({
      where: {
        id: intakeId,
      },
      data: updateData,
    })

    return previousStatus
  },

  async assign(
    orgId: string,
    intakeId: string,
    userId: string | null,
    assignedBy: string
  ): Promise<void> {
    await db.intake.update({
      where: {
        id: intakeId,
        org_id: orgId,
      },
      data: {
        assigned_user_id: userId,
        last_activity_at: new Date(),
      },
    })
  },

  async updateNotes(
    orgId: string,
    intakeId: string,
    notes: string
  ): Promise<void> {
    await db.intake.update({
      where: {
        id: intakeId,
        org_id: orgId,
      },
      data: {
        notes,
        last_activity_at: new Date(),
      },
    })
  },
}

