'use client'

import Link from 'next/link'

interface IntentCard {
  title: string
  href: string
  subtext: string
}

interface IntentCardsProps {
  cards: IntentCard[]
}

export default function IntentCards({ cards }: IntentCardsProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block p-8 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
          >
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {card.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {card.subtext}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}


