/**
 * Seed script for development data
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create org
  const org = await prisma.org.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Iron Front Digital',
      timezone: 'America/New_York',
    },
  })

  console.log('Created org:', org.name)

  // Create intake org for public applications
  const intakeOrg = await prisma.org.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Iron Front Intake',
      timezone: 'America/New_York',
    },
  })

  console.log('Created intake org:', intakeOrg.name)

  // Create user (operator)
  const user = await prisma.user.upsert({
    where: { email: 'operator@ironfrontdigital.com' },
    update: {},
    create: {
      email: 'operator@ironfrontdigital.com',
    },
  })

  console.log('Created user:', user.email)

  // Create org membership
  const membership = await prisma.orgMembership.upsert({
    where: {
      org_id_user_id: {
        org_id: org.id,
        user_id: user.id,
      },
    },
    update: {},
    create: {
      org_id: org.id,
      user_id: user.id,
      role: 'operator',
    },
  })

  console.log('Created membership:', membership.role)

  // Create participants (12 total, including 2 system_participants)
  const participants = []
  const now = new Date()

  for (let i = 1; i <= 10; i++) {
    const participant = await prisma.participant.create({
      data: {
        org_id: org.id,
        email: `participant${i}@example.com`,
        display_name: `Participant ${i}`,
        role: 'participant',
        origin: 'web',
        lifecycle_stage: i <= 5 ? 'onboarding' : 'producing',
        last_activity_at: new Date(now.getTime() - i * 2 * 24 * 60 * 60 * 1000),
        created_at: new Date(now.getTime() - (i + 10) * 24 * 60 * 60 * 1000),
      },
    })
    participants.push(participant)
  }

  // Create 2 system participants
  const system1 = await prisma.participant.create({
    data: {
      org_id: org.id,
      display_name: 'System Participant 1',
      role: 'system_participant',
      origin: 'system',
      lifecycle_stage: 'producing',
      last_activity_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
  })

  const system2 = await prisma.participant.create({
    data: {
      org_id: org.id,
      display_name: 'System Participant 2',
      role: 'system_participant',
      origin: 'system',
      lifecycle_stage: 'producing',
      last_activity_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
  })

  participants.push(system1, system2)
  console.log(`Created ${participants.length} participants`)

  // Create relationships
  const relationships = []
  
  // Create some relationships between participants
  for (let i = 0; i < 5; i++) {
    if (i + 1 < participants.length) {
      const rel = await prisma.relationship.create({
        data: {
          org_id: org.id,
          from_participant_id: participants[i].id,
          to_participant_id: participants[i + 1].id,
          type: i % 2 === 0 ? 'mentored' : 'introduced',
          source: 'operator',
          confidence_score: 75,
        },
      })
      relationships.push(rel)
    }
  }

  console.log(`Created ${relationships.length} relationships`)

  // Create events
  const events = []
  for (let i = 0; i < 5; i++) {
    const event = await prisma.event.create({
      data: {
        org_id: org.id,
        actor_user_id: user.id,
        actor_role: 'operator',
        event_type: i % 2 === 0 ? 'graph_queried' : 'participant_detail_viewed',
        target_type: 'node',
        target_id: participants[i].id,
        metadata: {},
      },
    })
    events.push(event)
  }

  console.log(`Created ${events.length} events`)

  // Create recommendations
  const recommendations = []
  for (let i = 0; i < 3; i++) {
    const rec = await prisma.recommendation.create({
      data: {
        org_id: org.id,
        target_type: 'node',
        target_id: participants[i].id,
        suggested_action: 'Adjust onboarding path',
        reason: 'Engagement declined during onboarding.',
        confidence: 75,
        status: 'active',
      },
    })
    recommendations.push(rec)
  }

  console.log(`Created ${recommendations.length} recommendations`)

  // Create additional operators for intake routing
  const operator1 = await prisma.user.upsert({
    where: { email: 'operator1@ironfrontdigital.com' },
    update: {},
    create: {
      email: 'operator1@ironfrontdigital.com',
    },
  })

  const operator2 = await prisma.user.upsert({
    where: { email: 'operator2@ironfrontdigital.com' },
    update: {},
    create: {
      email: 'operator2@ironfrontdigital.com',
    },
  })

  await prisma.orgMembership.upsert({
    where: {
      org_id_user_id: {
        org_id: intakeOrg.id,
        user_id: operator1.id,
      },
    },
    update: {},
    create: {
      org_id: intakeOrg.id,
      user_id: operator1.id,
      role: 'operator',
    },
  })

  await prisma.orgMembership.upsert({
    where: {
      org_id_user_id: {
        org_id: intakeOrg.id,
        user_id: operator2.id,
      },
    },
    update: {},
    create: {
      org_id: intakeOrg.id,
      user_id: operator2.id,
      role: 'operator',
    },
  })

  console.log('Created 2 additional operators for intake routing')

  // Create sample intakes
  const sampleIntakes = []
  for (let i = 1; i <= 8; i++) {
    const intent = i <= 3 ? 'launch' : i <= 6 ? 'scale' : 'ecosystems'
    const status = i <= 2 ? 'new' : i <= 4 ? 'contacted' : i <= 6 ? 'qualified' : 'closed'
    const assigned = i % 2 === 0 ? operator1.id : operator2.id

    const intake = await prisma.intake.create({
      data: {
        org_id: intakeOrg.id,
        name: `Sample Intake ${i}`,
        email: `intake${i}@example.com`,
        intent,
        status,
        assigned_user_id: status === 'new' && i % 3 === 0 ? null : assigned,
        created_at: new Date(now.getTime() - i * 2 * 24 * 60 * 60 * 1000),
        first_contact_at: status !== 'new' ? new Date(now.getTime() - (i * 2 - 1) * 24 * 60 * 60 * 1000) : null,
        last_activity_at: new Date(now.getTime() - i * 12 * 60 * 60 * 1000),
      },
    })
    sampleIntakes.push(intake)
  }

  console.log(`Created ${sampleIntakes.length} sample intakes`)

  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

