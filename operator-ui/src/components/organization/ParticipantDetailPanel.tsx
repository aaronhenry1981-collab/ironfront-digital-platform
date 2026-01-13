'use client'

import { useState, useEffect } from 'react'
import { Participant, ParticipantDetail } from '@/lib/types'
import { fetchParticipantDetail } from '@/lib/api'

interface ParticipantDetailPanelProps {
  orgId: string
  participant: Participant | null
  onClose: () => void
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return 'Recently'
}

export default function ParticipantDetailPanel({
  orgId,
  participant,
  onClose,
}: ParticipantDetailPanelProps) {
  const [detail, setDetail] = useState<ParticipantDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!participant) {
      setDetail(null)
      return
    }

    async function loadDetail() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchParticipantDetail(orgId, participant.id)
        setDetail(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load participant')
        console.error('Participant detail error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [orgId, participant])

  if (!participant) return null

  const displayParticipant = detail?.participant || participant

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-white">Participant Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {loading && (
          <div className="text-sm text-gray-400 mb-4">Loading...</div>
        )}

        {error && (
          <div className="text-sm text-red-400 mb-4">Error: {error}</div>
        )}

        {detail && (
          <>
            {/* Snapshot */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Snapshot</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <span className="text-white ml-2">
                    {displayParticipant.display_name || `Participant ${displayParticipant.id}`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Engagement state:</span>
                  <span className="text-white ml-2 capitalize">
                    {displayParticipant.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Lifecycle stage:</span>
                  <span className="text-white ml-2 capitalize">
                    {displayParticipant.lifecycle_stage}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Last activity:</span>
                  <span className="text-white ml-2">
                    {displayParticipant.last_activity_at
                      ? formatTimeAgo(displayParticipant.last_activity_at)
                      : 'Never'}
                  </span>
                </div>
              </div>
            </section>

            {/* Recommendations */}
            {detail.recommendations.length > 0 && (
              <section className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Recommendations</h3>
                {detail.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="mb-3 p-4 bg-yellow-900/20 border border-yellow-800/50 rounded"
                  >
                    <h4 className="text-sm font-medium text-yellow-400 mb-1">
                      {rec.suggested_action}
                    </h4>
                    <p className="text-xs text-gray-400">{rec.reason}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      Confidence: {Math.round(rec.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Actions */}
            <section className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition-colors">
                  Reassign mentor
                </button>
                <button className="w-full px-3 py-2 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition-colors">
                  Reroute onboarding path
                </button>
                <button className="w-full px-3 py-2 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition-colors">
                  Trigger recovery workflow
                </button>
                <button className="w-full px-3 py-2 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition-colors">
                  Pause segment automation
                </button>
              </div>
            </section>

            {/* History */}
            <section>
              <h3 className="text-sm font-medium text-gray-400 mb-3">History</h3>
              <div className="space-y-3">
                {detail.recent_interventions.map((intervention) => (
                  <div key={intervention.id} className="p-3 bg-gray-800 rounded text-xs">
                    <div className="text-white mb-1">{intervention.action}</div>
                    <div className="text-gray-500">
                      {new Date(intervention.timestamp).toLocaleString()}
                    </div>
                    <div className="text-gray-400 mt-1">
                      Status: <span className="capitalize">{intervention.status}</span>
                    </div>
                  </div>
                ))}
                {detail.recent_interventions.length === 0 && (
                  <div className="text-xs text-gray-500">No recent interventions</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

