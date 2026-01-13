'use client'

import PublicLayout from '@/components/public/PublicLayout'
import HeroSection from '@/components/public/HeroSection'
import TierCards from '@/components/public/TierCards'
import DisclosureBlock from '@/components/public/DisclosureBlock'
import Link from 'next/link'

export default function PricingPage() {
  const scaleTiers = [
    {
      name: 'Individual Operator',
      price: '$49',
      priceNote: '/ month',
      cta: 'Get Started',
      ctaHref: '/apply?intent=scale&tier=operator',
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

  const launchTiers = [
    {
      name: 'Starter',
      price: '$99',
      priceNote: '/ month',
      cta: 'Start Here',
      ctaHref: '/apply?intent=launch&tier=starter',
    },
    {
      name: 'Growth',
      price: '$299',
      priceNote: '/ month',
      cta: 'Scale My Setup',
      ctaHref: '/apply?intent=launch&tier=growth',
    },
    {
      name: 'Scale',
      price: '$999',
      priceNote: '/ month',
      cta: 'Apply for Scale',
      ctaHref: '/apply?intent=launch&tier=scale',
    },
    {
      name: 'Franchise License',
      price: '$10,000',
      priceNote: '/ 3 Years',
      cta: 'Explore Franchise Path',
      ctaHref: '/apply?intent=launch&tier=franchise',
    },
  ]

  return (
    <PublicLayout>
      <HeroSection
        headline="Pricing"
        subhead="Choose the operating platform that fits your needs."
      />

      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <div className="text-center mb-8">
              <Link href="/scale" className="text-2xl font-medium text-gray-900 hover:text-gray-700">
                Scale
              </Link>
              <p className="text-gray-600 mt-2">For existing organizations</p>
            </div>
            <TierCards tiers={scaleTiers} />
          </div>

          <div className="border-t border-gray-200 pt-16">
            <div className="text-center mb-8">
              <Link href="/launch" className="text-2xl font-medium text-gray-900 hover:text-gray-700">
                LaunchPath™
              </Link>
              <p className="text-gray-600 mt-2">For starting from zero</p>
            </div>
            <TierCards tiers={launchTiers} />
          </div>
        </div>
      </div>

      <DisclosureBlock text="Iron Front provides infrastructure and operating tools. We do not offer business opportunities or compensation programs." />
    </PublicLayout>
  )
}

