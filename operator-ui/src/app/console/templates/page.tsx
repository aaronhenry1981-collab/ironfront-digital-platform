'use client'

import { useEffect, useState } from 'react'
import ConsoleLayout from '@/components/layout/ConsoleLayout'

interface Template {
  id: string
  name: string
  channel: string
  subject_template: string | null
  body_template: string
  intent_filter: string | null
  status_filter: string | null
  version: number
  base_confidence: number
  archived_at: string | null
  created_at: string
}

const VAR_HINT = 'Available variables: {{name}}, {{email}}, {{intent}}, {{tier}}, {{operator_name}}'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // form state
  const [name, setName] = useState('')
  const [channel, setChannel] = useState('email')
  const [subjectTemplate, setSubjectTemplate] = useState('')
  const [bodyTemplate, setBodyTemplate] = useState('')
  const [intentFilter, setIntentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [baseConfidence, setBaseConfidence] = useState(50)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/console/templates')
      if (r.ok) setTemplates(await r.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const r = await fetch('/api/console/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          channel,
          subject_template: subjectTemplate || null,
          body_template: bodyTemplate,
          intent_filter: intentFilter || null,
          status_filter: statusFilter || null,
          base_confidence: baseConfidence,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Create failed')
      setShowForm(false)
      setName('')
      setSubjectTemplate('')
      setBodyTemplate('')
      setIntentFilter('')
      setStatusFilter('')
      setBaseConfidence(50)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this template? Past touches keep their link.')) return
    try {
      const r = await fetch(`/api/console/templates/${id}/archive`, {
        method: 'POST',
      })
      if (r.ok) await load()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <ConsoleLayout title="Outreach Templates">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-gray-400">
              Templates the system ranks for each intake. Confidence calibrates from
              outcomes — successful templates float to the top of recommendations
              automatically.
            </p>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
          >
            {showForm ? 'Cancel' : 'New template'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-6 p-5 bg-gray-900 border border-gray-800 rounded space-y-3"
          >
            {error && (
              <div className="text-sm text-red-400 bg-red-900/30 border border-red-800/50 p-2 rounded">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Channel *</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                >
                  <option value="email">email</option>
                  <option value="sms">sms</option>
                  <option value="call">call</option>
                  <option value="meeting">meeting</option>
                  <option value="note">note</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Intent filter (optional)
                </label>
                <select
                  value={intentFilter}
                  onChange={(e) => setIntentFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                >
                  <option value="">any</option>
                  <option value="scale">scale</option>
                  <option value="launch">launch</option>
                  <option value="ecosystems">ecosystems</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Status filter (optional)
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                >
                  <option value="">any</option>
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="qualified">qualified</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Subject template (email only)
              </label>
              <input
                type="text"
                value={subjectTemplate}
                onChange={(e) => setSubjectTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Body template *</label>
              <textarea
                required
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm font-mono"
              />
              <div className="text-xs text-gray-500 mt-1">{VAR_HINT}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Base confidence (1-99)
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={baseConfidence}
                onChange={(e) => setBaseConfidence(parseInt(e.target.value, 10))}
                className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">
                Where the template starts before any outcome data accumulates.
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create template'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="text-gray-500 italic">
            No templates yet. Create one to seed the recommendation engine.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="p-4 bg-gray-900 border border-gray-800 rounded"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-white font-medium">
                      {t.name}{' '}
                      <span className="text-xs text-gray-500">
                        v{t.version} · {t.channel}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {t.intent_filter && (
                        <span className="mr-3">
                          intent: <span className="text-gray-300">{t.intent_filter}</span>
                        </span>
                      )}
                      {t.status_filter && (
                        <span className="mr-3">
                          status:{' '}
                          <span className="text-gray-300">{t.status_filter}</span>
                        </span>
                      )}
                      <span>
                        base conf:{' '}
                        <span className="text-gray-300">{t.base_confidence}%</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleArchive(t.id)}
                    className="text-xs text-gray-400 hover:text-red-400"
                  >
                    Archive
                  </button>
                </div>
                {t.subject_template && (
                  <div className="text-sm text-gray-300 mb-1">
                    <span className="text-gray-500">Subject:</span>{' '}
                    {t.subject_template}
                  </div>
                )}
                <pre className="text-xs text-gray-300 bg-gray-950 p-3 rounded whitespace-pre-wrap font-mono">
                  {t.body_template}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </ConsoleLayout>
  )
}
