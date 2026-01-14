'use client'

import { useState, useEffect } from 'react'
import ConsoleLayout from '@/components/layout/ConsoleLayout'
import IntakeCard from '@/components/intake/IntakeCard'
import IntakeDetailPanel from '@/components/intake/IntakeDetailPanel'
import { Intake } from '@/lib/repositories/intakes'

const STATUS_COLUMNS: Array<{ status: string; label: string }> = [
  { status: 'new', label: 'New' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'qualified', label: 'Qualified' },
  { status: 'closed', label: 'Closed/Lost' },
]

export default function IntakePage() {
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIntake, setSelectedIntake] = useState<Intake | null>(null)

  useEffect(() => {
    loadIntakes()
  }, [])

  const loadIntakes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/console/intakes')
      if (!response.ok) throw new Error('Failed to load intakes')
      const data = await response.json()
      setIntakes(data)
    } catch (error) {
      console.error('Failed to load intakes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIntakesByStatus = (status: string) => {
    return intakes.filter((i) => matchesColumn(i.status, status))
  }

  if (loading) {
    return (
      <ConsoleLayout title="Intake Board">
        <div className="p-6">
          <div className="text-gray-400">Loading intakes...</div>
        </div>
      </ConsoleLayout>
    )
  }

  return (
    <ConsoleLayout title="Intake Board">
      <div className="flex h-full">
        <div className="flex-1 p-6 overflow-x-auto">
          <div className="grid grid-cols-4 gap-4 min-w-max">
            {STATUS_COLUMNS.map((column) => {
              const columnIntakes = getIntakesByStatus(column.status)
              return (
                <div key={column.status} className="min-w-[280px]">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                      {column.label}
                    </h3>
                    <div className="text-xs text-gray-500 mt-1">
                      {columnIntakes.length} intake{columnIntakes.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div>
                    {columnIntakes.map((intake) => (
                      <IntakeCard
                        key={intake.id}
                        intake={intake}
                        onClick={() => setSelectedIntake(intake)}
                      />
                    ))}
                    {columnIntakes.length === 0 && (
                      <div className="text-sm text-gray-500 text-center py-8">
                        No intakes
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <IntakeDetailPanel
          intake={selectedIntake}
          onClose={() => setSelectedIntake(null)}
          onUpdate={loadIntakes}
        />
      </div>
    </ConsoleLayout>
  )
}

