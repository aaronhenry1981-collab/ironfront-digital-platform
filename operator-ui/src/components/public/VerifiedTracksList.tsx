'use client'

import Link from 'next/link'

interface VerifiedTrack {
  id: string
  environmentType: string
  onboardingCompletion: number
  retentionHealth: 'healthy' | 'moderate' | 'needs-attention'
  supportCadence: string
  integrationLevel: 'basic' | 'standard' | 'deep'
}

interface VerifiedTracksListProps {
  tracks: VerifiedTrack[]
}

const healthLabels = {
  healthy: 'Healthy',
  moderate: 'Moderate',
  'needs-attention': 'Needs Attention',
}

const healthColors = {
  healthy: 'text-green-600',
  moderate: 'text-yellow-600',
  'needs-attention': 'text-red-600',
}

export default function VerifiedTracksList({ tracks }: VerifiedTracksListProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-6">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="border border-gray-200 rounded-lg p-6 bg-white"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {track.environmentType}
            </h3>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div>
                <span className="font-medium">Onboarding completion:</span>{' '}
                {track.onboardingCompletion}%
              </div>
              <div>
                <span className="font-medium">Retention health:</span>{' '}
                <span className={healthColors[track.retentionHealth]}>
                  {healthLabels[track.retentionHealth]}
                </span>
              </div>
              <div>
                <span className="font-medium">Support cadence:</span>{' '}
                {track.supportCadence}
              </div>
              <div>
                <span className="font-medium">Platform integration:</span>{' '}
                <span className="capitalize">{track.integrationLevel}</span>
              </div>
            </div>
            <Link
              href={`/apply?intent=ecosystems&track=${track.id}`}
              className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Request Operating Access
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}






