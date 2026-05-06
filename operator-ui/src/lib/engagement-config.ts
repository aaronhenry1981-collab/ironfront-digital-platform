/**
 * Versioned engagement-state thresholds, sourced from DB.
 *
 * The active row in `engagement_configs` is the source of truth for the
 * engagement-state engine. Multiple versions can coexist; exactly one is
 * `active=true` at any time. Cache for 60s in-process so we don't hit the
 * DB on every status computation.
 */

import { db } from './db'

export interface EngagementThresholds {
  version: number
  active_days_threshold: number
  at_risk_days_threshold: number
  active_min_event_frequency_30d: number
}

const FALLBACK: EngagementThresholds = {
  version: 0,
  active_days_threshold: 14,
  at_risk_days_threshold: 30,
  active_min_event_frequency_30d: 3,
}

let cache: { value: EngagementThresholds; expires_at: number } | null = null
const TTL_MS = 60 * 1000

export async function getActiveEngagementConfig(): Promise<EngagementThresholds> {
  if (cache && cache.expires_at > Date.now()) {
    return cache.value
  }

  try {
    const row = await db.engagementConfig.findFirst({
      where: { active: true },
      orderBy: { version: 'desc' },
    })
    const value: EngagementThresholds = row
      ? {
          version: row.version,
          active_days_threshold: row.active_days_threshold,
          at_risk_days_threshold: row.at_risk_days_threshold,
          active_min_event_frequency_30d: row.active_min_event_frequency_30d,
        }
      : FALLBACK
    cache = { value, expires_at: Date.now() + TTL_MS }
    return value
  } catch (error) {
    console.error('Failed to load engagement config, using fallback:', error)
    return FALLBACK
  }
}

export function clearEngagementConfigCache(): void {
  cache = null
}
