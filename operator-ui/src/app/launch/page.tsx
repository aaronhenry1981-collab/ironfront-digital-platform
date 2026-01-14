'use client'

import PublicLayout from '@/components/public/PublicLayout'
import HeroSection from '@/components/public/HeroSection'
import TierCards from '@/components/public/TierCards'
import Link from 'next/link'

export default function LaunchPage() {
  const tiers = [
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
        headline="Start a Business With Structure — Not Guesswork"
        subhead="LaunchPath™ is a guided operating system for people starting from zero."
      />

      <div className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-7">What LaunchPath™ provides</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Step-by-step business setup</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Systems for leads, follow-up, and operations</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Training on structure, not hype</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Optional access to operating environments (EEP)</span>
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

      <div className="bg-white py-20 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-5">Optional: Explore Operating Environments</h2>
          <p className="text-gray-700 mb-8 leading-relaxed text-lg">
            Some members choose to operate within established ecosystems that use Iron Front infrastructure. Access is optional, independent, and never guaranteed.
          </p>
          <Link
            href="/ecosystems"
            className="inline-block px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Learn About Ecosystem Entry
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}

