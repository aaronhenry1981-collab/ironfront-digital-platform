'use client'

import ConsoleLayout from '@/components/layout/ConsoleLayout'

interface AuditEvent {
  id: string
  type: string
  actor: string
  timestamp: string
  description: string
}

// Mock audit events
const mockEvents: AuditEvent[] = [
  {
    id: '1',
    type: 'lead_created',
    actor: 'system',
    timestamp: '2024-01-10 15:30:22',
    description: 'New participant application received via /apply endpoint',
  },
  {
    id: '2',
    type: 'lead_status_updated',
    actor: 'operator@ironfrontdigital.com',
    timestamp: '2024-01-10 14:15:10',
    description: 'Participant status changed from new to contacted',
  },
  {
    id: '3',
    type: 'admin_exported',
    actor: 'operator@ironfrontdigital.com',
    timestamp: '2024-01-10 13:45:33',
    description: 'CSV export of all leads generated',
  },
  {
    id: '4',
    type: 'intervention_created',
    actor: 'system',
    timestamp: '2024-01-10 12:20:15',
    description: 'Recovery workflow automatically triggered for at-risk participant',
  },
  {
    id: '5',
    type: 'segment_automation_paused',
    actor: 'operator@ironfrontdigital.com',
    timestamp: '2024-01-09 16:10:45',
    description: 'Automation paused for Onboarding Phase 2 segment',
  },
]

export default function AuditPage() {
  return (
    <ConsoleLayout title="Audit">
      <div className="p-6">
        <div className="mb-4 text-sm text-gray-400">
          Append-only event log for governance and compliance
        </div>
        <div className="space-y-3">
          {mockEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 bg-gray-900 border border-gray-800 rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-400 uppercase">
                    {event.type}
                  </span>
                  <span className="text-xs text-gray-500">by {event.actor}</span>
                </div>
                <span className="text-xs text-gray-500">{event.timestamp}</span>
              </div>
              <p className="text-sm text-gray-300">{event.description}</p>
            </div>
          ))}
        </div>
      </div>
    </ConsoleLayout>
  )
}

