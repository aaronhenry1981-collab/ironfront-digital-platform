import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isOwner } from '@/lib/auth'
import { db } from '@/lib/db'

const INTAKE_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000000'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isOwner(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // System Status
    const appHealth = { status: 'ok', message: 'Application running' }
    const dbHealth = { status: 'ok', message: 'Database connected' }
    
    try {
      await db.user.findFirst()
    } catch (e) {
      dbHealth.status = 'error'
      dbHealth.message = 'Database connection failed'
    }

    // Stripe readiness (check if env vars exist)
    const stripeReady = !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY)
    const stripeHealth = {
      status: stripeReady ? 'ok' : 'warning',
      message: stripeReady ? 'Stripe configured' : 'Stripe not fully configured',
    }

    // Intake Snapshot
    const intakeCounts = await db.intake.groupBy({
      by: ['status'],
      _count: true,
    })

    const intakeSnapshot = {
      new: 0,
      contacted: 0,
      qualified: 0,
      closed: 0,
      lost: 0,
      total: 0,
    }

    intakeCounts.forEach((item) => {
      intakeSnapshot[item.status as keyof typeof intakeSnapshot] = item._count
      intakeSnapshot.total += item._count
    })

    // Recent Activity (latest audit events)
    const recentEvents = await db.event.findMany({
      where: {
        org_id: INTAKE_ORG_ID,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
      select: {
        id: true,
        event_type: true,
        actor_role: true,
        created_at: true,
        metadata: true,
      },
    })

  // Revenue Signals - Get counts and amounts
  const checkoutStartedCount = await db.event.count({
    where: {
      org_id: INTAKE_ORG_ID,
      event_type: 'checkout_started',
    },
  })

  const checkoutCompletedEvents = await db.event.findMany({
    where: {
      org_id: INTAKE_ORG_ID,
      event_type: 'checkout_completed',
    },
    select: {
      metadata: true,
    },
  })

  // Calculate total revenue from completed checkouts
  let totalRevenue = 0
  checkoutCompletedEvents.forEach((event: any) => {
    const amount = event.metadata?.amount_dollars || event.metadata?.amount / 100 || 0
    totalRevenue += amount
  })

  const revenueSignals = {
    checkout_started: checkoutStartedCount,
    checkout_completed: checkoutCompletedEvents.length,
    total_revenue: totalRevenue,
    wired: checkoutStartedCount > 0 || checkoutCompletedEvents.length > 0,
  }

  // Source Analytics - Extract from intake preferences or event metadata
  const allIntakes = await db.intake.findMany({
    select: {
      preferences: true,
      status: true,
    },
  })

  const sourceCounts: Record<string, number> = {}
  allIntakes.forEach((intake: any) => {
    const source = intake.preferences?.source || 'self_identified'
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  })

  // Also check events for source tracking
  const intakeEvents = await db.event.findMany({
    where: {
      org_id: INTAKE_ORG_ID,
      event_type: 'intake_created',
    },
    select: {
      metadata: true,
    },
  })

  intakeEvents.forEach((event: any) => {
    const source = event.metadata?.source || 'self_identified'
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  })

  const sourceAnalytics = {
    self_identified: sourceCounts['self_identified'] || 0,
    referral: sourceCounts['referral'] || 0,
    paid_traffic: sourceCounts['paid_traffic'] || 0,
    pricing_page: sourceCounts['pricing_page'] || 0,
    total: Object.values(sourceCounts).reduce((sum, count) => sum + count, 0),
  }

    return NextResponse.json({
      system_status: {
        app: appHealth,
        db: dbHealth,
        stripe: stripeHealth,
      },
      intake_snapshot: intakeSnapshot,
      recent_activity: recentEvents,
      revenue_signals: revenueSignals,
      source_analytics: sourceAnalytics,
    })
  } catch (error: any) {
    console.error('Owner console API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}





