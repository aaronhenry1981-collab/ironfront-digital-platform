/**
 * Attributes intake terminal-state outcomes back to the touches that
 * preceded them. That column is what the template engine reads to
 * compute calibrated confidence, so this is the closing piece of the
 * conversation-evolution loop:
 *
 *   operator picks template -> sends touch -> intake reaches qualified/lost
 *     -> this function tags the touch with successful/unsuccessful
 *     -> next time the template engine ranks templates, hit-rate reflects reality.
 */

import { db } from './db'

export type IntakeTerminal = 'qualified' | 'closed' | 'lost'

const POSITIVE: ReadonlyArray<IntakeTerminal> = ['qualified']
const NEGATIVE: ReadonlyArray<IntakeTerminal> = ['closed', 'lost']

export async function recordTouchOutcomes(
  orgId: string,
  intakeId: string,
  terminalStatus: IntakeTerminal
): Promise<{ updated: number }> {
  const touches = await db.touch.findMany({
    where: { org_id: orgId, intake_id: intakeId, outcome: null },
    select: { id: true, direction: true },
  })
  if (touches.length === 0) return { updated: 0 }

  const positive = POSITIVE.includes(terminalStatus)
  const negative = NEGATIVE.includes(terminalStatus)
  const now = new Date()
  let updated = 0

  for (const t of touches) {
    let outcome: 'successful' | 'unsuccessful' | 'unrelated'
    // Inbound touches are signals from the lead, not operator actions -
    // they shouldn't count for/against template confidence.
    if (t.direction === 'inbound') outcome = 'unrelated'
    else if (positive) outcome = 'successful'
    else if (negative) outcome = 'unsuccessful'
    else outcome = 'unrelated'

    await db.touch.update({
      where: { id: t.id },
      data: { outcome, outcome_recorded_at: now },
    })
    updated++
  }

  return { updated }
}
