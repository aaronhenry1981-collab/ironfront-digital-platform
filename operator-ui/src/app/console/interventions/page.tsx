'use client'

import ConsoleLayout from '@/components/layout/ConsoleLayout'

interface Intervention {
  id: string
  action: string
  target: string
  date: string
  status: 'completed' | 'pending' | 'failed'
}

// Mock interventions
const mockInterventions: Intervention[] = [
  {
    id: '1',
    action: 'Onboarding path adjusted',
    target: 'Participant 3',
    date: '2024-01-10 14:30',
    status: 'completed',
  },
  {
    id: '2',
    action: 'Mentor reassigned',
    target: 'Participant 7',
    date: '2024-01-09 10:15',
    status: 'completed',
  },
  {
    id: '3',
    action: 'Recovery workflow triggered',
    target: 'Participant 12',
    date: '2024-01-08 16:45',
    status: 'pending',
  },
  {
    id: '4',
    action: 'Segment automation paused',
    target: 'Onboarding Phase 2',
    date: '2024-01-07 09:20',
    status: 'completed',
  },
]

const statusColors = {
  completed: 'text-green-400',
  pending: 'text-yellow-400',
  failed: 'text-red-400',
}

export default function InterventionsPage() {
  return (
    <ConsoleLayout title="Interventions">
      <div className="p-6">
        {/* Filters (UI only) */}
        <div className="mb-6 flex gap-4">
          <select className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-white">
            <option>All action types</option>
            <option>Path adjustment</option>
            <option>Mentor reassignment</option>
            <option>Workflow trigger</option>
            <option>Automation pause</option>
          </select>
          <select className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-white">
            <option>All dates</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
          <select className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-white">
            <option>All statuses</option>
            <option>Completed</option>
            <option>Pending</option>
            <option>Failed</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {mockInterventions.map((intervention) => (
                <tr
                  key={intervention.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-white">{intervention.action}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{intervention.target}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{intervention.date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm capitalize ${statusColors[intervention.status]}`}>
                      {intervention.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-blue-400 hover:text-blue-300">
                      Undo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ConsoleLayout>
  )
}

