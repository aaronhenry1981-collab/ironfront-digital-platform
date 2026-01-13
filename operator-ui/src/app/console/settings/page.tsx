'use client'

import { useState } from 'react'
import ConsoleLayout from '@/components/layout/ConsoleLayout'

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('Iron Front Digital')
  const [timezone, setTimezone] = useState('America/New_York')
  const [importSummary, setImportSummary] = useState<{
    imported: number
    needsReview: number
  } | null>(null)

  const handleDownloadTemplate = () => {
    // TODO: Implement template download
    console.log('Download template')
  }

  const handleUploadCSV = () => {
    // TODO: Implement CSV upload
    // Mock summary for now
    setImportSummary({ imported: 45, needsReview: 3 })
  }

  return (
    <ConsoleLayout title="Settings">
      <div className="p-6 max-w-2xl">
        <div className="space-y-6">
          {/* Organization Display Name */}
          <section>
            <h2 className="text-sm font-medium text-gray-400 mb-3">Organization</h2>
            <div>
              <label htmlFor="org-name" className="block text-sm text-gray-300 mb-2">
                Display Name
              </label>
              <input
                id="org-name"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded text-white focus:outline-none focus:border-gray-700"
              />
            </div>
          </section>

          {/* Timezone */}
          <section>
            <h2 className="text-sm font-medium text-gray-400 mb-3">Regional</h2>
            <div>
              <label htmlFor="timezone" className="block text-sm text-gray-300 mb-2">
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded text-white focus:outline-none focus:border-gray-700"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </section>

          {/* CSV Import */}
          <section>
            <h2 className="text-sm font-medium text-gray-400 mb-3">Data Import</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                >
                  Download template
                </button>
                <button
                  onClick={handleUploadCSV}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Upload CSV
                </button>
              </div>
              {importSummary && (
                <div className="p-4 bg-gray-900 border border-gray-800 rounded">
                  <div className="text-sm text-gray-300">
                    <div>Imported: {importSummary.imported}</div>
                    <div className="mt-1">Needs review: {importSummary.needsReview}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </ConsoleLayout>
  )
}

