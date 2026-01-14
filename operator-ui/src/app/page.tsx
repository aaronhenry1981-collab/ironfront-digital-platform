'use client'

import Link from 'next/link'
import PublicLayout from '@/components/public/PublicLayout'

export default function HomePage() {
  return (
    <PublicLayout>
      {/* 1️⃣ HERO SECTION */}
      <section className="bg-white py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl sm:text-6xl font-medium text-gray-900 mb-7 leading-tight">
            The Platform That Runs the Business Behind the Business
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Iron Front Digital provides the systems, automation, and operational visibility required to build and scale real businesses — without chaos or guesswork.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/scale"
              className="px-8 py-4 bg-gray-900 text-white rounded-md text-lg font-medium hover:bg-gray-800 transition-colors touch-manipulation"
            >
              Scale My Business
            </Link>
            <Link
              href="/launch"
              className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-900 rounded-md text-lg font-medium hover:bg-gray-50 transition-colors touch-manipulation"
            >
              Start a Business
            </Link>
          </div>
        </div>
      </section>

      {/* 2️⃣ TRUST ANCHOR STRIP */}
      <section className="bg-gray-50 py-12 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="mb-3">
                <svg className="w-8 h-8 mx-auto text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Built for long-term operations</p>
            </div>
            <div className="text-center">
              <div className="mb-3">
                <svg className="w-8 h-8 mx-auto text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Compliance-first infrastructure</p>
            </div>
            <div className="text-center">
              <div className="mb-3">
                <svg className="w-8 h-8 mx-auto text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Scales without breaking</p>
            </div>
            <div className="text-center">
              <div className="mb-3">
                <svg className="w-8 h-8 mx-auto text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">Designed for real businesses</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3️⃣ WHAT WE DO (4-CARD GRID) */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Systems & Automation</h3>
              <p className="text-sm text-gray-600">Replace manual work with repeatable systems.</p>
            </div>
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Operational Visibility</h3>
              <p className="text-sm text-gray-600">See what's happening without micromanaging.</p>
            </div>
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Scalable Infrastructure</h3>
              <p className="text-sm text-gray-600">Grow without rebuilding your business every stage.</p>
            </div>
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Governance & Oversight</h3>
              <p className="text-sm text-gray-600">Stay compliant, auditable, and controlled.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4️⃣ PATH SELECTION */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Scale Card */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-10 hover:border-gray-300 transition-colors">
              <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-5">Scale</h2>
              <p className="text-gray-600 mb-8 leading-relaxed text-base">
                For existing businesses and leaders who want structure, clarity, and systemized execution.
              </p>
              <Link
                href="/scale"
                className="inline-block px-6 py-3 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
              >
                Explore Scale
              </Link>
            </div>

            {/* Launch Card */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-10 hover:border-gray-300 transition-colors">
              <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-5">Launch</h2>
              <p className="text-gray-600 mb-8 leading-relaxed text-base">
                For individuals starting from zero who want a guided, structured path to business ownership.
              </p>
              <Link
                href="/launch"
                className="inline-block px-6 py-3 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
              >
                Explore LaunchPath™
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
