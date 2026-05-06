/**
 * Closes the recommendation feedback loop.
 *
 * When an entity (intake, participant) reaches a terminal state, this
 * marks all recommendations targeting it with a final outcome. That data
 * feeds confidence calibration in recommendation-generator.ts.
 *
 * Outcome semantics:
 *   - 'successful'   -> recommendation was applied AND target reached a
 *                       positive terminal state (e.g. intake qualified)
 *   - 'unsuccessful' -> recommendation was applied AND target reached a
 *                       negative terminal state (e.g. intake lost)
 *   - 'unrelated'    -> recommendation was dismissed or never acted on,
 *                       or applied but outcome is unknowable
 */

import { db } from './db'

export type IntakeTerminal = 'qualified' | 'closed' | 'lost'

const POSITIVE_TERMINAL: ReadonlyArray<IntakeTerminal> = ['qualified']
const NEGATIVE_TERMINAL: ReadonlyArray<IntakeTerminal> = ['closed', 'lost']

export async function recordIntakeOutcome(
  orgId: string,
  intakeId: string,
  terminalStatus: IntakeTerminal
): Promise<{ updated: number }> {
  const recs = await db.recommendation.findMany({
    where: {
      org_id: orgId,
      target_type: 'intake',
      target_id: intakeId,
      outcome: null,
    },
    select: { id: true, status: true },
  })

  if (recs.length === 0) return { updated: 0 }

  const positive = POSITIVE_TERMINAL.includes(terminalStatus)
  const negative = NEGATIVE_TERMINAL.includes(terminalStatus)
  const now = new Date()
  let updated = 0

  for (const r of recs) {
    let outcome: 'successful' | 'unsuccessful' | 'unrelated'
    if (r.status === 'applied' && positive) outcome = 'successful'
    else if (r.status === 'applied' && negative) outcome = 'unsuccessful'
    else outcome = 'unrelated'

    await db.recommendation.update({
      where: { id: r.id },
      data: { outcome, outcome_recorded_at: now },
    })
    updated++
  }

  return { updated }
}

export function isIntakeTerminal(status: string): status is IntakeTerminal {
  return status === 'qualified' || status === 'closed' || status === 'lost'
}
