'use client'

import { useState } from 'react'
import ConsoleLayout from '@/components/layout/ConsoleLayout'
import LiveOrgMap from '@/components/organization/LiveOrgMap'
import ParticipantDetailPanel from '@/components/organization/ParticipantDetailPanel'
import { Participant } from '@/lib/types'

// TODO: Get orgId from auth/session
const MOCK_ORG_ID = 'default-org'

export default function OrganizationPage() {
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)

  const handleNodeClick = (participant: Participant) => {
    setSelectedParticipant(participant)
  }

  const handleClosePanel = () => {
    setSelectedParticipant(null)
  }

  return (
    <ConsoleLayout title="Organization Live View">
      <div className="flex h-full">
        <div className="flex-1">
          <LiveOrgMap orgId={MOCK_ORG_ID} onNodeClick={handleNodeClick} />
        </div>
        <ParticipantDetailPanel
          orgId={MOCK_ORG_ID}
          participant={selectedParticipant}
          onClose={handleClosePanel}
        />
      </div>
    </ConsoleLayout>
  )
}

