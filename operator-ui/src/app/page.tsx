'use client'

import Link from 'next/link'
import PublicLayout from '@/components/public/PublicLayout'

export default function Page() {
  return (
    <PublicLayout>
      {/* 1) Hero Section */}
      <section className="bg-white py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium text-gray-900 mb-6 leading-tight">
              The Platform That Runs the Business Behind the Business
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed">
              Iron Front Digital provides operational infrastructure for people building, scaling, or managing real businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/scale"
                className="px-8 py-4 bg-gray-900 text-white rounded-md text-lg font-medium hover:bg-gray-800 transition-colors touch-manipulation"
              >
                Scale an Existing Business
              </Link>
              <Link
                href="/launch"
                className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-900 rounded-md text-lg font-medium hover:bg-gray-50 transition-colors touch-manipulation"
              >
                Start a Business With Structure
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2) What This Is */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-8 text-center">
            What This Platform Is
          </h2>
          <div className="max-w-3xl mx-auto space-y-4 text-gray-700 leading-relaxed">
            <p>
              Operational software and infrastructure designed to support long-term business operations.
            </p>
            <p>
              Systems, automation, and visibility tools that help businesses operate consistently without constant manual intervention.
            </p>
            <p>
              Built for organizations and individuals who intend to operate businesses over years, not experiment with short-term tactics.
            </p>
          </div>
        </div>
      </section>

      {/* 3) Who This Is For */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-12 text-center">
            Who This Is For
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-medium text-gray-900 mb-4">
                Existing Business Operators
              </h3>
              <p className="text-gray-700 leading-relaxed">
                For people who already run businesses and need better operational structure, visibility, and automation.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-medium text-gray-900 mb-4">
                Starting From Zero
              </h3>
              <p className="text-gray-700 leading-relaxed">
                For people starting a business from zero who want structure, systems, and guidance rather than guesswork.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
              <h3 className="text-xl font-medium text-gray-900 mb-4">
                Distributed Teams
              </h3>
              <p className="text-gray-700 leading-relaxed">
                For organizations managing distributed teams who need operational visibility and consistent execution across locations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4) What This Is Not */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-8 text-center">
            What This Is Not
          </h2>
          <div className="max-w-3xl mx-auto">
            <ul className="space-y-3 text-gray-700 leading-relaxed">
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span>Not an MLM</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span>Not a business opportunity</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span>No income guarantees</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-gray-400">•</span>
                <span>No recruiting promises</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5) How It Works */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-12 text-center">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-medium mx-auto">
                  1
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Choose a Path
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Select Scale for existing businesses or Launch for starting from zero.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-medium mx-auto">
                  2
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Apply for Access
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Complete the application process to ensure alignment and appropriate platform use.
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-medium mx-auto">
                  3
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Operate Within the Platform
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Use the operational tools, systems, and visibility features to run your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6) Final CTA Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-8">
              Built for People Who Intend to Operate, Not Experiment
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/pricing"
                className="px-8 py-4 bg-gray-900 text-white rounded-md text-lg font-medium hover:bg-gray-800 transition-colors touch-manipulation"
              >
                View Pricing
              </Link>
              <Link
                href="/apply"
                className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-900 rounded-md text-lg font-medium hover:bg-gray-50 transition-colors touch-manipulation"
              >
                Apply for Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7) Footer Note */}
      <section className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            Iron Front Digital provides software and infrastructure. Outcomes depend on execution and external factors.
          </p>
        </div>
      </section>
    </PublicLayout>
  )
}
