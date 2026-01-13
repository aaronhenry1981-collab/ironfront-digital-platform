'use client'

import { useState } from 'react'
import PublicLayout from '@/components/public/PublicLayout'
import HeroSection from '@/components/public/HeroSection'
import AssessmentMini from '@/components/public/AssessmentMini'
import VerifiedTracksList from '@/components/public/VerifiedTracksList'
import DisclosureBlock from '@/components/public/DisclosureBlock'
import Link from 'next/link'

const operatingPreferences = [
  { id: '1', title: 'Structured team environment', description: 'Clear roles and coordinated workflows' },
  { id: '2', title: 'Independent sales model', description: 'Autonomy with platform support' },
  { id: '3', title: 'Community-based organization', description: 'Collaborative operating approach' },
  { id: '4', title: 'Product-driven ecosystem', description: 'Focus on product distribution' },
  { id: '5', title: 'Service-driven ecosystem', description: 'Focus on service delivery' },
]

const assessmentQuestions = [
  {
    id: 'time',
    label: 'Time availability',
    options: ['Few hours/week', 'Part-time', 'Full-time'],
  },
  {
    id: 'outreach',
    label: 'Comfort with outreach',
    options: ['Low', 'Medium', 'High'],
  },
  {
    id: 'learning',
    label: 'Learning style',
    options: ['Self-paced', 'Guided', 'Community'],
  },
  {
    id: 'support',
    label: 'Support preference',
    options: ['Light', 'Standard', 'Hands-on'],
  },
]

const mockTracks = [
  {
    id: '1',
    environmentType: 'Structured Team Environment',
    onboardingCompletion: 87,
    retentionHealth: 'healthy' as const,
    supportCadence: 'Weekly check-ins',
    integrationLevel: 'deep' as const,
  },
  {
    id: '2',
    environmentType: 'Independent Sales Model',
    onboardingCompletion: 72,
    retentionHealth: 'moderate' as const,
    supportCadence: 'Bi-weekly support',
    integrationLevel: 'standard' as const,
  },
  {
    id: '3',
    environmentType: 'Community-Based Organization',
    onboardingCompletion: 91,
    retentionHealth: 'healthy' as const,
    supportCadence: 'Daily community access',
    integrationLevel: 'deep' as const,
  },
  {
    id: '4',
    environmentType: 'Product-Driven Ecosystem',
    onboardingCompletion: 68,
    retentionHealth: 'moderate' as const,
    supportCadence: 'Monthly updates',
    integrationLevel: 'basic' as const,
  },
  {
    id: '5',
    environmentType: 'Service-Driven Ecosystem',
    onboardingCompletion: 79,
    retentionHealth: 'healthy' as const,
    supportCadence: 'Weekly office hours',
    integrationLevel: 'standard' as const,
  },
]

export default function EcosystemsPage() {
  const [step, setStep] = useState<'preferences' | 'assessment' | 'tracks'>('preferences')
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([])
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({})

  const handlePreferenceSelect = (prefId: string) => {
    if (selectedPreferences.includes(prefId)) {
      setSelectedPreferences(selectedPreferences.filter((id) => id !== prefId))
    } else {
      setSelectedPreferences([...selectedPreferences, prefId])
    }
  }

  const handleAssessmentComplete = (answers: Record<string, string>) => {
    setAssessmentAnswers(answers)
    setStep('tracks')
  }

  const handleContinueFromPreferences = () => {
    if (selectedPreferences.length > 0) {
      setStep('assessment')
    }
  }

  return (
    <PublicLayout>
      <HeroSection
        headline="Explore Verified Operating Environments"
        subhead="Choose how you want to operate — not who you want to follow."
      />

      {step === 'preferences' && (
        <div className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-medium text-gray-900 mb-8 text-center">Step 1: Operating Preference</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {operatingPreferences.map((pref) => (
                <button
                  key={pref.id}
                  onClick={() => handlePreferenceSelect(pref.id)}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    selectedPreferences.includes(pref.id)
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{pref.title}</h3>
                  <p className="text-sm text-gray-600">{pref.description}</p>
                </button>
              ))}
            </div>
            <div className="text-center">
              <button
                onClick={handleContinueFromPreferences}
                disabled={selectedPreferences.length === 0}
                className="px-6 py-3 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'assessment' && (
        <div className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-medium text-gray-900 mb-8 text-center">Step 2: Capability Alignment</h2>
            <AssessmentMini questions={assessmentQuestions} onComplete={handleAssessmentComplete} />
          </div>
        </div>
      )}

      {step === 'tracks' && (
        <div className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4 text-center">Step 3: Verified Tracks</h2>
            <p className="text-center text-gray-600">
              Based on your preferences and alignment, here are operating environments that may be a fit.
            </p>
          </div>
          <VerifiedTracksList tracks={mockTracks} />
        </div>
      )}

      <DisclosureBlock text="Iron Front does not place or assign users into businesses. All operating environments are independent entities." />
    </PublicLayout>
  )
}

