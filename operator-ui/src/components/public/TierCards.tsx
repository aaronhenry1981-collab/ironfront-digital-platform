'use client'

import Link from 'next/link'

interface Tier {
  name: string
  price: string
  priceNote?: string
  cta: string
  ctaHref: string
}

interface TierCardsProps {
  tiers: Tier[]
}

export default function TierCards({ tiers }: TierCardsProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="border border-gray-200 rounded-lg p-6 bg-white"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {tier.name}
            </h3>
            <div className="mb-4">
              <span className="text-3xl font-medium text-gray-900">{tier.price}</span>
              {tier.priceNote && (
                <span className="text-gray-600 text-sm ml-2">{tier.priceNote}</span>
              )}
            </div>
            <Link
              href={tier.ctaHref}
              className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

