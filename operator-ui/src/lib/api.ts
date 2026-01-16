/**
 * API client for Operator UI
 * All endpoints are read-only for Phase A3
 */

import {
  GraphResponse,
  Segment,
  ParticipantDetail,
  Recommendation,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api'

/**
 * Get organization graph (nodes + edges)
 * Permission-checked, rate-limited, cached
 */
export async function fetchOrgGraph(orgId: string): Promise<GraphResponse> {
  const response = await fetch(`${API_BASE}/orgs/${orgId}/graph`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    // Cache for 30-60s
    next: { revalidate: 30 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch graph: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get organization segments
 */
export async function fetchOrgSegments(orgId: string): Promise<Segment[]> {
  const response = await fetch(`${API_BASE}/orgs/${orgId}/segments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch segments: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get participant detail with recommendations
 */
export async function fetchParticipantDetail(
  orgId: string,
  participantId: string
): Promise<ParticipantDetail> {
  const response = await fetch(
    `${API_BASE}/orgs/${orgId}/participants/${participantId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch participant: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get Atlas recommendations for a participant
 */
export async function fetchRecommendations(
  orgId: string,
  targetType: 'node' | 'segment',
  targetId: string
): Promise<Recommendation[]> {
  const response = await fetch(
    `${API_BASE}/orgs/${orgId}/recommendations?target_type=${targetType}&target_id=${targetId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch recommendations: ${response.statusText}`)
  }

  return response.json()
}


