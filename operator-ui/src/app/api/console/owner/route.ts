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

    // Revenue Signals
    const checkoutStarted = await db.event.count({
      where: {
        org_id: INTAKE_ORG_ID,
        event_type: 'checkout_started',
      },
    })

    const checkoutCompleted = await db.event.count({
      where: {
        org_id: INTAKE_ORG_ID,
        event_type: 'checkout_completed',
      },
    })

    const revenueSignals = {
      checkout_started: checkoutStarted,
      checkout_completed: checkoutCompleted,
      wired: checkoutStarted > 0 || checkoutCompleted > 0,
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
    })
  } catch (error: any) {
    console.error('Owner console API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

