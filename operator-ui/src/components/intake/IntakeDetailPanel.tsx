'use client'

import { useState } from 'react'
import { Intake } from '@/lib/repositories/intakes'
import { IntakeStatus } from '@/lib/intake-routing'

interface IntakeDetailPanelProps {
  intake: Intake | null
  onClose: () => void
  onUpdate: () => void
}

export default function IntakeDetailPanel({
  intake,
  onClose,
  onUpdate,
}: IntakeDetailPanelProps) {
  const [notes, setNotes] = useState(intake?.notes || '')
  const [status, setStatus] = useState<IntakeStatus>(intake?.status || 'new')
  const [saving, setSaving] = useState(false)

  if (!intake) return null

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await fetch(`/api/console/intakes/${intake.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      onUpdate()
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: IntakeStatus) => {
    setSaving(true)
    try {
      await fetch(`/api/console/intakes/${intake.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setStatus(newStatus)
      onUpdate()
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-96 bg-gray-900 border-l border-gray-800 h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-white">Intake Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <div className="text-white">{intake.name || 'N/A'}</div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <div className="text-white">{intake.email}</div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Intent</label>
            <div className="text-white capitalize">{intake.intent}</div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as IntakeStatus)}
              disabled={saving}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Assigned</label>
            <div className="text-white">
              {intake.assigned_user?.email || 'Unassigned'}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Created</label>
            <div className="text-white text-sm">
              {new Date(intake.created_at).toLocaleString()}
            </div>
          </div>

          {intake.first_contact_at && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">First Contact</label>
              <div className="text-white text-sm">
                {new Date(intake.first_contact_at).toLocaleString()}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

