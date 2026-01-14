/**
 * Public Application API
 * POST /api/public/apply
 * 
 * Handles public applications from /scale, /launch, /ecosystems
 * Creates Intake records with routing
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { eventsRepo } from '@/lib/repositories/events'
import { routeIntake } from '@/lib/intake-routing'

const INTAKE_ORG_ID = '00000000-0000-0000-0000-000000000002' // Iron Front Intake org

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, intent, tier, message, preferences } = body

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Validate intent
    const validIntents = ['scale', 'launch', 'ecosystems']
    if (!intent || !validIntents.includes(intent)) {
      return NextResponse.json(
        { error: 'Valid intent is required' },
        { status: 400 }
      )
    }

    // Ensure intake org exists
    await db.org.upsert({
      where: { id: INTAKE_ORG_ID },
      update: {},
      create: {
        id: INTAKE_ORG_ID,
        name: 'Iron Front Intake',
        timezone: 'America/New_York',
      },
    })

    // Route intake to operator pool
    const routing = await routeIntake(INTAKE_ORG_ID, intent as 'scale' | 'launch' | 'ecosystems')

    // Create intake record
    const intake = await db.intake.create({
      data: {
        org_id: INTAKE_ORG_ID,
        name: name || null,
        email,
        intent,
        preferences: preferences || (message ? { message } : null),
        status: 'new',
        assigned_user_id: routing.assigned_user_id,
        created_at: new Date(),
      },
    })

    // Store legacy lead record (for backward compatibility)
    await db.lead.create({
      data: {
        org_id: INTAKE_ORG_ID,
        name: name || null,
        email,
        intent,
        tier: tier || null,
        metadata: message ? { message } : {},
      },
    })

    // Store audit event
    await eventsRepo.create({
      org_id: INTAKE_ORG_ID,
      actor_user_id: null,
      actor_role: 'public',
      event_type: 'intake_created',
      target_type: 'intake',
      target_id: intake.id,
      metadata: {
        intent,
        tier: tier || null,
        assigned_user_id: routing.assigned_user_id,
        routing_reason: routing.reason,
      },
    })

    return NextResponse.json({ success: true, id: intake.id })
  } catch (error) {
    console.error('Public apply API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
