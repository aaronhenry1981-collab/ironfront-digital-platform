'use client'

import Link from 'next/link'
import PublicLayout from '@/components/public/PublicLayout'

export default function ApplyCompletePage() {
  return (
    <PublicLayout>
      <div className="bg-white py-20 sm:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-10">
            <svg
              className="w-16 h-16 mx-auto text-gray-700"
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
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 mb-8 leading-tight">
            Application Received
          </h1>
          <div className="space-y-5 text-gray-700 mb-10 text-left max-w-xl mx-auto">
            <p className="leading-relaxed">
              Thanks for applying to Iron Front Digital. Your information has been received and logged.
            </p>
            <p className="leading-relaxed">
              If payment was required, it has already been processed.
            </p>
            <p className="leading-relaxed">
              If approval is required, you'll hear from us shortly.
            </p>
            <p className="font-medium leading-relaxed">
              You'll receive a confirmation email with next steps.
            </p>
          </div>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}

