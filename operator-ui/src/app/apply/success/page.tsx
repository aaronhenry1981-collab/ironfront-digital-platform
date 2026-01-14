'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PublicLayout from '@/components/public/PublicLayout'

export default function ApplySuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [tier, setTier] = useState<string>('')

  useEffect(() => {
    const session = searchParams.get('session_id')
    setSessionId(session)
    
    // Extract tier from session if available (would need to be passed via metadata)
    // For now, we'll use a default or extract from URL params
    const tierParam = searchParams.get('tier') || ''
    setTier(tierParam)
  }, [searchParams])

  // Map tier to intent for the apply form
  // All LaunchPath tiers (paid) use 'launch' intent
  const intent = 'launch'

  return (
    <PublicLayout>
      <div className="bg-white py-20 sm:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="mb-8">
              <svg
                className="w-16 h-16 mx-auto text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 mb-5 leading-tight">
              You're In. Here's What Happens Next.
            </h1>
          </div>

          <div className="bg-gray-50 rounded-lg p-8 sm:p-10 mb-10">
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              Your access to Iron Front Digital is now active.
            </p>
            <p className="text-gray-600 mb-5 font-medium">
              Over the next 24 hours:
            </p>
            <ul className="space-y-3 text-gray-600 mb-7">
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span>Your account will be provisioned</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span>Your access level will be confirmed</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span>You'll receive next-step instructions by email</span>
              </li>
            </ul>
            <p className="text-gray-700 font-medium">
              You don't need to do anything else right now.
            </p>
          </div>

          <div className="text-center">
            <Link
              href={`/apply?paid=true&intent=launch&tier=${tier || 'starter'}`}
              className="inline-block px-8 py-3 bg-gray-900 text-white rounded-md text-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Continue Application
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              Complete your application to finalize account setup.
            </p>
            <p className="text-xs text-gray-400 mt-6">
              Payments secured by <span className="font-semibold text-gray-500">Stripe</span>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}

