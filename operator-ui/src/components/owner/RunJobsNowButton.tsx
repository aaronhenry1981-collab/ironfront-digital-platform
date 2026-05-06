'use client'

import { useState } from 'react'

interface RunResult {
  ok: boolean
  duration_ms: number
  escalation_alerts: any[]
  recommendation_summary: { generated: number; skipped_existing: number } | null
  errors: Array<{ job: string; error: string }>
}

export default function RunJobsNowButton() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const r = await fetch('/api/console/run-jobs-now', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Run failed')
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={running}
        className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
      >
        {running ? 'Running...' : 'Run jobs now'}
      </button>
      {result && (
        <div className="text-xs text-gray-300 bg-gray-900 border border-gray-800 rounded p-3 mt-2">
          <div className={result.ok ? 'text-green-400' : 'text-red-400'}>
            {result.ok ? 'OK' : 'Errors'} · {result.duration_ms}ms
          </div>
          <div className="mt-1">
            Recommendations generated:{' '}
            {result.recommendation_summary?.generated ?? 0} (skipped existing:{' '}
            {result.recommendation_summary?.skipped_existing ?? 0})
          </div>
          <div>Escalation alerts: {result.escalation_alerts.length}</div>
          {result.errors.length > 0 && (
            <pre className="text-red-400 mt-2 whitespace-pre-wrap">
              {JSON.stringify(result.errors, null, 2)}
            </pre>
          )}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/30 border border-red-800/50 rounded p-2 mt-2">
          {error}
        </div>
      )}
    </div>
  )
}
