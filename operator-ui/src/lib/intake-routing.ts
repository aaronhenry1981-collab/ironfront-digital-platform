/**
 * Intake Routing Logic
 * Server-side only - never client-controlled
 */

import { db } from './db'

export type IntakeIntent = 'scale' | 'launch' | 'ecosystems'
export type IntakeStatus = 'new' | 'contacted' | 'qualified' | 'closed' | 'lost'

export interface RoutingResult {
  assigned_user_id: string | null
  reason: string
}

/**
 * Route intake to appropriate operator pool
 * Rules:
 * - intent=launch → LaunchPath operator pool
 * - intent=scale → Org Ops operator pool
 * - intent=ecosystems → EEP concierge pool
 * - If no operator available → unassigned queue
 */
export async function routeIntake(
  orgId: string,
  intent: IntakeIntent
): Promise<RoutingResult> {
  // Get operator pool for all intents (same pool for now, can be specialized later)
  const memberships = await db.orgMembership.findMany({
    where: {
      org_id: orgId,
      role: {
        in: ['operator', 'owner'],
      },
    },
    orderBy: {
      created_at: 'asc',
    },
  })

  if (memberships.length === 0) {
    return {
      assigned_user_id: null,
      reason: 'no_operators_available',
    }
  }

  // Load balance: assign to operator with fewest unassigned intakes
  const loadBalanced = await Promise.all(
    memberships.map(async (m) => {
      const count = await db.intake.count({
        where: {
          org_id: orgId,
          assigned_user_id: m.user_id,
          status: 'new',
        },
      })
      return { user_id: m.user_id, role: m.role, load: count }
    })
  )

  // Sort by load (ascending)
  loadBalanced.sort((a, b) => {
    if (a.load !== b.load) return a.load - b.load
    return 0
  })

  const selected = loadBalanced[0]

  return {
    assigned_user_id: selected.user_id,
    reason: `load_balanced_${intent}_pool`,
  }
}

/**
 * Get operator pool for intent (for display purposes)
 */
export async function getOperatorPoolForIntent(
  orgId: string,
  intent: IntakeIntent
): Promise<Array<{ id: string; email: string; role: string }>> {
  const memberships = await db.orgMembership.findMany({
    where: {
      org_id: orgId,
      role: {
        in: ['operator', 'owner'],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  })

  return memberships.map((m) => ({
    id: m.user.id,
    email: m.user.email,
    role: m.role,
  }))
}
