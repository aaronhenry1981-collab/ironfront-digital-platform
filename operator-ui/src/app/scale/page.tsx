'use client'

import PublicLayout from '@/components/public/PublicLayout'
import HeroSection from '@/components/public/HeroSection'
import TierCards from '@/components/public/TierCards'
import DisclosureBlock from '@/components/public/DisclosureBlock'
import Link from 'next/link'

export default function ScalePage() {
  const tiers = [
    {
      name: 'Individual Operator',
      price: '$49',
      priceNote: '/ month',
      cta: 'Get Started',
      ctaHref: '/apply?intent=scale',
    },
    {
      name: 'Builder',
      price: '$199',
      priceNote: '/ month',
      cta: 'Upgrade to Builder',
      ctaHref: '/apply?intent=scale&tier=builder',
    },
    {
      name: 'Org Leader',
      price: '$599',
      priceNote: '/ month',
      cta: 'Request Leader Access',
      ctaHref: '/apply?intent=scale&tier=leader',
    },
    {
      name: 'Company Owner',
      price: 'Franchise License',
      cta: 'Explore Franchise Model',
      ctaHref: '/apply?intent=scale&tier=franchise',
    },
  ]

  return (
    <PublicLayout>
      <HeroSection
        headline="Infrastructure for Organizations That Already Exist"
        subhead="We don't replace your business. We make it operate better."
      />

      <div className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-7">What this is</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Operational dashboards</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Team visibility & engagement signals</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Automated onboarding</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Lead handling & routing</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Intervention insights (non-financial)</span>
            </li>
          </ul>

          <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-7 mt-16">What this is NOT</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Not an MLM</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Not a recruiting program</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>No income guarantees</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>No placement or assignment</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>No compensation control</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-10 text-center">Pricing</h2>
          <TierCards tiers={tiers} />
        </div>
      </div>

      <DisclosureBlock text="Iron Front provides infrastructure and operating tools. We do not offer business opportunities or compensation programs." />
    </PublicLayout>
  )
}

