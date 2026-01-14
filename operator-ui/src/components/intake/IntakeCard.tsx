'use client'

import { Intake } from '@/lib/repositories/intakes'

interface IntakeCardProps {
  intake: Intake
  onClick: () => void
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  return 'Recently'
}

export default function IntakeCard({ intake, onClick }: IntakeCardProps) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors mb-3"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-medium text-gray-900 mb-1">
            {intake.name || intake.email}
          </div>
          <div className="text-sm text-gray-600 capitalize">{intake.intent}</div>
        </div>
        <div className="text-xs text-gray-500">{formatTimeAgo(intake.created_at)}</div>
      </div>
      <div className="text-xs text-gray-500">
        {intake.assigned_user ? (
          <span>Assigned to {intake.assigned_user.email}</span>
        ) : (
          <span className="text-yellow-600">Unassigned</span>
        )}
      </div>
    </div>
  )
}

