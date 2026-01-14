'use client'

import { useState, useEffect } from 'react'
import ConsoleLayout from '@/components/layout/ConsoleLayout'

interface OverviewMetrics {
  new_intakes_24h: number
  new_intakes_7d: number
  avg_time_to_contact_hours: number
  conversion_by_intent: Record<string, Record<string, number>>
  unassigned_backlog: number
  sla_breaches: number
}

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/console/overview')
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ConsoleLayout title="Overview">
        <div className="p-6">
          <div className="text-gray-400">Loading metrics...</div>
        </div>
      </ConsoleLayout>
    )
  }

  if (!metrics) {
    return (
      <ConsoleLayout title="Overview">
        <div className="p-6">
          <div className="text-red-400">Failed to load metrics</div>
        </div>
      </ConsoleLayout>
    )
  }

  return (
    <ConsoleLayout title="Overview">
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">New Intakes (24h)</h3>
            <div className="text-3xl font-medium text-white">{metrics.new_intakes_24h}</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">New Intakes (7d)</h3>
            <div className="text-3xl font-medium text-white">{metrics.new_intakes_7d}</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Time to Contact</h3>
            <div className="text-3xl font-medium text-white">
              {metrics.avg_time_to_contact_hours}h
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Unassigned Backlog</h3>
            <div className="text-3xl font-medium text-white">{metrics.unassigned_backlog}</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">SLA Breaches</h3>
            <div className={`text-3xl font-medium ${metrics.sla_breaches > 0 ? 'text-red-400' : 'text-white'}`}>
              {metrics.sla_breaches}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Conversion by Intent</h3>
          <div className="space-y-4">
            {Object.entries(metrics.conversion_by_intent).map(([intent, statuses]) => (
              <div key={intent}>
                <h4 className="text-sm font-medium text-gray-400 mb-2 capitalize">{intent}</h4>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  {['new', 'contacted', 'qualified', 'closed', 'lost'].map((status) => (
                    <div key={status} className="text-gray-300">
                      <span className="capitalize">{status}:</span>{' '}
                      <span className="font-medium">{statuses[status] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ConsoleLayout>
  )
}

