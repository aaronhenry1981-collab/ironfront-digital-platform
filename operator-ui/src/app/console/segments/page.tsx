'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ConsoleLayout from '@/components/layout/ConsoleLayout'
import { Segment } from '@/lib/types'
import { fetchOrgSegments } from '@/lib/api'

// TODO: Get orgId from auth/session
const MOCK_ORG_ID = 'default-org'

const healthColors = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  critical: 'bg-red-500',
}

const trendIcons = {
  up: '↑',
  down: '↓',
  flat: '→',
}

export default function SegmentsPage() {
  const router = useRouter()
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSegments() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchOrgSegments(MOCK_ORG_ID)
        setSegments(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load segments')
        console.error('Segments load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSegments()
  }, [])

  const handleSegmentClick = (segmentId: string) => {
    // Route to organization view with focused state
    router.push(`/console/organization?segment=${segmentId}`)
  }

  if (loading) {
    return (
      <ConsoleLayout title="Segments">
        <div className="p-6">
          <div className="text-gray-400">Loading segments...</div>
        </div>
      </ConsoleLayout>
    )
  }

  if (error) {
    return (
      <ConsoleLayout title="Segments">
        <div className="p-6">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </ConsoleLayout>
    )
  }

  return (
    <ConsoleLayout title="Segments">
      <div className="p-6">
        <div className="space-y-3">
          {segments.map((segment) => (
            <div
              key={segment.id}
              onClick={() => handleSegmentClick(segment.id)}
              className="p-4 bg-gray-900 border border-gray-800 rounded-lg cursor-pointer hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${healthColors[segment.health]}`} />
                  <span className="text-white font-medium">{segment.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>At risk: {segment.at_risk_count}</span>
                  <span className="text-lg">{trendIcons[segment.trend]}</span>
                </div>
              </div>
            </div>
          ))}
          {segments.length === 0 && (
            <div className="text-gray-400">No segments found</div>
          )}
        </div>
      </div>
    </ConsoleLayout>
  )
}

