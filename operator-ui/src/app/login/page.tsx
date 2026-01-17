'use client'

import { useState, useEffect } from 'react'

// Hard-coded owner email (must match lib/auth.ts)
const OWNER_EMAIL = 'aaronhenry1981@gmail.com'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState<string | null>(null)

  // Debug banner (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Login UI mounted')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatusText(null)

    try {
      const response = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Show "Access restricted" for non-owner emails
        if (response.status === 403) {
          setStatusText('Access restricted.')
        } else {
          setStatusText(data.error || 'Failed to send login link.')
        }
        setLoading(false)
        return
      }

      // Success: owner email received link
      setStatusText('Check your email for a secure login link')
      setEmail('')
    } catch (error: any) {
      setStatusText('Failed to send login link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {/* Debug banner - dev only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b border-yellow-300 text-yellow-800 text-xs py-1 px-4 text-center">
          Login UI mounted
        </div>
      )}

      {/* Centered card */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
          Owner Login
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter owner email"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send secure login link'}
          </button>
        </form>

        {/* Inline status text */}
        {statusText && (
          <div className={`mt-4 text-sm text-center ${
            statusText === 'Check your email for a secure login link'
              ? 'text-green-600'
              : 'text-red-600'
          }`}>
            {statusText}
          </div>
        )}
      </div>
    </div>
  )
}





