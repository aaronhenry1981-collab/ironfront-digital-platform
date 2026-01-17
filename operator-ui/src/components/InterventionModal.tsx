'use client'

import { useState } from 'react'

interface InterventionModalProps {
  isOpen: boolean
  onClose: () => void
  action: string
  onConfirm: (reason: string) => void
}

export default function InterventionModal({
  isOpen,
  onClose,
  action,
  onConfirm,
}: InterventionModalProps) {
  const [reason, setReason] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim()) {
      onConfirm(reason)
      setReason('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-medium text-white mb-4">Confirm Intervention</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Action</label>
            <div className="px-3 py-2 bg-gray-800 rounded text-sm text-gray-300">
              {action}
            </div>
          </div>
          <div>
            <label htmlFor="reason" className="block text-sm text-gray-400 mb-1">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              placeholder="Provide reason for this intervention..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Confirm
            </button>
          </div>
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
            This action can be undone from the Interventions page.
          </div>
        </form>
      </div>
    </div>
  )
}






