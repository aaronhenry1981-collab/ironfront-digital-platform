'use client'

import { useState } from 'react'
import Link from 'next/link'
import PublicLayout from '@/components/public/PublicLayout'

// Price IDs - these should be set as NEXT_PUBLIC_ environment variables
// For now, using fallback values that will be replaced with actual Price IDs from .env
const getPriceIds = () => {
  // In production, these come from environment variables
  // For development, they can be set in .env.local
  return {
    // LaunchPath™
    starter_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || '',
    starter_annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || '',
    growth_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_MONTHLY || '',
    growth_annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH_ANNUAL || '',
    scale_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE_MONTHLY || '',
    scale_annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE_ANNUAL || '',
    // Scale
    organization_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ORGANIZATION_MONTHLY || '',
    organization_annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ORGANIZATION_ANNUAL || '',
    franchise: process.env.NEXT_PUBLIC_STRIPE_PRICE_FRANCHISE || '',
  }
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const PRICE_IDS = getPriceIds()

  const handleCheckout = async (priceId: string, tier: string) => {
    if (!priceId) {
      alert('Price not configured. Please contact support.')
      return
    }

    setLoading(priceId)
    try {
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, tier }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
      setLoading(null)
    }
  }

  return (
    <PublicLayout>
      {/* 1️⃣ PAGE HEADER */}
      <section className="bg-white py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 mb-5">
            Pricing Built for Real Businesses
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Clear, transparent pricing for individuals, operators, and organizations at every stage.
          </p>
        </div>
      </section>

      {/* 4️⃣ MONTHLY / ANNUAL TOGGLE */}
      <section className="bg-gray-50 py-8 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-3 text-sm font-medium rounded-l-lg border ${
                  billingCycle === 'monthly'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-3 text-sm font-medium rounded-r-lg border ${
                  billingCycle === 'annual'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Annual
                <span className="ml-2 text-xs text-gray-500">(saves)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2️⃣ SECTION ONE — LAUNCHPATH™ */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-3">LaunchPath™</h2>
            <p className="text-lg text-gray-600">For individuals starting a business from zero</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Individual Operator */}
            <div className="border-2 border-gray-200 rounded-lg p-8 sm:p-10 hover:border-gray-300 transition-colors">
              <h3 className="text-xl sm:text-2xl font-medium text-gray-900 mb-3">Individual Operator</h3>
              <div className="mb-5">
                <span className="text-4xl sm:text-5xl font-medium text-gray-900">
                  {billingCycle === 'monthly' ? '$99' : '$999'}
                </span>
                <span className="text-gray-600 ml-2 text-lg">
                  {billingCycle === 'monthly' ? '/ month' : '/ year'}
                </span>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-8 leading-relaxed">
                Foundational access to the operating platform with core systems and workflows.
              </p>
              <button
                onClick={() =>
                  handleCheckout(
                    billingCycle === 'monthly'
                      ? PRICE_IDS.starter_monthly
                      : PRICE_IDS.starter_annual,
                    'starter'
                  )
                }
                disabled={loading !== null || !PRICE_IDS.starter_monthly}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === (billingCycle === 'monthly' ? PRICE_IDS.starter_monthly : PRICE_IDS.starter_annual)
                  ? 'Processing...'
                  : 'Get Started'}
              </button>
            </div>

            {/* Builder */}
            <div className="border-2 border-gray-200 rounded-lg p-8 sm:p-10 hover:border-gray-300 transition-colors">
              <h3 className="text-xl sm:text-2xl font-medium text-gray-900 mb-3">Builder</h3>
              <div className="mb-5">
                <span className="text-4xl sm:text-5xl font-medium text-gray-900">
                  {billingCycle === 'monthly' ? '$299' : '$2,999'}
                </span>
                <span className="text-gray-600 ml-2 text-lg">
                  {billingCycle === 'monthly' ? '/ month' : '/ year'}
                </span>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-8 leading-relaxed">
                Expanded tools and structured support for individuals actively building a business.
              </p>
              <button
                onClick={() =>
                  handleCheckout(
                    billingCycle === 'monthly'
                      ? PRICE_IDS.growth_monthly
                      : PRICE_IDS.growth_annual,
                    'growth'
                  )
                }
                disabled={loading !== null || !PRICE_IDS.growth_monthly}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === (billingCycle === 'monthly' ? PRICE_IDS.growth_monthly : PRICE_IDS.growth_annual)
                  ? 'Processing...'
                  : 'Get Started'}
              </button>
            </div>

            {/* Advanced Operator */}
            <div className="border-2 border-gray-200 rounded-lg p-8 sm:p-10 hover:border-gray-300 transition-colors">
              <h3 className="text-xl sm:text-2xl font-medium text-gray-900 mb-3">Advanced Operator</h3>
              <div className="mb-5">
                <span className="text-4xl sm:text-5xl font-medium text-gray-900">
                  {billingCycle === 'monthly' ? '$999' : '$9,999'}
                </span>
                <span className="text-gray-600 ml-2 text-lg">
                  {billingCycle === 'monthly' ? '/ month' : '/ year'}
                </span>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-8 leading-relaxed">
                Full platform access for high-activity operators managing serious volume.
              </p>
              <button
                onClick={() =>
                  handleCheckout(
                    billingCycle === 'monthly'
                      ? PRICE_IDS.scale_monthly
                      : PRICE_IDS.scale_annual,
                    'scale'
                  )
                }
                disabled={loading !== null || !PRICE_IDS.scale_monthly}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === (billingCycle === 'monthly' ? PRICE_IDS.scale_monthly : PRICE_IDS.scale_annual)
                  ? 'Processing...'
                  : 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3️⃣ SECTION TWO — SCALE */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-3">Scale</h2>
            <p className="text-lg text-gray-600">For existing businesses and leaders</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Organization / Leader */}
            <div className="border-2 border-gray-200 rounded-lg p-8 sm:p-10 bg-white hover:border-gray-300 transition-colors">
              <h3 className="text-xl sm:text-2xl font-medium text-gray-900 mb-3">Organization / Leader</h3>
              <div className="mb-5">
                <span className="text-4xl sm:text-5xl font-medium text-gray-900">
                  {billingCycle === 'monthly' ? '$599' : '$5,999'}
                </span>
                <span className="text-gray-600 ml-2 text-lg">
                  {billingCycle === 'monthly' ? '/ month' : '/ year'}
                </span>
              </div>
              <p className="text-sm sm:text-base text-gray-600 mb-8 leading-relaxed">
                Organization-level access with visibility, governance, and team-level system support.
              </p>
              <Link
                href="/apply?intent=scale&tier=organization"
                className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
              >
                Apply for Access
              </Link>
            </div>

            {/* Franchise License */}
            <div className="border-2 border-gray-200 rounded-lg p-8 sm:p-10 bg-white hover:border-gray-300 transition-colors">
              <h3 className="text-xl sm:text-2xl font-medium text-gray-900 mb-3">Franchise License</h3>
              <div className="mb-5">
                <span className="text-4xl sm:text-5xl font-medium text-gray-900">$10,000</span>
                <span className="text-gray-600 ml-2 text-lg">one-time</span>
              </div>
              <p className="text-sm text-gray-500 mb-3">3-year license</p>
              <p className="text-sm sm:text-base text-gray-600 mb-8 leading-relaxed">
                Licensed deployment of the Iron Front Digital platform under approved branding terms.
              </p>
              <Link
                href="/apply?intent=scale&tier=franchise"
                className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
              >
                Request Franchise Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5️⃣ COMPLIANCE FOOTER */}
      <section className="bg-white py-16 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500 leading-relaxed">
            Pricing reflects platform access only. No earnings or outcomes are guaranteed. Annual plans billed upfront.
          </p>
        </div>
      </section>
    </PublicLayout>
  )
}
