'use client'

import { useEffect, useState } from 'react'
import { Intake } from '@/lib/repositories/intakes'
import { IntakeStatus } from '@/lib/intake-routing'

interface IntakeDetailPanelProps {
  intake: Intake | null
  onClose: () => void
  onUpdate: () => void
}

interface Touch {
  id: string
  channel: string
  direction: string
  subject: string | null
  body: string
  template_id: string | null
  context_summary: string | null
  outcome: string | null
  created_at: string
}

interface DraftedTouch {
  channel: 'email' | 'sms' | 'note'
  subject: string | null
  body: string
  rationale: string
  rolling_summary: string
  template_id_used: string | null
}

export default function IntakeDetailPanel({
  intake,
  onClose,
  onUpdate,
}: IntakeDetailPanelProps) {
  const [notes, setNotes] = useState(intake?.notes || '')
  const [status, setStatus] = useState<IntakeStatus>(intake?.status || 'new')
  const [saving, setSaving] = useState(false)

  // Thread + draft state
  const [touches, setTouches] = useState<Touch[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState<DraftedTouch | null>(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!intake) return
    setNotes(intake.notes || '')
    setStatus(intake.status)
    setDraft(null)
    setError(null)
    void loadThread(intake.id)
    // We intentionally only re-run when the selected intake changes (by id);
    // adding the full intake object would reset state on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intake?.id])

  if (!intake) return null

  async function loadThread(intakeId: string) {
    setLoadingThread(true)
    try {
      const r = await fetch(`/api/console/intakes/${intakeId}/touches`)
      if (r.ok) setTouches(await r.json())
    } catch (e) {
      console.error('Failed to load thread:', e)
    } finally {
      setLoadingThread(false)
    }
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    try {
      await fetch(`/api/console/intakes/${intake.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      onUpdate()
    } catch (e) {
      console.error('Failed to save notes:', e)
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
    } catch (e) {
      console.error('Failed to update status:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDraft = async () => {
    setDrafting(true)
    setError(null)
    try {
      const r = await fetch(
        `/api/console/intakes/${intake.id}/draft-next-touch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 'email', tone: 'direct' }),
        }
      )
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Draft failed')
      setDraft(data.draft)
      setEditedSubject(data.draft.subject || '')
      setEditedBody(data.draft.body || '')
    } catch (e: any) {
      setError(e.message || 'Failed to draft')
    } finally {
      setDrafting(false)
    }
  }

  const handleSend = async () => {
    if (!draft) return
    setSending(true)
    setError(null)
    try {
      const r = await fetch(`/api/console/intakes/${intake.id}/touches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: draft.channel,
          direction: 'outbound',
          subject: editedSubject,
          body: editedBody,
          template_id: draft.template_id_used,
          context_summary: draft.rolling_summary,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Send failed')
      setDraft(null)
      setEditedSubject('')
      setEditedBody('')
      await loadThread(intake.id)
      onUpdate()
    } catch (e: any) {
      setError(e.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleSaveAsNote = async () => {
    if (!draft) return
    setSending(true)
    setError(null)
    try {
      const r = await fetch(`/api/console/intakes/${intake.id}/touches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'note',
          direction: 'outbound',
          subject: null,
          body: editedBody,
          context_summary: draft.rolling_summary,
          deliver: false,
        }),
      })
      if (!r.ok) {
        const data = await r.json()
        throw new Error(data.error || 'Save failed')
      }
      setDraft(null)
      await loadThread(intake.id)
    } catch (e: any) {
      setError(e.message || 'Failed to save note')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="w-[480px] bg-gray-900 border-l border-gray-800 h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-white">Intake Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
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
              <label className="block text-sm text-gray-400 mb-1">
                First Contact
              </label>
              <div className="text-white text-sm">
                {new Date(intake.first_contact_at).toLocaleString()}
              </div>
            </div>
          )}

          {/* Conversation thread */}
          <div className="pt-4 border-t border-gray-800">
            <label className="block text-sm text-gray-400 mb-2">
              Conversation
            </label>
            {loadingThread ? (
              <div className="text-xs text-gray-500">Loading...</div>
            ) : touches.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No touches yet</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {touches.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded text-xs ${
                      t.direction === 'outbound'
                        ? 'bg-blue-900/30 border border-blue-800/50'
                        : 'bg-gray-800 border border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between text-gray-400 mb-1">
                      <span className="uppercase font-medium">
                        {t.direction} · {t.channel}
                      </span>
                      <span>{new Date(t.created_at).toLocaleString()}</span>
                    </div>
                    {t.subject && (
                      <div className="text-white font-medium mb-1">
                        {t.subject}
                      </div>
                    )}
                    <div className="text-gray-300 whitespace-pre-wrap">
                      {t.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Draft next touch */}
          <div className="pt-4 border-t border-gray-800">
            <label className="block text-sm text-gray-400 mb-2">
              Next outreach
            </label>
            {!draft && !drafting && (
              <button
                onClick={handleDraft}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
              >
                Draft next touch with Claude
              </button>
            )}
            {drafting && (
              <div className="text-sm text-gray-400 italic">
                Reading thread and drafting... (5-30s)
              </div>
            )}
            {draft && (
              <div className="space-y-3">
                <div className="text-xs text-gray-500 italic">
                  {draft.rationale}
                </div>
                {draft.template_id_used && (
                  <div className="text-xs text-orange-400">
                    Started from template: {draft.template_id_used}
                  </div>
                )}
                {draft.channel === 'email' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Body
                  </label>
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-gray-600"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                  <button
                    onClick={handleSaveAsNote}
                    disabled={sending}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 transition-colors disabled:opacity-50"
                    title="Save as internal note without sending"
                  >
                    Save as note
                  </button>
                  <button
                    onClick={() => {
                      setDraft(null)
                      setEditedBody('')
                      setEditedSubject('')
                    }}
                    disabled={sending}
                    className="px-4 py-2 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="mt-2 text-xs text-red-400 bg-red-900/30 border border-red-800/50 p-2 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="pt-4 border-t border-gray-800">
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
