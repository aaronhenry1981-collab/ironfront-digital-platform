'use client'

import PublicLayout from '@/components/public/PublicLayout'
import HeroSection from '@/components/public/HeroSection'
import IntentCards from '@/components/public/IntentCards'

export default function HomePage() {
  const intentCards = [
    {
      title: 'Scale an Existing Organization',
      href: '/scale',
      subtext: 'For network marketers, team leaders, and company owners',
    },
    {
      title: 'Start a Business With a Proven System',
      href: '/launch',
      subtext: 'For individuals without a business yet',
    },
  ]

  return (
    <PublicLayout>
      <HeroSection
        headline="Build a Business That Actually Operates."
        subhead="Infrastructure, automation, and operating environments — without guesswork."
        question="What are you here to do?"
      />
      <IntentCards cards={intentCards} />
    </PublicLayout>
  )
}
